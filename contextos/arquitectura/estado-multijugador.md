# 🌐 Estado Multijugador (Co-op)

El juego cuenta con un modo cooperativo funcional, enfocado en el **Modo Desafío (Puzzles)**.  
Actualmente, la infraestructura de red, la sincronización de Phaser y la interfaz de Lobby ya están implementadas.

## 1. Arquitectura de Red y Lobby
- **Sistemas Independientes:** Toda la lógica de red vive fuera de Phaser, en `src/game/systems/net/`.
- **CoopSession:** Singleton puro que maneja la conexión a la base de datos o socket remoto (actualmente preparado para Supabase). Mantiene el estado del rol (`host` o `guest`).
- **CoopLobby (UI React):** Los jugadores se encuentran en `src/ui/screens/main-menu/CoopLobby.tsx`, donde pueden:
  - Crear una sala (generando un código único).
  - Unirse mediante el código de la sala.
  - Seleccionar el nivel de desafío una vez conectados.

## 2. Sincronización en Phaser (`PuzzleScene.ts`)
- **Player 2 Instanciado:** La escena instancia a dos jugadores. El jugador principal local usa los stats de tu partida guardada. El segundo jugador (el compañero) recibe su posición desde la red y sus animaciones son interpoladas (`applyNetPlayer`).
- **Validación Conjunta:** Las cajas (`crates`) validan colisiones para ambos jugadores simultáneamente usando `this.forEachPlayer()`, evitando bugs donde un jugador atraviesa las cajas.
- **Cámara Compartida (`CameraSystem.ts`):** En lugar de seguir al jugador local, la cámara sigue dinámicamente un punto medio (`midpoint`) entre el Jugador 1 y el Jugador 2, adaptando su vista para mantener a ambos en pantalla.
- **Gestión de Sesión:** Si el compañero gana, pierde o abandona la partida, la red captura los eventos `handleRemoteEnd` y `leaveCoop` y los refleja en tiempo real en la sesión local.

## 3. Resolución Concurrente de Puzzles
- **`PuzzleActivationSystem.ts`:** El sistema está basado en un mapa concurrente (`Map<PuzzleActivationId, Set<string>>`). Esto asegura que ambos jugadores pueden presionar placas de presión o jalar palancas simultáneamente sin conflictos de estado en la red.
- Las físicas deterministas locales se combinan con interpolación de red en el cliente del invitado (`guest`), que deshabilita sus propias gravedades para ser guiado por los datos autoritativos del anfitrión (`host`).

## ⚠️ Lo que Falta / Siguientes Pasos
- Completar la configuración del backend de Supabase en producción para emitir las tablas en tiempo real (si no está activo).
- Pulir el HUD local para que muestre claramente el ícono y vida del compañero en una esquina secundaria.
- Añadir un ping/chat básico para la coordinación sin voz.

---

## 📜 Historial de Implementación por Agentes (08 de Julio de 2026)
- **Claude (Agente):** Construyó desde cero toda la infraestructura de red (`CoopSession`, eventos, `CoopLobby.tsx`) y adaptó el motor de `PuzzleScene` para interpolar jugadores, congelar gravedad remota y centralizar el manejo de cámara multijugador (`followMidpoint`).
- **Antigravity / Gemini (Agente actual):** Conectó visual y lógicamente el `CoopLobby` al botón inactivo del menú "Desafío" en React, haciéndolo finalmente accesible para el usuario. También reescribió este documento para reflejar la infraestructura ya implementada en lugar de tratarla como un "plan futuro".
