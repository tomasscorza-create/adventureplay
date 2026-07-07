# Contexto para Agentes de IA: Adventure Play - Modo Desafío (Challenge)

**Archivo Principal**: `src/game/scenes/PuzzleScene.ts` (Separado e independiente de `LevelScene`)
**Tipo**: Puzzle-Plataformas 2D (Phaser 3). No hay enemigos.

## 1. Bucle Principal (Core Loop)
- **Objetivo**: Navegar cámaras estáticas (sin auto-scroll), resolver puzzles ambientales interactuando con mecanismos y abrir la reja metálica final antes de que termine el tiempo.
- **Condiciones de Derrota**: El tiempo llega a 0 o la vida llega a 0 (por trampas de picos/caídas).
- **Ausencia de Combate**: El contador de `monstersDefeated` es siempre 0. Los proyectiles se usan para activar palancas a distancia o romper sellos.

## 2. Cámaras de Ingenio (7 niveles)
Secuencia lineal definida en `src/game/data/puzzleLevels.ts`.
- **Tema Visual**: "Pruebas Antiguas". Progresión narrativa visual de noche a tesoro usando 6 fondos distintos.
- **Estética Dinámica**: `PuzzleVisualPalette.ts` extrae el color medio del fondo y genera una paleta HSL complementaria en tiempo de ejecución para teñir las plataformas y mecanismos.

## 3. Mecanismos de Puzzle
Extraídos dinámicamente de hojas de sprites sin fondo por `PreloadScene`.
- **Cajas**: Físicas Arcade completas. Empujables y apilables.
- **Placas de Presión**: Se activan cuando una caja entra en su zona. Si la caja sale, se desactivan.
- **Palancas**: Permanecen activas tras golpearlas. Pueden requerir impacto melee o proyectil (`rangedOnly`).
- **Puertas (Gates)**: Requieren un conjunto específico de activadores encendidos para abrirse.
- **Sellos Mágicos**: Barreras destructibles con ataques.
- **Jaula Meta (Goal Gate)**: Requiere TODOS los activadores de la sala + TODOS los sellos rotos.

## 4. Arquitectura de Activación (`PuzzleActivationSystem.ts`)
- Es una **máquina de estados pura** separada de Phaser.
- Rastrea qué identificador de participante (`participantId`, ej: "player-1", "crate-system") encendió qué activador.
- **Diseño Multi-jugador**: Preparado estructuralmente para modo cooperativo futuro (múltiples jugadores activando mecanismos independientes).

## 5. Progresión y Logros
- La dificultad aumenta agregando tamaño al nivel, limitando el tiempo e incrementando requerimientos de sellos y palancas a distancia.
- **Logro Exclusivo**: "Mente y acero" (ID: `first-puzzle`), concedido al completar la primera cámara.
- La experiencia y oro recolectados se integran al progreso global de la cuenta (esquema versión 17 de Supabase).
