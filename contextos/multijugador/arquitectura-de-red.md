# 🛰️ Arquitectura de red del co-op

## Principio de arquitectura

**La red vive completamente fuera de Phaser** (regla heredada de la auditoría original). React la
maneja desde el lobby; las escenas Phaser solo se **suscriben** a los callbacks del singleton.
No hay sockets acoplados dentro de escenas ni entidades.

## Mapa de archivos

| Archivo | Rol |
|---|---|
| `src/game/systems/net/CoopSession.ts` | Singleton `coopSession`. Envuelve el canal Supabase Realtime, presencia, roles, **slots** y callbacks. |
| `src/game/systems/net/coopMessages.ts` | Tipos y serialización comunes: input empaquetado con slot, `NetPlayerState`, `WorldSnapshot` (Desafío), roster (`assignSlots`), código de sala, versión de protocolo, tasas y eventos. |
| `src/game/systems/net/levelCoopMessages.ts` | `LevelSnapshot` (Explorar): entidades propias de `LevelScene`. |
| `src/game/systems/net/CoopSceneLink.ts` | **Plumbing compartido** por ambas escenas: dedupe por seq, flancos del input remoto por slot, throttling de envíos, guardas de fin de sesión. Testeable con transporte inyectado. |
| `src/game/systems/net/CoopSnapshotInterpolator.ts` | Buffer temporal de tres snapshots, reloj del host, interpolación a 85 ms y extrapolación limitada a 100 ms. |
| `src/game/systems/net/CoopLocalPrediction.ts` | Historial acotado de comandos realmente enviados, limpieza por ACK y replay de intención sostenida sin repetir flancos. |
| `src/game/systems/net/coopPlayerNet.ts` | `toNetPlayer` / `applyNetPlayer` compartidos. |
| `src/game/systems/net/CoopProjectilePuppets.ts` | Sprites sin física que representan los proyectiles del host en el guest (interpola + destello al desaparecer). |
| `src/game/events/EventBus.ts` | `START_GAME` lleva `coop?: CoopSessionInfo` (`{ role, code, localSlot, roster }`). |
| `src/shared/supabase/client.ts` | Cliente Supabase reutilizado (`@supabase/supabase-js`, Realtime incluido). |

## Transporte: Supabase Realtime

- Dos canales por sala: `supabase.channel("coop-room-<CÓDIGO>")` (para broadcast general y presence) y `supabase.channel("coop-room-<CÓDIGO>-input")` (exclusivo para que los guests envien input al host, evitando broadcast cruzado entre guests).
- Config: `broadcast: { self: false, ack: false }` + `presence: { key: clientId }`. La key es un
  **clientId único por dispositivo** (no el rol): admite más de un guest y evita colisiones. El rol
  viaja dentro del payload de presence junto con `characterId`, `protocol` y las **cargas reales
  del jugador** (`healingCharges`/`powerCharges`, leídas de su save al entrar a la sala) — el host
  siembra los contadores vivos de cada slot desde ahí, nunca desde su propio save.
- **Broadcast** para mensajes (input/snapshot/hello/start/end). **Presence** para detectar quién
  está en la sala, asignar slots y validar versiones.
- **Versión de protocolo** (`COOP_PROTOCOL_VERSION`): si un peer trae una versión distinta (incluye
  builds previos sin el campo), `onSessionError` avisa una vez y el lobby lo muestra en lugar de
  quedar esperando para siempre.
- **Tope de sala** (`COOP_MAX_PLAYERS = 4`): un cliente cuyo slot determinista cae fuera del tope
  (llegó cuando la sala ya estaba llena) recibe `onSessionError` "La sala está llena" y no juega.
- Elección del transporte: cero infraestructura nueva (no requiere tablas ni RLS), funciona con la
  anon key y con la autenticación existente.

## `CoopSession` (API pública)

