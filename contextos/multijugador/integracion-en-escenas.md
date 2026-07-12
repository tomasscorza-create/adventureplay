# 🎮 Integración del co-op en las escenas

Ambas escenas jugables integran el co-op con el **mismo patrón** host-autoritativo. `PuzzleScene`
(Desafío) fue la primera; `LevelScene` (Explorar) la replica y adapta a sus sistemas propios.

## Flujo React → Phaser

1. `CoopLobby` (React) crea/une la sala vía `coopSession`. Al comenzar (ambos incluyen `localSlot`):
   - Host: `coopSession.sendStart(levelId)` + `onStartLevel(levelId, { role: "host", code, localSlot })`.
   - Guest: recibe `onStart` → `onStartLevel(levelId, { role: "guest", code, localSlot })`.
2. `App.startGame(levelId, coop?)` emite `START_GAME` con `coop`.
3. `MainMenuScene` reenvía `{ levelId, coop }` a `PuzzleScene` o `LevelScene` según el id.
4. La escena, en `create()`, activa el modo red **solo si** `coop && coopSession.isActive`, crea su
   `CoopSceneLink<Snapshot>` y guarda `coopSelfSlot = coop.localSlot`. `createPlayer` instancia un
   `Player` por entrada del `coop.roster` (slot 0 → `this.player`; slots 1..N-1 → `remotePlayers[]`
   con sus `remoteMovement[]`/`remoteCharges[]` hermanos).

## Ciclo de `update()` por rol

| Rol | Qué hace cada frame |
|---|---|
| **single** | Igual que antes del co-op (sin cambios). |
| **host** | Lee input local (slot 0) + `coopLink.consumeRemoteInputFrame(slot)` por cada guest de `remotePlayers` → mueve a todos → simula mundo → `coopLink.maybeSendSnapshot`. |
| **guest** | `updateGuest`: `coopLink.sendLocalInput(time, frame)`; aplica `coopLink.latestSnapshot` (`applySnapshot` recorre `allPlayers()`) + `emitGuestHud`. No simula. |

`pauseJustPressed` en co-op → emite `SCREEN_CHANGED "coop-exit-confirm"`: la partida **sigue
corriendo** detrás de una confirmación React (`CoopExitConfirmScreen`), porque pausar la escena
desincronizaría al peer. "Salir" avisa al peer vía `GO_TO_MENU` → `coopLink.finish("left")`.

La **tienda de cargas** en co-op funciona igual (sin pausar): `PAUSE_FOR_POWER_SHOP` solo cambia la
pantalla. Al volver (`RESUME_GAME` con escena sin pausar), `syncCoopPurchases` refresca ORO y
cargas desde el save fresco (sin reemplazar `this.save`) y, si compró un guest, envía el delta al
host (`coopLink.sendChargeDelta` → hook `onRemoteCharges` suma a `remoteCharges[slot-1]`).

## Plumbing de red compartido (`CoopSceneLink`)

Toda la mecánica de red común vive en `CoopSceneLink<TSnapshot>` (fuera de Phaser, testeable con
transporte inyectado). La escena solo aporta cómo construir/aplicar su snapshot.

| Miembro del link | Función |
|---|---|
| `bind({ onRemoteEnd, onPeerLeft, ... })` | Suscribe input, snapshot, fin y ciclo de desconexión/reconexión por slot. |
| `consumeRemoteInputFrame(slot)` | Reconstruye `justPressed` del input del guest en ese slot (flancos + acumulados). |
| `sendLocalInput(time, frame)` | Guest: envía al cambiar + keepalive, estampando su `localSlot`. |
| `maybeSendSnapshot(time, build)` | Host: throttle 20 Hz + numeración de `seq`. |
| `latestSnapshot` | Guest: último snapshot aceptado (dedupe por `seq`). |
| `finish(reason)` / `markEnded()` / `dispose()` | Guardas de fin de sesión (una sola vez) y limpieza. |

## Helpers de escena (en ambas escenas)

| Helper | Función |
|---|---|
| `allPlayers()` / `playerAtSlot(slot)` | Arreglo de jugadores en orden de slot / acceso por slot. |
| `forEachPlayer(cb)` | Itera `player` (slot 0) y cada `remotePlayers[i]` (slot i+1). Base de colisiones y daño por jugador. |
| `nearestPlayerTo(enemy)` | Objetivo del enemigo = jugador más cercano de N (solo host). |
| `freezePuppet(obj)` | `body.enable = false` en el guest para no simular localmente. |
| `bindCoopNet` | Conecta los hooks de la escena al `coopLink`. |
| `toNetPlayer` / `applyNetPlayer` | (En `coopPlayerNet.ts`) serializa / aplica interpolado el estado de un jugador. |
| `buildSnapshot(seq)` / `applySnapshot` | Armado/aplicación del snapshot específico de la escena. |
| `emitGuestHud` | El guest arma su HUD desde el snapshot de **su** slot (`coopSelfSlot`). |
| `handleRemoteEnd` / `endCoopToMenu` | Gestión de fin de sesión. |
| `finalizeCompletion` | Bookkeeping de nivel completado, compartido host/guest. |

