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
| `src/game/systems/net/coopPlayerNet.ts` | `toNetPlayer` / `applyNetPlayer` compartidos. |
| `src/game/systems/net/CoopProjectilePuppets.ts` | Sprites sin física que representan los proyectiles del host en el guest (interpola + destello al desaparecer). |
| `src/game/events/EventBus.ts` | `START_GAME` lleva `coop?: CoopSessionInfo` (`{ role, code, localSlot }`). |
| `src/shared/supabase/client.ts` | Cliente Supabase reutilizado (`@supabase/supabase-js`, Realtime incluido). |

## Transporte: Supabase Realtime

- Un canal por sala: `supabase.channel("coop-room-<CÓDIGO>")`.
- Config: `broadcast: { self: false, ack: false }` + `presence: { key: clientId }`. La key es un
  **clientId único por dispositivo** (no el rol): admite más de un guest y evita colisiones. El rol
  viaja dentro del payload de presence junto con `characterId` y `protocol`.
- **Broadcast** para mensajes (input/snapshot/hello/start/end). **Presence** para detectar quién
  está en la sala, asignar slots y validar versiones.
- **Versión de protocolo** (`COOP_PROTOCOL_VERSION`): si un peer trae una versión distinta (incluye
  builds previos sin el campo), `onSessionError` avisa una vez y el lobby lo muestra en lugar de
  quedar esperando para siempre.
- Elección del transporte: cero infraestructura nueva (no requiere tablas ni RLS), funciona con la
  anon key y con la autenticación existente.

## `CoopSession` (API pública)

| Miembro | Descripción |
|---|---|
| `host(hello)` → `Promise<code>` | Genera código, se subscribe y anuncia presencia como `host`. |
| `join(code, hello)` → `Promise<void>` | Se une a la sala como `guest`. |
| `sendInput(msg)` | Guest → host: `{ slot, seq, bits }` (el slot identifica al emisor). |
| `sendSnapshot(snapshot)` | Host → guest: estado autoritativo (payload genérico `unknown`). |
| `sendStart(levelId)` | Host anuncia el inicio del nivel elegido. |
| `sendEnd(reason)` | Fin de sesión: `"won" \| "lost" \| "left"`. |
| `onConnectionState / onPeerJoined / onPeerLeft / onSessionError` | Estado de sala y errores fatales para la UI. |
| `onInput / onSnapshot<T> / onStart / onEnd` | Suscripciones de la escena. `onSnapshot` es **genérico**. |
| `leave()` | Cierra el canal y resetea el estado. |
| `role`, `code`, `connectionState`, `isActive`, `peerPresent`, `peerCharacterId` | Getters básicos. |
| `localSlot`, `participants`, `characterIdForSlot(slot)` | **Modelo de slots**: slot propio, roster con slots asignados y héroe por slot. |

`hello = { characterId, protocol }`: cada jugador anuncia su héroe y su versión para que el otro lo
instancie y valide compatibilidad.

**Estados de conexión:** `idle → connecting → waiting` (conectado, esperando al otro) `→ ready`
(ambos presentes) `→ in-game → ended` (o `error`).

**Snapshot genérico:** `onSnapshot<T>` permite que Desafío use `WorldSnapshot` y Explorar
`LevelSnapshot` sobre el mismo canal, sin acoplar la escena al transporte.

## Mensajes (`coopMessages.ts`)

| Constante / Tipo | Valor / Forma |
|---|---|
| `COOP_PROTOCOL_VERSION` | `4`. Subirla ante cualquier cambio incompatible de mensajes/presencia. |
| `COOP_MAX_PLAYERS` | `2` (tope actual del gameplay; el modelo de slots admite más). |
| `HOST_SLOT` | `0`. Los guests ocupan slots `1..N`. |
| `COOP_INPUT_RATE_HZ` / `COOP_INPUT_KEEPALIVE_MS` | `30` (tope al cambiar) / `100` (keepalive sin cambios). |
| `COOP_SNAPSHOT_RATE_HZ` | `20` (host → guest) |
| `COOP_EVENTS` | `hello`, `input`, `snapshot`, `start`, `end` |
| `CoopInputMessage` | `{ slot, seq, bits }` — `slot` = emisor; `bits` empaqueta `GameplayInputState`. |
| `packInputState` / `unpackInputState` | Empaquetan/desempaquetan el input en un entero (orden fijo `INPUT_ORDER`). |
| `assignSlots(entries)` | Roster determinista: host → slot 0; guests ordenados por clientId → 1..N. Igual en todos los clientes. |
| `NetPlayerState` | `{ x, y, vx, vy, facing, state, health, maxHealth, healCharges, powerCharges, spinCdMs }` |
| `NetProjectile` | `[netId, x, y, dir]` por proyectil de poder letal vivo. |
| `WorldSnapshot` (Desafío) | `{ seq, players[], crates, enemies, projectiles, active[], gatesOpen[], sealsAlive[], goalOpen, timeMs }` — `players` indexado por slot. |
| Código de sala | `ROOM_CODE_LENGTH = 4`, alfabeto sin caracteres ambiguos; `generateRoomCode` / `normalizeRoomCode` / `isValidRoomCode`. |

**Input robusto ante pérdidas (`CoopSceneLink`):** el guest envía su input **solo al cambiar**
(tope 30 Hz) más un keepalive espaciado (100 ms), fundiendo los flancos `justPressed` en los bits
para que un tap táctil de un solo frame no se pierda. El host reconstruye los `justPressed` por slot
comparando contra el consumo anterior **y** acumulando los flancos entre mensajes
(`consumeRemoteInputFrame(slot)`), de modo que un press+release en el mismo lote de red no se
colapse. No depende de eventos de flanco que un broadcast con pérdidas podría descartar.

## `LevelSnapshot` (`levelCoopMessages.ts`, Explorar)

Reutiliza `NetPlayerState` para todos los jugadores (arreglo indexado por slot). Añade las
entidades de `LevelScene`:

```
{ seq, players[],                   // indexado por slot (0 = host, 1..N = guests)
  enemies:     [netId, x, y, flip][],
  platforms:   [netId, x, y][],     // plataformas móviles
  hazards:     [netId, x, y][],     // peligros móviles
  projectiles: [netId, x, y, dir][],// proyectiles de poder letal
  coins:  number[],                 // índices aún presentes
  hearts: number[],                 // índices aún presentes
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

- **Slots:** `this.player` = slot 0 = host; `this.player2` = slot 1 = (único) guest. El arreglo
  `players` del snapshot está indexado por slot; el guest lee su propio estado en
  `snap.players[coopSelfSlot]` (`= coopSession.localSlot`). El gameplay usa 2, pero el protocolo ya
  admite más.
- El guest **congela** sus cuerpos (`freezePuppet` → `body.enable = false`) y solo mueve los
  sprites por interpolación (`Phaser.Math.Linear`, factor `0.4`) + `Player.renderNetState`
  (facing + animación). Los proyectiles del host se dibujan con `CoopProjectilePuppets`.
- El `seq` (por slot en el input, global en el snapshot) descarta mensajes fuera de orden.

Detalle de la aplicación por escena en `integracion-en-escenas.md`.
