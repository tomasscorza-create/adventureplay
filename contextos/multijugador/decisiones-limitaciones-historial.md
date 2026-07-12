# 🧭 Decisiones, limitaciones e historial

## Decisiones de diseño (con su porqué)

| Decisión | Por qué |
|---|---|
| **Host-autoritativo** (no P2P lockstep; predicción local limitada) | El host conserva una sola fuente de verdad para gameplay y físicas; el guest predice solo su movimiento y converge por snapshots. |
| **Supabase Realtime** como transporte | Ya estaba configurado; cero infraestructura nueva, sin tablas/RLS/servidor. |
| **Cámara independiente por dispositivo** | Permite que cada jugador explore libremente sin que la cámara del otro lo limite. Reemplazó a una cámara de punto medio compartida (ver historial). |
| **Fin de partida compartido** | Co-op cooperativo: si uno cae o se agota el tiempo, ambos pierden; la meta se gana juntos. |
| **Presión (Explorar) sigue al jugador más atrasado** | Con cámaras independientes, una línea atada a cámara mataría al que se queda atrás. Anclarla al más lento conserva la mecánica sin castigar la exploración. Decisión explícita del usuario. |
| **Cargas de poder/vida no persistidas en co-op** | Evita doble contabilidad entre dos saves; el host mantiene contadores vivos para el HUD. |
| **Co-op encadenado por el host** | Tras la victoria, `Próximo` avanza a toda la sala: el host reenvía `start` con el próximo nivel y el roster vigente, y la sesión sobrevive al reinicio de escena (`coopLink.dispose(keepSession)`); el botón del guest espera al host. Tras derrota, `Reintentar` reinicia el nivel actual con la misma lógica. |
| **Tienda de cargas en co-op sin pausar** | La tienda abre con la partida corriendo detrás. El host puede refrescar sus contadores desde su save; las compras nuevas del guest no alteran el estado autoritativo de la sesión. El antiguo delta `charges` fue retirado por no ser confiable/autoritativo. |
| **Cargas reales por jugador** | Cada jugador reporta sus cargas en presence al entrar; el roster del `start` las lleva (vivas al encadenar). El host nunca siembra desde su propio save — eso bloqueaba los poderes de los guests. |
| **Modo red solo con `coop` presente** | Garantiza regresión cero: single-player de Explorar y Desafío quedan idénticos. |
| **Versión de protocolo + presence por clientId** | La versión evita que builds incompatibles emparejen en silencio (aviso claro). La key por clientId (no por rol) permite más de un guest y evita colisiones. |
| **Modelo de slots (protocolo N-ready antes que gameplay N)** | Separar la generalización del protocolo (slots, `players[]`, input con emisor) del render de 3-4 jugadores permite subir versión una sola vez y validar el modelo con tests, manteniendo el gameplay de 2 idéntico. |
| **Plumbing en `CoopSceneLink`** | Deduplicación, flancos, throttling y guardas de fin viven en un solo lugar testeable, no duplicados en cada escena. |
| **R4: zonas degradadas con histéresis** | Sin métricas reales que justifiquen replicar colisiones dinámicas, se conserva el modo autoritativo cerca de cajas/plataformas: entra a 120/140 px, sale a 180 px y usa blend interpolado. La colisión local queda diferida. |

## Decisiones reemplazadas (Obsoletas)

| Decisión | Por qué se reemplazó |
|---|---|
| **Cámara compartida (punto medio)** | Castigaba la exploración. Reemplazada por cámara independiente. |
| **Guest sin predicción (títere congelado)** | Generaba latencia inaceptable. Reemplazada por predicción local con eco de input (aunque la convergencia actual es imperfecta). |
| **Reconexión de 10 segundos** | Demasiado breve para dispositivos móviles. Ampliada a 30 segundos en fases posteriores. |

## Limitaciones conocidas

- **Predicción local con convergencia:** El guest corrige deriva en modo seguro y degrada con
  histéresis cerca de cuerpos dinámicos. Los umbrales siguen pendientes de calibración manual y la
  integración Phaser necesita QA real antes de considerarse cerrada para producción.
- **Poses finas de M2/M3 en el guest son aproximadas:** se sincroniza posición y `flipX`, no cada
  pose de ataque. El **daño es autoritativo del host**, así que la jugabilidad es correcta aunque
  la animación puntual difiera.
- **Reconexión transitoria disponible; sin migración de host ni anti-cheat.** La identidad y el slot se reservan 30 segundos mientras la escena sigue viva. Un refresh completo no restaura la partida.
- **Ambos clientes deben apuntar al mismo proyecto Supabase.**
- **Gameplay de 2 a 4 jugadores** (`COOP_MAX_PLAYERS = 4`). Con salas de 4, revisar el costo de
  broadcasts contra las cuotas de Supabase Realtime antes de promocionar el modo (Fase 4).