## Qué se sincroniza (tabla por modo)

| Entidad | Desafío (`PuzzleScene`) | Explorar (`LevelScene`) |
|---|---|---|
| Jugadores (x,y,estado,vida,cargas) | ✅ `players[]` (`NetPlayerState` por slot) | ✅ `players[]` por slot |
| Proyectiles de poder letal | ✅ `[netId,x,y,dir]` | ✅ `[netId,x,y,dir]` |
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

`PuzzleActivationSystem` (mapa `Map<PuzzleActivationId, Set<string>>`) soporta múltiples
participantes. El host alimenta placas/palancas por `participantForSlot(slot)` (`"player-1"`,
`"player-2"`, …); el guest refleja el conjunto `active` del snapshot. Así todos pueden activar
objetivos en simultáneo sin conflicto.

## Colisiones y daño por jugador

- Los `collider` físicos se registran **siempre** (en el guest los cuerpos congelados no reaccionan).
- Los **efectos** de gameplay (daño, recolección, meta, checkpoint) se resuelven solo en
  host/single (`const fx = !this.isGuest`); el guest los recibe por snapshot.
- El daño es por slot (`damagePlayerSlot(player, slot, amount)`). El **destello/sacudida local**
  solo se dispara para el personaje del cliente (slot 0 en host/single; el guest lo dispara al
  detectar la baja de su propia vida en el snapshot, leída en `coopSelfSlot`).
- **Nivel perfecto por jugador:** `damageTakenThisLevel` se marca solo por el daño del personaje
  local (el del compañero no arruina el logro del host). El guest, que no simula, lo marca al
  detectar su propia baja en el snapshot.
- Vida independiente por jugador. Cargas de cada guest: el host las siembra en `remoteCharges[]`
  desde su propio save (el gasto en co-op **no** se persiste al save del guest).

## Fin de partida (compartido)

- **Derrota:** muerte de cualquiera o tiempo agotado → `finishWithDefeat` (marca a ambos, la escena queda viva y ya no pasa por `GameOverScene`). El host transmite `end("lost")`; el guest lo refleja en
  `handleRemoteEnd`.
- **Victoria:** llegar a la meta con objetivos cumplidos → `completeLevel`/`finalizeCompletion`.
  El host transmite `end("won")`; cada cliente hace su **propio** bookkeeping de guardado y emite
  `LEVEL_COMPLETED` para ver el resumen.
- **Salida individual:** el `end("left")` lleva el slot del que se va. Una desconexión súbita
  primero suspende la entidad y reserva su slot durante 30 segundos. Si vuelve, la entidad se
  reactiva y recibe un snapshot completo; si vence la ventana, la salida se vuelve definitiva. En
  salas de 3-4 los restantes continúan; si expira el host o la sala es de 2, todos vuelven al menú.
- **Siguiente nivel (encadenado):** solo el host avanza con `Próximo` → `startNextCoopLevel` reenvía
  `start` con el roster vigente de `coopSession.participants` (compactado si alguien abandonó) y
  reinicia su escena con `keepCoopSessionOnShutdown = true` para no cerrar la sala; el guest recibe
  el `start` por el hook `onStartNextLevel` del link (solo si `levelFinished`) y lo sigue. La UI de fin de partida desactiva los botones de avance para el guest, mostrando "Esperando al anfitrion…".

## Especificidades de Explorar (`LevelScene`)

- **Cámara:** en co-op se usa `startFollow(localPlayer)` (independiente). En single-player la
  cámara se mueve manualmente por la presión (`updateCameraPressure`) — eso **no se toca**.
- **Presión co-op** (`updateCoopPressure`): la línea es un objeto de mundo que avanza a
  `autoScrollSpeed` pero se clampa para no superar `min(x de todos los jugadores) −
  COOP_PRESSURE_MARGIN` (`560`). Nunca mata al instante; solo penaliza retroceder. Cooldown de daño
  por slot (`pressureCooldownSlot0` + `remotePressureCooldown[]`).
- **Pozos:** respawn por jugador anclado a su propia `x` (`handlePitFall(player, slot)`); en
  single-player conserva el respawn anclado a la vista.
- **Sin checkpoint persistente** en co-op: ambos arrancan en el inicio del nivel.

## ⚠️ Advertencia sobre Pruebas (Test Coverage)

La semántica de predicción local, degradación de colisiones e interpolación descrita en este documento **no está cubierta por la suite de tests automatizados** (como se detalla en la [auditoría](file:///c:/Users/usuario/Desktop/adventureplay/contextos/multijugador/auditoria-y-plan-2026-07.md)). Cualquier modificación en la lógica de las escenas (`updateGuest`, colisiones con cajas, etc.) debe ser probada rigurosamente con QA manual de 2 a 4 clientes reales.
