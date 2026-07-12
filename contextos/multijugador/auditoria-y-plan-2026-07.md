# 🔍 Auditorías del multijugador y plan de mejoras (julio 2026)

Este documento consolida las **dos auditorías integrales** del sistema co-op (protocolo v10 → v12)
y el **plan de acción por fases** derivado de la segunda. Es la fuente de verdad para cualquier
agente (Codex incluido) que trabaje sobre la red: leerlo junto a `arquitectura-de-red.md` antes
de tocar código.

> Convención: **hecho** = verificado en código con archivo/línea; **hipótesis** = mecanismo
> confirmado pero magnitud pendiente de medición. No atribuir problemas a "la conexión" o a
> Supabase sin métrica que lo respalde.

---

## 1. Auditoría #1 (protocolo v10, commit `ce07ab5`) — resumen

Diagnóstico central: la infraestructura de sesión (lobby, slots, envelope, seguridad, reconexión)
era buena, pero la capa de gameplay en red estaba **a medio implementar**: el guest era un títere
congelado sin predicción ni interpolación real.

### Hallazgos principales (con su estado tras las Fases 1–3)

| # | Hallazgo (P orig.) | Evidencia original | Estado hoy |
|---|---|---|---|
| B1 | Guest sin predicción local: su propio personaje congelado, input-to-photon ~180–280 ms | `freezePuppet` en ambas escenas | ✅ Resuelto en su forma principal (simulación local "segura") — pero ver R2 |
| B2 | `CoopSecurityGuard` sin reset + `inputSeq` reiniciado por escena → tormenta "old-sequence" al encadenar nivel → guest congelado y **expulsado** | `coopSecurity.ts` (validateInput), `CoopSceneLink` | ✅ Intra-sesión (seq de sesión en `CoopSession.generateInputSeq`) · ⚠️ persiste **entre sesiones** (ver §3) |
| B3 | "Interpolación" = lerp 0.4 sobre el último snapshot, sin buffer ni timestamps | `applyNetPlayer`, `updateGuest` | ✅ Resuelto (`CoopSnapshotInterpolator`: hostTimeMs, delay 85 ms, extrapolación ≤100 ms) |
| B4 | Todos los clientes suscritos al canal de input (fan-out inútil ×2-3) | `CoopSession.connect` | ✅ Fan-out eliminado · ❌ el mecanismo elegido creó la regresión R1 (ver §3) |
| B5 | `validateCharges` rechaza siempre → feature de compras del guest muerta + anomalías | `coopSecurity.ts:180-196` | 🟡 Neutralizada (`sendChargeDelta` es no-op); handlers muertos siguen |
| B6 | Gravedad no restaurada al reconectar (el rejoined flota en el host) | `handleParticipantRejoined` | ✅ Resuelto (+ `setNetworkPresence` atómico jugador+arma) |
| B7 | Deltas sin fiabilidad (`ack:false`, resultado de `send` descartado) + keyframe 1 Hz → estado atascado hasta 1 s tras una pérdida | `CoopSceneLink.maybeSendSnapshot` | 🟡 Parcial (resultado de `send` ahora se registra; fiabilidad sin cambios) |
| B8 | Re-aplicación completa del snapshot a 60 Hz en el guest (CPU/GC) | `updateGuest` | 🟡 Parcial (eventos discretos gateados por `isNew`; allocations por frame siguen) |
| B9 | HUD de compañeros con cargas falsas en pantallas de guest | `chargesForSlot` + `emitTeammateHud` | ❌ Abierto |
| B10 | Ventana de reconexión 10 s vs suspensión de apps móviles | `COOP_RECONNECT_WINDOW_MS` | 🟡 Mejorado (30 s) |
| B11 | El diagnóstico solo medía latencia intra-host (~8 ms): ciego a la red | `recordInputApplied` | 🟡 Parcial (`sendResults` + visibilidad; sin RTT/edad/divergencia) |
| B12 | Duplicación y divergencias entre `LevelScene` y `PuzzleScene` | `handleRemoteEnd`, stats guest | ❌ Abierto y **creció** con la predicción |

Cadena de latencia del guest medida en v10 (por diseño, no por bug): captura → throttle 33 ms →
Supabase → frame del host → tick de snapshot 20 Hz → Supabase → frame del guest → lerp.
**Mínimo ~110 ms, típico ~180–280 ms.** El host: ~17–33 ms. Esa asimetría era el problema #1.

---

## 2. Qué se implementó después (Fases 1–3 post-auditoría, protocolo v12)

