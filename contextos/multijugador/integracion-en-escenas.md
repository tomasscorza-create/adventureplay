# 🎮 Integración del co-op en las escenas

Ambas escenas jugables integran el co-op con el **mismo patrón** host-autoritativo. `PuzzleScene`
(Desafío) fue la primera; `LevelScene` (Explorar) la replica y adapta a sus sistemas propios.

## Flujo React → Phaser

1. `CoopLobby` (React) crea/une la sala vía `coopSession`. Al comenzar:
   - Host: `coopSession.sendStart(levelId)` + `onStartLevel(levelId, { role: "host", code })`.
   - Guest: recibe `onStart` → `onStartLevel(levelId, { role: "guest", code })`.
2. `App.startGame(levelId, coop?)` emite `START_GAME` con `coop`.
3. `MainMenuScene` reenvía `{ levelId, coop }` a `PuzzleScene` o `LevelScene` según el id.
4. La escena, en `create()`, activa el modo red **solo si** `coop && coopSession.isActive`.

## Ciclo de `update()` por rol

| Rol | Qué hace cada frame |
|---|---|
| **single** | Igual que antes del co-op (sin cambios). |
| **host** | Lee input local (slot A) + `consumeRemoteInputFrame` (slot B) → mueve ambos → simula mundo → `maybeSendSnapshot`. |
| **guest** | `updateGuest`: empaqueta y envía su input; aplica el último snapshot (`applySnapshot`) + `emitGuestHud`. No simula. |

`pauseJustPressed` en co-op → **salir de la sesión** (`leaveCoop`), porque pausar la escena
desincronizaría al peer.

## Helpers compartidos (existen en ambas escenas)

| Helper | Función |
|---|---|
| `forEachPlayer(cb)` | Itera `player` (slot 0) y `player2` (slot 1). Base de colisiones y daño por jugador. |
| `nearestPlayerTo(enemy)` | Objetivo del enemigo = jugador más cercano (solo host). |
| `freezePuppet(obj)` | `body.enable = false` en el guest para no simular localmente. |
| `bindCoopNet` | Suscribe input (host), snapshot (guest), `end` y `peerLeft`. |
| `consumeRemoteInputFrame` | Reconstruye `justPressed` del input sostenido del guest. |
| `toNetPlayer` / `applyNetPlayer` | Serializa / aplica (interpolado) el estado de un jugador. |
| `maybeSendSnapshot` / `buildSnapshot` / `applySnapshot` | Envío/armado/aplicación de snapshots. |
| `emitGuestHud` | El guest arma su HUD desde el snapshot de **su** personaje (slot B). |
| `handleRemoteEnd` / `leaveCoop` / `endCoopToMenu` | Gestión de fin de sesión. |
| `finalizeCompletion` | Bookkeeping de nivel completado, compartido host/guest. |

## Qué se sincroniza (tabla por modo)

| Entidad | Desafío (`PuzzleScene`) | Explorar (`LevelScene`) |
|---|---|---|
| Jugadores (x,y,estado,vida,cargas) | ✅ `NetPlayerState` | ✅ `NetPlayerState` |
| Enemigos | ✅ `[netId,x,y]` | ✅ `[netId,x,y,flip]` (M0/M1/M2/M3) |
| Cajas empujables | ✅ posiciones | — |
| Placas/palancas/sellos/puertas/portal | ✅ (`active[]`, `gatesOpen[]`, `sealsAlive[]`, `goalOpen`) | — |
| Plataformas móviles | — | ✅ `[netId,x,y]` |
| Peligros móviles | — | ✅ `[netId,x,y]` |
| Monedas / corazones / caja de recompensa | monedas ✅ | ✅ (índices presentes + caja) |
| Checkpoint | — | ✅ (`checkpointActive`) |
| Línea de presión roja | — | ✅ (`pressureX`, sigue al más atrasado) |
| Tiempo restante | ✅ | ✅ |

Identidad estable: cada entidad sincronizada lleva `setData("netId", i)` (o `coinIndex` /
`heartIndex`) para casarla aunque cambie el orden o se destruya.

## Objetivos concurrentes (solo Desafío)

`PuzzleActivationSystem` (mapa `Map<PuzzleActivationId, Set<string>>`) ya soportaba múltiples
participantes. El host alimenta placas/palancas por `"player-1"` / `"player-2"`; el guest refleja
el conjunto `active` del snapshot. Así ambos pueden activar objetivos en simultáneo sin conflicto.

## Colisiones y daño por jugador

- Los `collider` físicos se registran **siempre** (en el guest los cuerpos congelados no reaccionan).
- Los **efectos** de gameplay (daño, recolección, meta, checkpoint) se resuelven solo en
  host/single (`const fx = !this.isGuest`); el guest los recibe por snapshot.
- El daño es por slot (`damagePlayerSlot(player, slot, amount)`). El **destello/sacudida local**
  solo se dispara para el personaje del cliente (slot A en host/single; el guest lo dispara al
  detectar la baja de su propia vida en el snapshot).
- Vida independiente por jugador. Cargas del slot B: el host las siembra en `p2Charges` desde su
  propio save (el gasto en co-op **no** se persiste al save del guest).

## Fin de partida (compartido)

- **Derrota:** muerte de cualquiera o tiempo agotado → `finishWithDefeat` (marca a ambos, en
  Explorar va a `GameOverScene`). El host transmite `end("lost")`; el guest lo refleja en
  `handleRemoteEnd`.
- **Victoria:** llegar a la meta con objetivos cumplidos → `completeLevel`/`finalizeCompletion`.
  El host transmite `end("won")`; cada cliente hace su **propio** bookkeeping de guardado y emite
  `LEVEL_COMPLETED` para ver el resumen.
- **Salida:** `leave`/`peerLeft` → ambos vuelven al menú (`endCoopToMenu`).

## Especificidades de Explorar (`LevelScene`)

- **Cámara:** en co-op se usa `startFollow(localPlayer)` (independiente). En single-player la
  cámara se mueve manualmente por la presión (`updateCameraPressure`) — eso **no se toca**.
- **Presión co-op** (`updateCoopPressure`): la línea es un objeto de mundo que avanza a
  `autoScrollSpeed` pero se clampa para no superar `min(player.x, player2.x) − COOP_PRESSURE_MARGIN`
  (`560`). Nunca mata al instante; solo penaliza retroceder. Cooldown de daño por slot.
- **Pozos:** respawn por jugador anclado a su propia `x` (`handlePitFall(player, slot)`); en
  single-player conserva el respawn anclado a la vista.
- **Sin checkpoint persistente** en co-op: ambos arrancan en el inicio del nivel.