| Miembro | Descripción |
|---|---|
| `host(hello)` → `Promise<code>` | Genera código, se subscribe y anuncia presencia como `host`. |
| `join(code, hello)` → `Promise<void>` | Se une a la sala como `guest`. |
| `sendInput(msg)` | Guest → host: `{ slot, seq, bits }` (el slot identifica al emisor). |
| `sendSnapshot(snapshot)` | Host → guest: estado autoritativo (payload genérico `unknown`). |
| `sendStart(levelId)` | Host anuncia el inicio: incluye el **roster autoritativo** (slot + héroe). |
| `sendEnd(reason)` | Fin de sesión: `"won" \| "lost" \| "left"`. |
| `onConnectionState / onPeerJoined / onPeerLeft / onSessionError / onRoster` | Estado de sala, errores fatales y cambios de roster para la UI. |
| `onInput / onSnapshot<T> / onStart / onEnd` | Suscripciones de la escena. `onSnapshot` es **genérico**; `onStart` trae `{ levelId, roster }`. |
| `leave()` | Cierra el canal y resetea el estado. |
| `role`, `code`, `connectionState`, `isActive`, `peerPresent`, `peerCharacterId` | Getters básicos. |
| `localSlot`, `participants`, `participantCount`, `characterIdForSlot(slot)` | **Modelo de slots**: slot propio, roster con slots asignados, conteo y héroe por slot. |

`hello = { characterId, protocol }`: cada jugador anuncia su héroe y su versión para que el otro lo
instancie y valide compatibilidad.

**Estados de conexión:** `idle → connecting → waiting` (conectado, esperando al otro) `→ ready`
(ambos presentes) `→ in-game → ended` (o `error`).

**Snapshot genérico:** `onSnapshot<T>` permite que Desafío use `WorldSnapshot` y Explorar
`LevelSnapshot` sobre el mismo canal, sin acoplar la escena al transporte.

## Mensajes (`coopMessages.ts`)

| Constante / Tipo | Valor / Forma |
|---|---|
| `COOP_PROTOCOL_VERSION` | `12`. Agrega `inputSeqBySlot` para confirmar inputs y reconciliar; conserva interpolación v11, seguridad v10 y reconexión v9. |
| `COOP_RECONNECT_WINDOW_MS` | `10000`. Ventana para recuperar el mismo slot antes de convertir la ausencia en salida definitiva. |
| `CoopChargesMessage` | `{ slot, healingDelta, powerDelta }` — compra durante la partida; el host suma el delta a los contadores vivos de ese slot. |
| `COOP_MAX_PLAYERS` | `4` (tope de jugadores por sala). |
| `CoopStartMessage` | `{ levelId, roster: { slot, characterId }[] }` — roster autoritativo del host. |
| `HOST_SLOT` | `0`. Los guests ocupan slots `1..N`. |
| `COOP_INPUT_RATE_HZ` / `COOP_INPUT_KEEPALIVE_MS` | `30` (tope al cambiar) / `100` (keepalive sin cambios). |
| `COOP_SNAPSHOT_RATE_HZ` | `20` (host → guest) |
| `COOP_EVENTS` | `hello`, `input`, `snapshot`, `start`, `end` |
| `CoopInputMessage` | `{ slot, seq, bits }` — `slot` = emisor; `bits` empaqueta `GameplayInputState`. |
| `packInputState` / `unpackInputState` | Empaquetan/desempaquetan el input en un entero (orden fijo `INPUT_ORDER`). |
| `assignSlots(entries)` | Roster determinista: host → slot 0; guests ordenados por clientId → 1..N. Igual en todos los clientes. |
| `NetPlayerState` | `{ x, y, vx, vy, facing, state, health, maxHealth, healCharges, powerCharges, spinCdMs }` |
| `NetProjectile` | `[netId, x, y, dir]` por proyectil de poder letal vivo. |
| `WorldSnapshot` (Desafío) | `{ seq, hostTimeMs, inputSeqBySlot[], players[], crates?, enemies?, projectiles, active?, gatesOpen?, sealsAlive?, goalOpen, timeMs }` — Usa campos opcionales para compresión delta (solo se envían si cambiaron respecto al último snapshot). |
| Código de sala | `ROOM_CODE_LENGTH = 4`, alfabeto sin caracteres ambiguos; `generateRoomCode` / `normalizeRoomCode` / `isValidRoomCode`. |

**Input robusto ante pérdidas (`CoopSceneLink`):** el guest envía su input **solo al cambiar**
(tope 30 Hz) más un keepalive espaciado (100 ms). Los flancos `justPressed` que caen dentro de la
ventana del throttle se acumulan localmente por acción y se consumen solo después de confirmar el
envío; pulsaciones repetidas de la misma acción se serializan con una liberación intermedia. El host
reconstruye los `justPressed` por slot comparando contra el consumo anterior **y** acumulando los
flancos entre mensajes (`consumeRemoteInputFrame(slot)`), de modo que un press+release en el mismo
lote de red no se colapse. No depende de eventos de flanco que un broadcast con pérdidas podría
descartar.

