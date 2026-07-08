# 🧩 Modos de Juego: Modo Desafío (Challenge)

Es el modo orientado a puzzles. Controlado por `PuzzleScene.ts` (54KB).
Total de **14 niveles encadenados** ("cámaras de ingenio").

## 1. Diferencias Clave con Explorar
- **Sin Auto-Scroll**: Tienes libertad de moverte por toda la cámara.
- **Mecánicas Interactivas Ambientales**: Cajas de peso, placas de presión en suelo, palancas golpeables y sellos mágicos destructibles.
- **Enemigos Opcionales / Obstáculo**: A partir del reciente update, hay M0 y M1. Pero el objetivo principal NO es derrotar enemigos, sino abrir la `Goal Gate`.
- **Tema Visual Dinámico y Parallax**: `PuzzleVisualPalette` calcula los colores de las plataformas basados en el color extraído del fondo de la cámara (HSL). Además, ciertos niveles (ej. 12, 13 y 14) utilizan imágenes WebP optimizadas con un efecto de `Parallax Scrolling` real sincronizado con la cámara.

## 2. Activadores (PuzzleActivationSystem)
Es un sistema diseñado para *posible modo multijugador futuro*.
- Para completar el nivel, TODOS los requerimientos de la cámara deben estar en estado `active`.
- Una palanca funciona como un *Toggle* o *Hold*.
- Una Placa de Presión requiere masa encima (jugador, enemigo, caja).
- **Multijugador:** El sistema está completamente conectado a la red. Permite que múltiples héroes (Host y Guest) validen y activen palancas y placas al unísono de forma determinista.

## 3. Física Avanzada
- Las **cajas son apilables** (`crates vs crates` collider activado).
- Los enemigos pueden ser usados para presionar placas de presión.
- La física de PuzzleScene procesa `overlap` con "stomp detection" permitiendo al jugador saltar y aplastar cajas o enemigos como herramienta para resolver el puzzle.

## 4. Logros del Modo
El jugador gana el logro exclusivo `"first-puzzle"` ("Mente y acero") al completar la Cámara 1.

---

## 📜 Historial de Implementación por Agentes (08 de Julio de 2026)
- **Claude (Agente):** Integró la arquitectura cooperativa multijugador base permitiendo que dos entidades interactúen con físicas y activadores al unísono.
- **Antigravity / Gemini (Agente actual):** Construyó el efecto `Parallax Scrolling` para los fondos en escenarios avanzados (12, 13, 14), realizando la ampliación física de las fuentes de arte, optimización a formato WebP y la lógica de alineamiento visual y scroll fraccionado en el motor (`PuzzleScene.ts`).