- **`CoopSnapshotInterpolator`**: buffer de 3 snapshots con `hostTimeMs`, offset de reloj por
  mínimo observado, render 85 ms detrás, extrapolación ≤100 ms usando `vx/vy`.
- **`CoopLocalPrediction`**: historial acotado (96) de comandos de movimiento continuo realmente
  enviados; poda por ACK; trazas de flancos/correcciones. **No hace replay**: es contabilidad.
- **ACK de inputs**: cada snapshot lleva `inputSeqBySlot` (último seq consumido por slot).
- **Seq de sesión**: `CoopSession.generateInputSeq()` — sobrevive al encadenado de niveles.
- **Predicción del guest**: su cuerpo se habilita con física real y se simula localmente con el
  mismo `MovementSystem` del host **mientras es "seguro"** (lejos de cajas/plataformas móviles y
  dentro del mundo). Flancos con eco local cosmético (animación/SFX de salto, melee, spin).
- Semántica deliberada y verificada: historial solo con paquetes enviados; flancos se ejecutan
  una sola vez; sin replay por `MovementSystem`; `vy` nunca se restaura desde snapshots en modo
  seguro; una sola llamada a `MovementSystem` por frame; al degradar se neutraliza la velocidad
  (`setVelocity(0,0)`) antes de aplicar el snapshot.
- Otros: guests ya no se suscriben al canal de input; ventana de reconexión 30 s; resultado de
  `send()` registrado; dedupe de proyectiles por `netId` + `dispose()`; `actionRevision` en
  `Player` (elimina la carrera de `delayedCall` que reseteaba animaciones).

---

## 3. Auditoría #2 (2026-07-10, HEAD `7175968` + working tree) — hallazgos vigentes

Veredicto: **mejoró de verdad; consolidar, no rediseñar.** Suite verde (85/85), pero los tests
no cubren donde viven los problemas restantes (ver §5).

### Confirmados (hechos)

| ID | Hallazgo | Evidencia | Prioridad |
|---|---|---|---|
| **R1** | **Input del guest viaja por REST HTTP**: el guest crea el canal de input pero nunca se suscribe, y publica igual; `realtime-js` 2.108.2 cae al fallback REST cuando el canal no está `joined`. Un POST por input (10–30/s), `console.warn` por mensaje, ruta deprecada y **sin orden garantizado** → un input viejo que llega tarde se descarta por seq → taps perdidos + anomalías hacia el umbral de expulsión | `CoopSession.ts:398-404` y `sendInput`; `RealtimeChannel.js:519` + `channelAdapter.js:65-67` (`canPush()` exige `joined`) | **P0/P1** |
| **R2** | **Simulación dual sin reconciliación**: hallazgo original corregido en código con convergencia posicional suave hacia el snapshot interpolado, snap por divergencia extrema y detección de discontinuidades autoritativas | `coopGuestReconciliation.ts` + integración en ambas escenas | ✅ Código; calibración/QA pendiente |
| **R3** | **Degradación brusca**: dentro del radio de seguridad (120 px cajas / 140 px plataformas móviles) se congela el cuerpo y se aplica el **último snapshot crudo** (no el interpolado) en asignación dura → teleport de toda la divergencia acumulada + escalonado 20 Hz + flapping en el borde. En PuzzleScene empujar cajas (mecánica central) vive dentro del radio | `LevelScene.ts:2402-2413`, `PuzzleScene.ts:2020-2028`, rama `!safe` de `updateGuest` | **P1** |
| **R4** | El jugador predicho **atraviesa cuerpos dinámicos congelados** (cajas, plataformas móviles/hundibles tienen `body.enable=false` en el guest); el radio de seguridad solo lo enmascara | `PuzzleScene.ts:623`, `LevelScene.ts:345-349` | P2 |
| **R5** | **Guard sin reset entre sesiones**: hallazgo original corregido; `connect()` reinicia ahora el guard y `globalInputSeq` como una sola frontera de sesión | `CoopSession.ts` + test de segunda sesión desde seq 1 | ✅ Código; QA pendiente |
| — | Métricas insuficientes: sin RTT, edad de snapshot, input-to-photon ni divergencia; `clockOffsetMs` existe pero no se expone; diagnóstico detrás de `cd=1` | `CoopDiagnostics.ts` | **P1** |
| — | Duplicación creció: `updateGuest`, `isGuestPredictionSafe`, `playPredictedActions`, `interpolateSnapshot`, `resetGuestPrediction` duplicados (~150 líneas nuevas) entre escenas | ambas escenas | **P1** |
| — | Menores abiertos: B9 (HUD compañeros), `runTracker` guest en 0, `activations.reset()` a 60 Hz en PuzzleScene, allocations por frame de `interpolateSnapshot`, `console.warn` debug (`LevelScene.ts:338`), handlers muertos de charges, doble `hostTimeMs`, curación sin eco local | ver auditoría | P2/P3 |