## `LevelSnapshot` (`levelCoopMessages.ts`, Explorar)

Reutiliza `NetPlayerState` para todos los jugadores (arreglo indexado por slot). Añade las
entidades de `LevelScene`:

```
{ seq, players[],                   // indexado por slot (0 = host, 1..N = guests)
  enemies?:     [netId, x, y, flip][],
  platforms?:   [netId, x, y][],     // plataformas móviles
  hazards?:     [netId, x, y][],     // peligros móviles
  projectiles: [netId, x, y, dir][],// proyectiles de poder letal
  coins?:  number[],                 // índices aún presentes
  hearts?: number[],                 // índices aún presentes
  rewardBox: boolean,               // caja de recompensa disponible
  checkpointActive: boolean,
  pressureX: number,                // posición mundial de la línea roja
  timeMs }
```

## Modelo host-autoritativo (flujo)

```
GUEST                              HOST (CoopSceneLink)
  input local ──sendInput(slot)─▶  remoteInputs[slot] → consumeRemoteInputFrame(slot)
  (al cambiar + keepalive)         movement2.update(player2, remoteFrame)   // slot 1
                                  movement.update(player, localInput)       // slot 0
                                  simula mundo (enemigos, físicas, presión, proyectiles)
  applySnapshot() ◀─sendSnapshot──  buildSnapshot(seq) (20 Hz)
  (interpola, renderNetState,       players[] por slot, projectiles[]
   projectile puppets)
  end local ◀──sendEnd──────────  finishWithDefeat / completeLevel
```

- **Slots:** `this.player` = slot 0 = host; `remotePlayers[i]` = slot i+1 = guest. El arreglo
  `players` del snapshot está indexado por slot; el guest lee su propio estado en
  `snap.players[coopSelfSlot]` (`= coopSession.localSlot`). `COOP_MAX_PLAYERS = 4`; la cantidad y
  los héroes vienen del roster autoritativo del host.
- El guest **congela** sus cuerpos (`freezePuppet` → `body.enable = false`) y renderiza jugadores
  remotos, enemigos y proyectiles entre snapshots del host con 85 ms de retraso. Si falta el
  siguiente snapshot, solo los jugadores extrapolan con `vx/vy`, durante un máximo de 100 ms.
  El personaje local del guest habilita su cuerpo y reutiliza `MovementSystem`; cada snapshot
  confirma el último input consumido por slot. Se eliminan comandos confirmados y se conserva la
  intención sostenida pendiente, sin volver a disparar flancos. En geometría estática Phaser y
  `MovementSystem` son los únicos escritores; una divergencia mayor a 96 px hace un reset único
  antes del tick físico. El historial se limita a 96 paquetes.
- La predicción no resuelve daño, vida, cargas, enemigos, cajas, puertas, resultados ni proyectiles.
  Cerca de plataformas móviles/hundibles o cajas se degrada temporalmente a render autoritativo;
  también se recupera desde snapshot si el guest cae fuera del mundo.
- El `seq` (por slot en el input, global en el snapshot) descarta mensajes fuera de orden.

Detalle de la aplicación por escena en `integracion-en-escenas.md`.

## Reconexión automática

- Presence conserva una identidad estable mientras vive `CoopSession`; una resuscripción reutiliza esa identidad.
- Al desaparecer un participante durante la partida, su slot queda reservado 10 segundos. Ningún late join puede ocuparlo.
- El host neutraliza inmediatamente el último input remoto para evitar movimiento atascado y las escenas ocultan/congelan la entidad sin destruir su vida, cargas ni posición.
- Si vuelve con protocolo v12 dentro de la ventana, se reactiva la misma entidad, se limpia el historial predictivo y el host fuerza el siguiente snapshot como keyframe completo.
- Si la partida terminó durante la ausencia, el host repite `end("won" | "lost")` al detectar el regreso.
- Si vence la ventana, se emite la salida definitiva, se elimina la reserva y el host rechaza inputs posteriores de ese slot.
- No hay migración de host. Un refresh completo de página tampoco recupera la escena: esta fase cubre cortes transitorios mientras la sesión y la escena siguen vivas.
