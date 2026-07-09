# 🧭 Decisiones, limitaciones e historial

## Decisiones de diseño (con su porqué)

| Decisión | Por qué |
|---|---|
| **Host-autoritativo** (no P2P lockstep, no predicción de cliente) | Simple y robusto para co-op de exploración/ingenio; una sola fuente de verdad para físicas. |
| **Supabase Realtime** como transporte | Ya estaba configurado; cero infraestructura nueva, sin tablas/RLS/servidor. |
| **Cámara independiente por dispositivo** | Permite que cada jugador explore libremente sin que la cámara del otro lo limite. Reemplazó a una cámara de punto medio compartida (ver historial). |
| **Fin de partida compartido** | Co-op cooperativo: si uno cae o se agota el tiempo, ambos pierden; la meta se gana juntos. |
| **Presión (Explorar) sigue al jugador más atrasado** | Con cámaras independientes, una línea atada a cámara mataría al que se queda atrás. Anclarla al más lento conserva la mecánica sin castigar la exploración. Decisión explícita del usuario. |
| **Cargas de poder/vida no persistidas en co-op** | Evita doble contabilidad entre dos saves; el host mantiene contadores vivos para el HUD. |
| **Co-op por nivel** | Continuar/reintentar desde el resumen sale del co-op (la sesión de red se cierra en el `SHUTDOWN` de la escena). Mantiene el alcance acotado. |
| **Modo red solo con `coop` presente** | Garantiza regresión cero: single-player de Explorar y Desafío quedan idénticos. |
| **Versión de protocolo + presence por clientId** | La versión evita que builds incompatibles emparejen en silencio (aviso claro). La key por clientId (no por rol) permite más de un guest y evita colisiones. |
| **Modelo de slots (protocolo N-ready antes que gameplay N)** | Separar la generalización del protocolo (slots, `players[]`, input con emisor) del render de 3-4 jugadores permite subir versión una sola vez y validar el modelo con tests, manteniendo el gameplay de 2 idéntico. |
| **Plumbing en `CoopSceneLink`** | Deduplicación, flancos, throttling y guardas de fin viven en un solo lugar testeable, no duplicados en cada escena. |

## Limitaciones conocidas

- **Latencia del guest:** al ser host-autoritativo sin predicción, el guest ve un pequeño retraso
  en su propio personaje. Aceptable para co-op de ingenio/exploración; no para acción competitiva.
- **Poses finas de M2/M3 en el guest son aproximadas:** se sincroniza posición y `flipX`, no cada
  pose de ataque. El **daño es autoritativo del host**, así que la jugabilidad es correcta aunque
  la animación puntual difiera.
- **Sin reconexión automática ni anti-cheat.**
- **Ambos clientes deben apuntar al mismo proyecto Supabase.**
- **Gameplay acotado a 2 jugadores:** el protocolo y la sesión ya usan slots N-ready, pero las
  escenas todavía instancian `player`/`player2` fijos y `COOP_MAX_PLAYERS = 2`. Renderizar 3-4 es
  la fase siguiente.
- **Pausa real no sincronizada:** en co-op no se puede pausar; solo existe la confirmación de
  salida. Una pausa acordada entre peers queda pendiente.

## Historial de implementación (cronología)

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
   `CoopSceneLink`. Gameplay sigue siendo de 2 jugadores, idéntico, sobre el nuevo modelo.

## Continuidad / próximos pasos sugeridos

- **Fase 3 — gameplay y lobby 3-4 jugadores:** reemplazar `player`/`player2` fijos por un arreglo,
  cooldowns/cargas por slot, presión sobre el más atrasado de N, lobby con lista de participantes y
  límite de sala. Subir `COOP_MAX_PLAYERS`.
- **Fase 4 — costo y robustez:** delta-encoding de snapshots, revisar cuotas de Supabase Realtime,
  reconexión ante caídas, pausa co-op acordada, sala llena / expulsión.
- **HUD del compañero:** mostrar ícono y vida del otro jugador en una esquina secundaria.
- **Predicción de cliente** para el personaje del guest (reduce la latencia percibida).
- **Estados de animación finos** de enemigos complejos en el guest.

## Archivos clave (para retomar)

- Red: `src/game/systems/net/CoopSession.ts`, `coopMessages.ts`, `levelCoopMessages.ts`,
  `CoopSceneLink.ts`, `coopPlayerNet.ts`, `CoopProjectilePuppets.ts`.
- Tests de red: `coopMessages.test.ts`, `CoopSceneLink.test.ts`.
- Escenas: `src/game/scenes/PuzzleScene.ts`, `src/game/scenes/LevelScene.ts`.
- Entidad: `src/game/entities/player/Player.ts` (`renderNetState`).
- Cámara: `src/game/systems/camera/CameraSystem.ts`.
- UI: `src/ui/screens/main-menu/CoopLobby.tsx`, `ChallengeView.tsx`, `ExploreView.tsx`,
  `src/ui/screens/MainMenuScreen.tsx`, `src/ui/screens/CoopExitConfirmScreen.tsx`; estilos en
  `src/styles/challenge-mode.css`.
- Eventos: `src/game/events/EventBus.ts` (`START_GAME.coop`), `src/game/scenes/MainMenuScene.ts`.