### Hipótesis (requieren medición, no asumir)

- Magnitud del impacto de REST en latencia/orden (mecanismo: hecho; frecuencia: medir).
- Consumo de cuotas de Supabase con salas de 4 (≈110–170 msg/s por sala estimados).
- GC perceptible en móviles por allocations por frame.
- Frecuencia real de divergencia de R2 en partidas vivas.

### Escalabilidad (hechos)

- 2 jugadores: sólido. 4: viable (el riesgo dominante es R2, no la red).
- **8 jugadores: no sin cambio de protocolo** — `COOP_MAX_PLAYERS = 4` (`coopMessages.ts:42`),
  slot 1–3 **hardcodeado** en el guard (`coopSecurity.ts:141`), spawn `-70px × slot`, snapshots
  JSON+envelope lineales en jugadores.

---

## 4. Plan de acción por fases

> Estado de ejecución local: Fase 0 implementada y validada automáticamente; línea base manual
> pendiente. Fase 1 implementada en protocolo v13 y validada automáticamente; QA real de dos
> clientes pendiente antes de dar por cumplidos sus criterios de éxito. Fase 2 implementada y
> validada automáticamente; falta comprobar dos salas consecutivas en el QA manual. Fase 3
> implementada con umbrales provisionales 32/160 px y validada automáticamente; requiere
> calibración y QA real antes de cerrar sus criterios de éxito.

Dificultad: 🟢 simple · 🟡 delicada · 🔴 asignar a agente fuerte (Codex).
Regla transversal: **cada fase se valida contra las métricas de la Fase 0** (por eso va primera).
Todo cambio de mensajes exige subir `COOP_PROTOCOL_VERSION` (rompe PWAs cacheadas: agrupar rupturas).

### Bloque A — Estabilidad y observabilidad

#### Fase 0 — Observabilidad real 🟢
- **Objetivo**: convertir las hipótesis en números antes de tocar semántica.
- **Resuelve**: métricas insuficientes (B11 restante).
- **Archivos**: `CoopDiagnostics.ts`, `CoopSnapshotInterpolator.ts`, `CoopSceneLink.ts`,
  `CoopSession.ts`, hooks mínimos en ambas escenas.
- **Cambios**: diagnóstico activo por defecto en DEV; exponer edad del snapshot al aplicarse
  (`hostTimeMs` + `clockOffsetMs` ya existentes), **input-to-echo** (t de envío del input → t del
  snapshot cuyo `inputSeqBySlot` lo confirma; sin cambio de protocolo), divergencia del guest
  (posición local vs `latest.players[self]`), contadores de corrección, `sendResults` visibles.
- **Riesgos**: bajos; no agregar allocations por frame.
- **Éxito**: `__COOP_DIAG__()` reporta p50/p95 de divergencia, edad e input-to-echo tras 5 min
  reales de 2 jugadores. **Guardar esos números: son la línea base de F1/F3/F4.**
- **Pruebas**: unit tests en `CoopDiagnostics.test.ts` + una sesión de 2 clientes.
- **No tocar**: predicción, transporte, escenas más allá de los hooks.

#### Fase 1 — Input del guest de vuelta a WebSocket (R1) 🟡 — código implementado en v13
- **Objetivo**: eliminar el fallback REST por mensaje.
- **Archivos**: `CoopSession.ts` (`connect`, `sendInput`), `coopMessages.ts` (bump), tests.
- **Cambios** (preferencia): **(1)** topic de input por guest (`coop-room-<CODE>-input-<slot>`):
  cada guest se une solo al suyo, el host a todos — cero fan-out entre guests y sin REST;
  **(2)** fallback simple: todos re-suscritos al canal único (reacepta fan-out). Bump de protocolo.
- **Riesgos**: medios — flujo de suscripción/reconexión (`restoreIfReady`); un canal más por guest.
- **Éxito**: cero `console.warn` de fallback en partida completa; `sendResults.input` sin errores;
  input-to-echo p50 ≤ línea base; `old-sequence = 0` en juego normal.
