# 🛰️ Arquitectura de red del co-op

## Principio de arquitectura

**La red vive completamente fuera de Phaser** (regla heredada de la auditoría original). React la
maneja desde el lobby; las escenas Phaser solo se **suscriben** a los callbacks del singleton.
No hay sockets acoplados dentro de escenas ni entidades.

## Mapa de archivos

| Archivo | Rol |
|---|---|
| `src/game/systems/net/CoopSession.ts` | Singleton `coopSession`. Envuelve el canal Supabase Realtime, presencia, roles y callbacks. |
| `src/game/systems/net/coopMessages.ts` | Tipos y serialización comunes: input empaquetado, `NetPlayerState`, `WorldSnapshot` (Desafío), código de sala, tasas y eventos. |
| `src/game/systems/net/levelCoopMessages.ts` | `LevelSnapshot` (Explorar): entidades propias de `LevelScene`. |
| `src/game/events/EventBus.ts` | `START_GAME` lleva `coop?: CoopSessionInfo` (`{ role, code }`). |
| `src/shared/supabase/client.ts` | Cliente Supabase reutilizado (`@supabase/supabase-js`, Realtime incluido). |

## Transporte: Supabase Realtime

- Un canal por sala: `supabase.channel("coop-room-<CÓDIGO>")`.
- Config: `broadcast: { self: false, ack: false }` + `presence: { key: role }`.
- **Broadcast** para mensajes (input/snapshot/hello/start/end). **Presence** para detectar cuándo
  el otro jugador entra o sale.
- Elección del transporte: cero infraestructura nueva (no requiere tablas ni RLS), funciona con la
  anon key y con la autenticación existente.

## `CoopSession` (API pública)

| Miembro | Descripción |
|---|---|
| `host(hello)` → `Promise<code>` | Genera código, se subscribe y anuncia presencia como `host`. |
| `join(code, hello)` → `Promise<void>` | Se une a la sala como `guest`. |
| `sendInput(msg)` | Guest → host: input empaquetado por frame. |
| `sendSnapshot(snapshot)` | Host → guest: estado autoritativo (payload genérico `unknown`). |
| `sendStart(levelId)` | Host anuncia el inicio del nivel elegido. |
| `sendEnd(reason)` | Fin de sesión: `"won" \| "lost" \| "left"`. |
| `onConnectionState / onPeerJoined / onPeerLeft` | Estado de sala para la UI. |
| `onInput / onSnapshot<T> / onStart / onEnd` | Suscripciones de la escena. `onSnapshot` es **genérico**. |
| `leave()` | Cierra el canal y resetea el estado. |
| `role`, `code`, `peerCharacterId`, `connectionState`, `isActive`, `peerPresent` | Getters. |

`hello = { characterId }`: cada jugador anuncia su héroe elegido para que el otro lo instancie.

**Estados de conexión:** `idle → connecting → waiting` (conectado, esperando al otro) `→ ready`
(ambos presentes) `→ in-game → ended` (o `error`).

**Snapshot genérico:** `onSnapshot<T>` permite que Desafío use `WorldSnapshot` y Explorar
`LevelSnapshot` sobre el mismo canal, sin acoplar la escena al transporte.

## Mensajes (`coopMessages.ts`)

| Constante / Tipo | Valor / Forma |
|---|---|
| `COOP_INPUT_RATE_HZ` | `30` (guest → host) |
| `COOP_SNAPSHOT_RATE_HZ` | `20` (host → guest) |
| `COOP_EVENTS` | `hello`, `input`, `snapshot`, `start`, `end` |
| `GuestInputMessage` | `{ seq, bits }` — `bits` empaqueta los booleanos de `GameplayInputState`. |
| `packInputState` / `unpackInputState` | Empaquetan/desempaquetan el input en un entero (orden fijo `INPUT_ORDER`). |
| `NetPlayerState` | `{ x, y, vx, vy, facing, state, health, maxHealth, healCharges, powerCharges, spinCdMs }` |
| `WorldSnapshot` (Desafío) | `{ seq, players[2], crates, enemies, active[], gatesOpen[], sealsAlive[], goalOpen, timeMs }` |
| Código de sala | `ROOM_CODE_LENGTH = 4`, alfabeto sin caracteres ambiguos; `generateRoomCode` / `normalizeRoomCode` / `isValidRoomCode`. |

**Input robusto ante pérdidas:** el guest envía el **estado sostenido** (held) cada frame; el host
reconstruye los flancos `justPressed` comparando contra el frame anterior
(`consumeRemoteInputFrame`). No depende de eventos de flanco que un broadcast con pérdidas podría
descartar.

## `LevelSnapshot` (`levelCoopMessages.ts`, Explorar)

Reutiliza `NetPlayerState` para ambos jugadores. Añade las entidades de `LevelScene`:

```
{ seq, players[2],
  enemies:   [netId, x, y, flip][],
  platforms: [netId, x, y][],       // plataformas móviles
  hazards:   [netId, x, y][],       // peligros móviles
  coins:  number[],                 // índices aún presentes
  hearts: number[],                 // índices aún presentes
  rewardBox: boolean,               // caja de recompensa disponible
  checkpointActive: boolean,
  pressureX: number,                // posición mundial de la línea roja
  timeMs }
```

## Modelo host-autoritativo (flujo)

```
GUEST                          HOST
  input local  ──sendInput──▶  remoteHeld → consumeRemoteInputFrame()
  (30 Hz, bits)                movement2.update(player2, remoteFrame)
                              movement.update(player, localInput)
                              simula mundo (enemigos, físicas, presión)
  applySnapshot() ◀─sendSnapshot──  buildSnapshot() (20 Hz)
  (interpola, renderNetState)       toNetPlayer(player), toNetPlayer(player2)
  end local ◀──sendEnd──────  finishWithDefeat / completeLevel
```

- **Slot A** = `this.player` = host. **Slot B** = `this.player2` = guest. (Igual en ambas máquinas.)
- El guest **congela** sus cuerpos (`freezePuppet` → `body.enable = false`) y solo mueve los
  sprites por interpolación (`Phaser.Math.Linear`, factor `0.4`) + `Player.renderNetState`
  (facing + animación).
- El `seq` monótono descarta snapshots/inputs fuera de orden.

Detalle de la aplicación por escena en `integracion-en-escenas.md`.
