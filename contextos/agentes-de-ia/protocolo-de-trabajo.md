# 🤖 Protocolo de Colaboración (Para IA)

*Reglas obligatorias para subagentes o futuras sesiones.*

## 1. Prioridades en Conflictos
1. La orden estricta dada por el Humano (`USER`).
2. Lo documentado en `AGENTS.md` (raíz).
3. Lo que dicte el código fuente existente en `main`.
4. Lo indicado en estos archivos de la carpeta `contextos/`.

## 2. Buenas prácticas de Arquitectura en AP
- Nunca agregues datos fijos (hardcode) a las escenas. Siempre usa `src/game/data/`.
- No añadas renders o HTML superpuesto en Canvas. Si la interfaz no debe moverse junto con la cámara del jugador, hazlo en React (`src/ui/`).
- Evita incrementar el bundle size: Si usas nuevos audios/imágenes, pásalos por tinypng/webp antes, o advierte al usuario.

## 3. Manejo del Tooling
- Validar siempre antes de hacer commit:
  `npm run check` (Ejecuta linter, tsc, vitest y 3 scripts locales de validación de datos del juego).
- Archivos conflictivos conocidos: `LevelScene.ts` y `PuzzleScene.ts`. Son de ~60KB. Usá `multi_replace_file_content` o regex precisos, evita reemplazar todo el archivo.

## 4. Estructura de Contexto
- Estos archivos en la carpeta `contextos/` están hechos para **Búsqueda Rápida**. No metas "fluff" o párrafos de más. Agrega viñetas y tablas.