- **Pruebas**: QA manual 2 clientes con throttling; revisar `droppedByReason` al final.
- **No tocar**: predicción, escenas.

#### Fase 2 — `security.reset()` entre sesiones (R5) 🟢 — código implementado
- **Objetivo**: que la segunda sala en la misma pestaña funcione.
- **Archivos**: `CoopSession.ts` (`connect()`/`leave()`), `coopSecurity.test.ts`.
- **Cambios**: `security.reset()` en `connect()`; decidir conscientemente el reseteo de
  `globalInputSeq` (con guard reseteado es coherente).
- **Riesgos**: casi nulos.
- **Éxito**: dos salas consecutivas sin recargar → guests se mueven desde el primer segundo.
- **Pruebas**: test de doble `connect()` + QA rápido de 2 clientes.
- **No tocar**: umbrales/rate limits del guard.

### Bloque B — Cerrar la reconciliación

#### Fase 3 — Convergencia mínima host↔guest (R2) 🔴 Codex — código implementado
- **Objetivo**: acotar la divergencia entre las dos simulaciones del personaje del guest.
- **Archivos**: `updateGuest` de ambas escenas (o helper que anticipe F5), `coopPlayerNet.ts`,
  `CoopLocalPrediction.ts` (contadores), `CoopSnapshotInterpolator.ts` (reuso).
- **Cambios**: corrección suave de deriva hacia la **posición autoritativa interpolada** cuando la
  divergencia supere ~32 px (calibrar con F0); snap directo por encima de ~160 px y ante
  respawn/teleport del host. **Respetar la semántica vigente**: sin restaurar `vy`, corrección
  posicional pura (no velocidades), una llamada a `MovementSystem` por frame, flancos sin
  re-ejecución. **Sin replay histórico** (explícitamente fuera de alcance).
- **Riesgos**: **altos** — mal dosificada = tirón de goma permanente; puede interferir con jump
  buffer/coyote. Calibración iterativa con datos.
- **Éxito**: divergencia p95 < 32 px con throttling; cero casos "vida que baja sin causa visible";
  sin tirones con conexión buena.
- **Pruebas**: extraer la corrección a función pura testeable; QA manual obligatorio con 2+
  clientes, red degradada y host en segundo plano.
- **No tocar**: radios de seguridad y modo degradado (F4).

#### Fase 4 — Degradación suave con histéresis (R3) + decisión sobre R4 🟡
- **Objetivo**: eliminar teleports y escalonado cerca de cajas/plataformas.
- **Archivos**: `isGuestPredictionSafe` y rama degradada de `updateGuest` en ambas escenas.
- **Cambios**: modo degradado alimentado por el frame **interpolado** (`renderSnapshot()`);
  histéresis (entrar 120/140 px, salir ~180 px); transición con blend usando la corrección de F3;
  **documento de decisión sobre R4** con datos de F0 — (a) zonas degradadas con histéresis o
  (b) colisión local contra cuerpos dinámicos posicionados por snapshot. No implementar (b) acá.
- **Riesgos**: medios — en PuzzleScene la mecánica central vive dentro del radio; validar feel.
- **Éxito**: cero teleports al acercarse/alejarse de una caja; transiciones de modo por minuto en
  un dígito; sin escalonado 20 Hz en modo degradado.
- **Pruebas**: QA manual 2+ clientes centrado en PuzzleScene y niveles con plataformas móviles.
- **No tocar**: implementación de R4-(b); unificación de escenas.

### Bloque C — Deuda técnica

#### Fase 5 — Controlador guest unificado 🔴 Codex
- **Objetivo**: una sola implementación de la lógica co-op del guest.
- **Archivos**: nuevo `src/game/systems/net/GuestCoopController.ts` + reducción en ambas escenas.
- **Cambios**: extraer el ciclo guest completo parametrizando lo específico de cada escena
  (grupos dinámicos del radio, secciones del snapshot, efectos). Dividendo: la semántica de
  predicción/corrección/degradación queda **testeable por unidad**.
- **Riesgos**: amplitud media-alta. Regla estricta: **cero cambios de comportamiento**; los fixes
  detectados se anotan para F6.
- **Éxito**: `npm run check` verde; suite del controlador; QA de regresión idéntico a F4.
- **Pruebas**: unit tests + QA manual de regresión (2 clientes, un nivel de cada modo,
  encadenado incluido).
- **No tocar**: los P2/P3 (F6).
- **Va después de F3/F4 a propósito**: refactorizar antes de estabilizar la semántica duplica trabajo.