- **Sin join a mitad de partida:** el roster se fija en el inicio; quien se una después queda en
  "esperando" y no entra. Un quinto en el lobby recibe "La sala está llena".
- **Pausa real no sincronizada:** en co-op no se puede pausar; solo existe la confirmación de
  salida. Una pausa acordada entre peers queda pendiente.

## Cronología Histórica de Implementación

1. **Base cooperativa (previa):** `PuzzleActivationSystem` con participantes múltiples y
   `supportsCooperative: true` en los niveles, pero **sin** capa de red ni segundo jugador.
2. **Co-op de Desafío (`PuzzleScene`):** se construyó desde cero la capa de red
   (`CoopSession`, `coopMessages`, `CoopLobby.tsx`), el segundo jugador, snapshots host-autoritativos,
   interpolación en el guest y fin compartido. La UI se conectó al botón "Cooperativo" del menú
   Desafío. Primer hito funcional validado en el deploy real.
3. **Cámara: punto medio → independiente.** Inicialmente la cámara seguía un `midpoint` entre ambos
   jugadores. Se cambió a **cámara independiente por dispositivo** (cada pantalla ancla a su
   personaje local: guest → `player2`, host/single → `player`). Se eliminaron
   `CameraSystem.followMidpoint` y `updateMidpoint` (ya no existen).
4. **Co-op de Explorar (`LevelScene`):** se replicó el patrón host-autoritativo adaptado a los
   sistemas de Explorar: plataformas y peligros móviles, enemigos M0–M3, checkpoints, pozos con
   respawn por jugador, monedas/corazones/caja, y el **rediseño de la línea de presión** para
   seguir al jugador más atrasado. Se hizo genérico el canal de snapshot (`onSnapshot<T>`,
   `sendSnapshot(unknown)`) y se añadió `levelCoopMessages.ts` (`LevelSnapshot`). Lobby
   parametrizado por modo y acceso "Jugar en cooperativo" en Explorar.
5. **Fase 1 de escalado — base estable:** se extrajo el plumbing duplicado a `CoopSceneLink` +
   `coopPlayerNet`, se añadió `COOP_PROTOCOL_VERSION` con aviso por mismatch, presence por
   clientId, tests de la capa de red, input por cambio + keepalive, timeout al unirse a sala
   vacía. Fixes de QA: nivel perfecto por jugador, y del reporte del usuario — tap del guest que
   no saltaba (fusión de flancos en guest + acumulación en host), proyectiles del poder letal
   sincronizados (`CoopProjectilePuppets`, protocolo v3) y confirmación `coop-exit-confirm`.
6. **Fase 2 de escalado — protocolo y sesión N jugadores (protocolo v4):** input con slot emisor
   (`CoopInputMessage { slot, seq, bits }`), `players` como arreglo indexado por slot, roster
   determinista (`assignSlots`, host = slot 0, guests por clientId), `CoopSession` con
   `localSlot`/`participants`/`characterIdForSlot`, e input remoto enrutado por slot en
   `CoopSceneLink`. Gameplay siguió siendo de 2 jugadores, idéntico, sobre el nuevo modelo.
7. **Fase 3 de escalado — gameplay y lobby 2-4 jugadores (protocolo v5):** las escenas usan
   `this.player` (slot 0) más arreglos `remotePlayers`/`remoteMovement`/`remoteCharges` (y en
   Explorar `remoteRecoveringFromPit`/`remotePressureCooldown`) por slot, con helpers
   `allPlayers()`/`playerAtSlot()`/`forEachPlayer` y colisiones jugador-jugador entre todos los
   pares. El host simula cada guest por slot y arma `players[]` de N; el guest aplica todos por
   slot. Presión y objetivo de enemigos sobre N. `CoopStartMessage` lleva el roster autoritativo
   (slot + héroe) que fija el host, viajando en `CoopSessionInfo.roster`. `COOP_MAX_PLAYERS = 4`
   con tope de sala (`onSessionError` "La sala está llena") y lobby con lista de participantes
   (`onRoster`).
8. **Fase 4A/4B/4C (commits del usuario):** tienda de cargas deshabilitada en co-op (UI + guard);
   `RESTART_GAME`/`CONTINUE_LEVEL` protegidos en co-op; `end` con slot emisor y detección de
   desconexiones súbitas por presence (`onParticipantLeft`), congelando al que se va en salas 3-4;
   bloqueo de late joins con roster autorizado al iniciar la partida.
