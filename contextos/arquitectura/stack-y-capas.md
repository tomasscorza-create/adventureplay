# 🧩 Arquitectura, Stack y Capas

Adventure Play usa una estructura moderna, estricta y monolítica modularizada en el frontend.

## Stack
- **Motor Gameplay**: Phaser 3.90
- **UI & Framework**: React 19
- **Build & Server**: Vite 6
- **Lenguaje**: TypeScript 5.8 (Modo Estricto, ESNext)
- **Backend / Auth**: Supabase
- **Empaquetado App**: PWA (Service Workers, offline cache)

## Organización por Capas (src)

### 1. `src/ui/` (Capa de Presentación React)
Contiene **todas** las vistas fuera del juego. No manipula mecánicas, solo llama métodos de lectura/mutación global (como de Supabase) o emite eventos al EventBus.
- `/screens/`: Vistas de app (`MainMenuScreen`, `GameOverScreen`).
- `/components/`: Reutilizables (`MobileControls`, `HUD`).
- `/hooks/`: e.g. `usePhaserGame` (instancia lazy de Phaser).

### 2. `src/game/` (Motor Core)
Phaser se instancia aquí, diferido hasta pasar el logueo.
- `/scenes/`: `LevelScene` (Explorar), `PuzzleScene` (Desafío), `PreloadScene`.
- `/entities/`: `Player`, `BaseEnemy`, `M3Enemy`. Controlan representación visual de Phaser y cuerpo Arcade.
- `/data/`: **Capa Data-Driven** (vital). Los enemigos, niveles y puzzles no se hardcodean, se definen en estos `.ts`.
- `/systems/`: Subsistemas independientes (12 en total) para evitar aglomeración.

### 3. Sistemas Activos (`src/game/systems/`)
La lógica se delega a sistemas:
1. `input/`: `GameplayInputSystem`, `TouchInputStore` (soporte híbrido teclado/pantalla táctil).
2. `combat/`: Resolución de ataque melee/giro.
3. `save/`: Guardado local + Supabase.
4. `camera/`: Comportamiento de follow + dead zones.
5. `movement/`: Físicas aplicadas de salto y correr.
6. `physics/`: Colliders base.
7. `enemies/`: `EnemySpawner` lee Data layer y genera `BaseEnemy` instanciados.
8. `inventory/`: Loot de monedas y corazones.
9. `progression/`: Lógica de XP y subida de nivel.
10. `projectiles/`: Gestión de disparos Letales.
11. `puzzles/`: `PuzzleActivationSystem` (máquina de estado puro de mecanismos para Modo Desafío).
12. `achievements/`: `AchievementSystem` (validación continua de los 21 logros).