#### Fase 6 — Limpiezas P2/P3 y fiabilidad de deltas 🟢/🟡
- **Objetivo**: cerrar los menores confirmados sobre la base unificada.
- **Ítems**: B9 (HUD compañeros), `runTracker` guest, `activations.reset()` a 60 Hz (PuzzleScene),
  allocations de `interpolateSnapshot`, `console.warn` debug, handlers muertos de charges, doble
  `hostTimeMs`, eco local de curación; y **B7**: subir cadencia de keyframes o re-emitir secciones
  cambiadas hasta confirmación por eco de seq.
- **Riesgos**: bajos; solo B7 es 🟡 (cambia bytes/s — medir con F0 antes/después).
- **Éxito**: HUD de compañeros correcto en guests; puertas/sellos nunca >1 s desactualizados tras
  corte inducido de 2 s; sin logs debug en producción.
- **Pruebas**: unit tests por ítem; QA manual solo para B7.

### Bloque D — Escala

#### Fase 7 — Sala de 4 validada y preparación para 8 🔴 Codex
- **Objetivo**: certificar 4 jugadores con datos y dejar el protocolo listo para iniciar 8.
- **Archivos**: `coopMessages.ts`, `coopSecurity.ts` (rangos de slot), escenas (spawn),
  `CoopNetworkHarness.ts` (jitter por defecto ≠ 0, más clientes).
- **Cambios**: parametrizar rangos de slot; spawns seguros para N; **medición de tráfico real**
  de sala de 4 vs cuotas del proyecto Supabase (con `sendResults` + dashboard); plan de encoding
  compacto (JSON+envelope es el techo conocido).
- **Riesgos**: bump de protocolo; decisiones de costo (planes de Supabase) que son del usuario.
- **Éxito**: sesión real de 4 (niveles encadenados + una reconexión + una salida) sin expulsiones
  ni divergencias fuera de umbral; informe tráfico vs cuotas.
- **Pruebas**: QA manual con 4 clientes reales (mínimo 2 dispositivos distintos + throttling).
- **No tocar**: implementación de 8 en sí — esta fase solo deja la puerta abierta con datos.

---

## 5. Orden, dependencias y puntos de control

1. **Orden**: F0 → F1 → F2 → F3 → F4 → F5 → F6 → F7.
2. **Dependencias**: F3 necesita F0 (calibración) y conviene tras F1 (medir sobre transporte
   sano); F4 necesita F3; F5 necesita F3+F4; F6 necesita F5; F7 necesita A–C completos.
3. **Paralelizables**: F1 ∥ F2; F0 puede solaparse con F2; los ítems de F6 entre sí.
   **Nada del bloque B se paraleliza con nada.**
4. **QA manual con 2+ clientes obligatorio**: F1 (throttling), F3 (la más exigente: red degradada
   + host en segundo plano), F4 (PuzzleScene con cajas), F5 (regresión), F6 solo B7, F7 (4 clientes).
   Recordatorio: el QA co-op siempre es manual — los agentes no abren navegador.
5. **Estable para producción limitada**: al cierre de **F4**, con los criterios de F1–F4 cumplidos
   y la pasada QA de F4 hecha (transporte WS, sesiones consecutivas sanas, convergencia acotada,
   sin teleports). F5/F6 mejoran mantenibilidad y pulido; no bloquean un lanzamiento 2–4.
6. **Listo para arrancar 8 jugadores**: al cierre de **F5** + el informe de medición del inicio
   de F7 (tráfico real de sala de 4 vs cuotas). Sin F5 todo cambio de protocolo se paga dos
   veces; sin la medición, la decisión de encoding/transporte sería a ciegas.

## 6. Cobertura de pruebas — advertencia permanente

La suite (85 tests, verde) da **falsa confianza** en tres zonas, y las tres coinciden con donde
viven los problemas abiertos:

- `SimulatedTransport` puentea `CoopSession` y `CoopSecurityGuard` → R1 (REST) y R5 (guard entre
  sesiones) son **indetectables** por la suite actual.
- La corrección posicional pura de R2 tiene tests desde F3, pero su integración con Phaser y toda
  la semántica de degradación siguen en las escenas sin cobertura → R3 y R4 aún no tienen red de
  seguridad completa (F5 lo corrige al extraer el controlador).
- El harness entrega con retardo 0 por defecto, sin REST, sin reordenamiento, sin visibilidad
  ni suspensión de pestañas.

Cualquier "los tests pasan" sobre estas zonas debe leerse como "no hay cobertura", no como "funciona".
