# 🌐 Auditoría de Preparación Multijugador (Co-op)

El juego cuenta con un diseño arquitectónico base pensado para admitir juego cooperativo, específicamente dentro del **Modo Desafío (Puzzles)**. Sin embargo, actualmente **no existe una capa de red activa ni soporte de jugadores adicionales instanciados**. 

A continuación, se detalla el estado actual de los sistemas y qué falta construir para habilitar el multijugador funcional.

## 1. Lo que SÍ está construido (Base Cooperativa)

### El Sistema de Activación: `PuzzleActivationSystem.ts`
El mecanismo principal de resolución de puzzles fue diseñado desde cero pensando en múltiples entidades operando en paralelo. 
- **Lógica de Participantes Múltiples:** Usa un mapa `Map<PuzzleActivationId, Set<string>>`. Esto permite que una placa de presión sepa exactamente *quién* está encima de ella (ej. `player_1`, `player_2`, `crate_a`).
- **Estados concurrentes:** Si el Jugador 1 y el Jugador 2 se paran en la misma placa, el `Set` tiene dos IDs. Si el Jugador 1 se retira, el sistema sabe que la placa sigue presionada porque el Jugador 2 sigue en el `Set`. Esto evita "parpadeos" o estados inconsistentes de red.
- **Acoplamiento nulo de red:** El sistema es una máquina de estado puro (independiente de Phaser y del DOM), listo para ser alimentado por un futuro sistema de sincronización asíncrono o de red.

### Niveles Compatibles
Todos los niveles del Modo Desafío (`puzzleLevels.ts`) tienen un flag explícito ya activado:
`supportsCooperative: true`
Las áreas físicas de los mapas son lo bastante amplias como para acomodar 2 jugadores interactuando y saltando.

## 2. Lo que NO está construido (Trabajo Pendiente)

### Capa de Red (Network Layer)
- **Faltante:** No hay integración con `Socket.io`, `WebRTC`, o multijugador autoritativo mediante `Supabase Realtime` (o similar). No existe código que transmita las teclas pulsadas ni la posición física.

### Instanciación del Jugador Secundario
- **Faltante:** `LevelScene.ts` y `PuzzleScene.ts` instancian a un único héroe localmente. Falta una entidad `RemotePlayer` o `Player2` que reciba sus posiciones de la red y reproduzca interpolaciones.

### Cámara Compartida
- **Faltante:** Actualmente la `Camera` de Phaser sigue rígidamente al jugador 1. En un escenario cooperativo, la cámara tendría que usar zoom dinámico o hacer un seguimiento interpolado al punto medio entre dos jugadores (como en *Smash Bros* o *Spelunky*).

### UI de Sesión
- **Faltante:** React no tiene menús de "Crear Sala (Lobby)", "Unirse por Código" ni "Esperando a otro jugador". Tampoco hay un sistema que asigne el rol de "Host" o "Client".

---

## 💡 Recomendación para Futuros Agentes
Si se retoma la tarea de integrar el multijugador:
1. **No acoples el socket directamente dentro de Phaser.**
2. Delega la conexión de red a React o a un Singleton dedicado fuera de Phaser, el cual debe comunicarse mediante el `EventBus` compartiendo los inputs / posiciones hacia adentro del juego.
3. Aprovecha y amplía el `PuzzleActivationSystem` para emitir eventos de completado hacia ambos clientes sincronizadamente.