9. **Encadenado de niveles co-op (protocolo v6) + fix de regresión:** `Próximo` del host reenvía
   `start` con el roster vigente y la sesión sobrevive al reinicio de escena
   (`coopLink.dispose(keepSession)` + hook `onStartNextLevel` en el guest). Se corrigió una
   regresión de 4B: `applySnapshot` usaba `allPlayers()` (que filtra abandonos) como índice de
   slots y, tras un abandono en salas 3-4, aplicaba el estado de red al jugador equivocado; ahora
   resuelve por `playerAtSlot(slot)`.
10. **Cargas reales por jugador + tienda en co-op (protocolo v7):** el bug de "poderes
   bloqueados / sin recompras" venía de sembrar las cargas de los guests desde el save del host
   con la tienda deshabilitada. Ahora las cargas viajan en presence y en el roster del `start`
   (vivas al encadenar), la tienda funciona en co-op sin pausar la escena, y las compras del
   guest llegan al host como delta (`CoopChargesMessage`). Además, el HUD del guest dejó de
   emitirse a 60 Hz hacia React: solo emite cuando cambia algo visible (rendimiento).
11. **Retry co-op soportado:** Tras derrota, el host puede reintentar el mismo nivel reutilizando el mecanismo de encadenado. La derrota en Explorar co-op ya no pasa por `GameOverScene`, conservando la escena viva al igual que en Desafío.
12. **Fase 4 - Optimización de red (protocolo v8):** Se agregó telemetría de red en consola (solo DEV), se dividió el tráfico usando un canal secundario `coop-room-<CÓDIGO>-input` para evitar que los guests reciban broadcasts cruzados inútiles, y se implementó *delta encoding* genérico en `CoopSceneLink`: las secciones pesadas de los snapshots (enemigos, plataformas, etc.) pasan a ser opcionales y solo se transmiten cuando cambian, reconstruyéndose automáticamente en el receptor. Esto baja drásticamente el consumo de bytes.
13. **Fase 5 - Reconexión automática (protocolo v9):** reserva de identidad y slot por 30 segundos (originalmente 10s), estado `reconnecting`, neutralización del input remoto, entidad suspendida sin destruir estado, reactivación en el mismo slot, keyframe completo forzado y repetición del resultado si la partida terminó durante la ausencia. No incluye migración de host.
14. **Fase 7A/7B - Endurecimiento (protocolo v10):** envelope común y validación de versión,
    emisor, rol, slot, secuencia, rangos, tamaño y rate; autoridad explícita para mensajes de
    control; compras guest bloqueadas hasta disponer de RPC autoritativa; diagnóstico opt-in sin
    payloads sensibles y suite multicliente ampliada. La migración de host quedó deliberadamente
    sin implementar: Presence/Broadcast no aporta elección atómica, lease ni fencing token.

## Continuidad / próximos pasos sugeridos

- **Costo y robustez:** revisar cuotas de Supabase Realtime con salas de 4, reconexión después de refresh, pausa co-op acordada y expulsión por el host. La reconexión transitoria quedó cubierta en v9.
- **HUD del compañero:** mostrar ícono y vida de los demás jugadores en una esquina secundaria.
- **Calibración de predicción:** medir divergencia, transiciones y rubber-banding con dos o más clientes reales antes de ajustar umbrales.
- **Estados de animación finos** de enemigos complejos en el guest.

## Archivos clave (para retomar)

- Red: `src/game/systems/net/CoopSession.ts`, `coopMessages.ts`, `levelCoopMessages.ts`,
  `CoopSceneLink.ts`, `GuestCoopController.ts`, `coopPlayerNet.ts`, `CoopProjectilePuppets.ts`.
- Tests de red: `coopMessages.test.ts`, `CoopSceneLink.test.ts`.
- Escenas: `src/game/scenes/PuzzleScene.ts`, `src/game/scenes/LevelScene.ts`.
- Entidad: `src/game/entities/player/Player.ts` (`renderNetState`).
- Cámara: `src/game/systems/camera/CameraSystem.ts`.
- UI: `src/ui/screens/main-menu/CoopLobby.tsx`, `ChallengeView.tsx`, `ExploreView.tsx`,
  `src/ui/screens/MainMenuScreen.tsx`, `src/ui/screens/CoopExitConfirmScreen.tsx`; estilos en
  `src/styles/challenge-mode.css`.
- Eventos: `src/game/events/EventBus.ts` (`START_GAME.coop`), `src/game/scenes/MainMenuScene.ts`.
