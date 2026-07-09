# 🌐 Estado Multijugador (Co-op)

> 📖 **Guía completa y actualizada:** `contextos/multijugador/` (arquitectura de red,
> integración en escenas, decisiones, limitaciones e historial). Este archivo es solo un resumen.

> 🏆 **Hito Logrado (08 Julio 2026)**: Primera conexión multijugador exitosa funcionando de manera remota a través del despliegue (Deploy). El modo cooperativo ya es una realidad tangible.

El juego cuenta con un modo cooperativo funcional en **ambos modos jugables**: **Desafío**
(`PuzzleScene`) y **Explorar** (`LevelScene`). La infraestructura de red, la sincronización de
Phaser y la interfaz de Lobby están implementadas.

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
- **Cámara Independiente por dispositivo (`CameraSystem.ts`):** cada pantalla sigue a su propio personaje local (guest → `player2`, host/single → `player`), para que ambos exploren libremente. (Antes seguía un punto medio compartido; ese enfoque `followMidpoint`/`midpoint` fue removido.)
- **Gestión de Sesión:** Si el compañero gana, pierde o abandona la partida, la red captura los eventos `handleRemoteEnd` y `endCoopToMenu` y los refleja en tiempo real en la sesión local. Salir voluntariamente pasa por la confirmación `coop-exit-confirm` (la escena no se pausa).
- **Modelo de slots (protocolo N-ready):** el input lleva el slot del emisor, `players` del snapshot es un arreglo por slot y `CoopSession` expone `localSlot`/`participants`. El gameplay usa 2 (`player` = slot 0, `player2` = slot 1); el protocolo ya admite más.

## 3. Resolución Concurrente de Puzzles
- **`PuzzleActivationSystem.ts`:** El sistema está basado en un mapa concurrente (`Map<PuzzleActivationId, Set<string>>`). Esto asegura que ambos jugadores pueden presionar placas de presión o jalar palancas simultáneamente sin conflictos de estado en la red.
- Las físicas deterministas locales se combinan con interpolación de red en el cliente del invitado (`guest`), que deshabilita sus propias gravedades para ser guiado por los datos autoritativos del anfitrión (`host`).

## ⚠️ Siguientes Pasos
- **Fase 3:** gameplay y lobby para 3-4 jugadores (reemplazar `player`/`player2` fijos por arreglo, cooldowns/cargas por slot, presión sobre el más atrasado de N, lista de participantes). Subir `COOP_MAX_PLAYERS`.
- **Fase 4:** costo y robustez (delta-encoding, cuotas de Supabase, reconexión, pausa co-op acordada).
- Pulir el HUD local para que muestre claramente el ícono y vida del compañero en una esquina secundaria.

---

## 📜 Historial de Implementación por Agentes (08 de Julio de 2026)
- **Claude (Agente):** Construyó desde cero toda la infraestructura de red (`CoopSession`, eventos, `CoopLobby.tsx`) y adaptó el motor de `PuzzleScene` para interpolar jugadores, congelar gravedad remota y centralizar el manejo de cámara multijugador (`followMidpoint`).
- **Antigravity / Gemini (Agente actual):** Conectó visual y lógicamente el `CoopLobby` al botón inactivo del menú "Desafío" en React, haciéndolo accesible para el usuario, y registró el **primer hito funcional en entorno de despliegue real** validado por el usuario.
