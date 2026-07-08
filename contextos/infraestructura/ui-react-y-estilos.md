# ⚛️ UI React y Estilos

El juego delega **TODA** la interfaz que no es de gameplay activo a React.

## 1. Estados Globales de `App.tsx`
React orquesta la aplicación montando diferentes componentes basados en el estado principal (string):
- `"intro"`: Video introductorio de 4s (mp4).
- `"auth"`: Pantalla Login/Registro con Supabase Auth.
- `"boot"`: Cargador diferido de Phaser.
- `"menu"`: Menú principal (React).
- `"playing"`: HUD y controles táctiles (Phaser visible).
- `"paused"`: Menú de pausa overlay.
- `"gameover"`: Resultado derrota.
- `"victory"`: Resultado victoria estándar.
- `"summary"`: Resumen de etapa animado.
- `"powershop"`: Tienda overlay durante pausa/gameplay.

## 2. Comunicación con Phaser
React y Phaser no comparten referencias directas. Usan el Singleton de `EventBus.ts`.
- Phaser avisa que actualizó la vida: `EventBus.emit("HUD_UPDATE", hudState)`. React re-renderiza `<HUD />`.
- React avisa que se reanuda el juego: `EventBus.emit("RESUME_GAME")`. Phaser quita la pausa a la escena.
- Ver `/contextos/arquitectura/comunicacion-phaser-react.md` para detalles.

## 3. Estilos y CSS
Ubicado en `src/styles/`. Vanilla CSS, **no Tailwind**. Orientado a variables CSS.
- `foundation.css` (46 KB): Variables root (colores, padding), utilidades base y breakpoints.
- `main-menu.css` (41 KB): Pantalla inicial, animaciones de hojas, destellos.
- `adventure-menu.css` (56 KB): Menús internos (inventario, personajes, logros).
- `gameplay.css` (62 KB): HUD, barra de vida, controles táctiles.

**Regla CSS**: Todo nuevo componente React debe usar variables existentes definidas en `foundation.css`. No usar HEX en línea a menos que sea muy específico.
