# 🧩 Modos de Juego: Modo Desafío (Challenge)

Es el modo orientado a puzzles. Controlado por `PuzzleScene.ts` (54KB).
Total de 7 niveles encadenados ("cámaras de ingenio").

## 1. Diferencias Clave con Explorar
- **Sin Auto-Scroll**: Tienes libertad de moverte por toda la cámara.
- **Mecánicas Interactivas Ambientales**: Cajas de peso, placas de presión en suelo, palancas golpeables y sellos mágicos destructibles.
- **Enemigos Opcionales / Obstáculo**: A partir del reciente update, hay M0 y M1. Pero el objetivo principal NO es derrotar enemigos, sino abrir la `Goal Gate`.
- **Tema Visual Dinámico**: `PuzzleVisualPalette` calcula los colores de las plataformas basados en un color complementario extraído del fondo de la cámara (HSL).

## 2. Activadores (PuzzleActivationSystem)
Es un sistema diseñado para *posible modo multijugador futuro*.
- Para completar el nivel, TODOS los requerimientos de la cámara deben estar en estado `active`.
- Una palanca funciona como un *Toggle* o *Hold*.
- Una Placa de Presión requiere masa encima (jugador, enemigo, caja).

## 3. Física Avanzada
- Las **cajas son apilables** (`crates vs crates` collider activado).
- Los enemigos pueden ser usados para presionar placas de presión.
- La física de PuzzleScene procesa `overlap` con "stomp detection" permitiendo al jugador saltar y aplastar cajas o enemigos como herramienta para resolver el puzzle.

## 4. Logros del Modo
El jugador gana el logro exclusivo `"first-puzzle"` ("Mente y acero") al completar la Cámara 1.
