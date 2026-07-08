# Auditoría Visual y de UI: AdventurePlay

Este documento detalla el estado actual de la interfaz de usuario, arquitectura de estilos, paleta de colores y componentes del proyecto base (`adventureplay`) para servir de mapa y planificar el pulido visual y de colores.

## 1. Arquitectura de UI y Paquetes
- **Librería principal:** React 19 + Vite.
- **Renderizado del Juego:** Phaser 3.90. (Phaser maneja el canvas jugable, React envuelve toda la UI interactiva como HUD, menús, tiendas, notificaciones, etc.).
- **Gestión de CSS:** Vanilla CSS puro, sin frameworks (Tailwind NO está instalado).
- **Iconografía:** No se detectan librerías de íconos pesadas en `package.json` (como FontAwesome o Lucide). Los componentes como `AbilityIcon.tsx`, `AchievementIcon.tsx` y `CombatActionIcon.tsx` manejan SVG inyectado, puro o mediante assets estáticos.
- **Responsive:** Se aplican consideraciones nativas en componentes (PWA Install/Update prompts, `OrientationNotice.tsx` para forzar landscape en móvil, `MobileControls.tsx` para touch).

## 2. Sistema de Estilos y Paleta (El sistema "Acero Etéreo")
Toda la base cromática está centralizada en `src/styles/foundation.css` a través de variables CSS nativas (`:root`). 
La estética actual es oscura, metálica y de "acero etéreo".

**Tipografías:**
- *Display (Títulos/Destacados):* **Cinzel** (serif clásico, elegante).
- *Body (Cuerpo/Lectura):* **Sora** (sans-serif moderno y limpio).

**Paleta de Fondos (Abisales/Nocturnos):**
- `--abyss`: `#05090f` (El fondo más oscuro, casi negro con tinte azulado).
- `--depth-1`: `#0a1220`
- `--depth-2`: `#0e1828`
- `--depth-3`: `#14243a` (Usado en elevaciones de paneles).

**Paleta de Textos:**
- `--ink`: `#e9f1fa` (Blanco azulado para texto regular).
- `--ink-strong`: `#f8fbff`
- `--muted`: `#93a7bd` (Textos secundarios).
- `--faint`: `#64798f` (Textos deshabilitados).

**Acentos de Color:**
- **Cian (Tema UI Principal/Selección):** `--cyan` (`#7fd8f2`), `--cyan-bright` (`#b5ecff`). Usado en botones, glows y selecciones (ej. al seleccionar un personaje).
- **Acero (Neutros fríos):** `--steel` (`#c3d3e4`).
- **Oro / Aurum (Economía, Destacados y Premium):** `--aurum` (`#e8c987`), `--aurum-bright` (`#f7e3b4`). Regla del AGENTS.md: Los textos visibles usan ORO.
- **Sanación (Heal):** `--heal` (`#7fe8b6`) para poderes de regeneración.
- **Peligro (Danger):** `--danger` (`#f3768c`) para daño o reset de cuenta.

**Efectos (Glassmorphism y Sombras):**
- Usa fuertemente fondos semitransparentes: `--glass` (`rgba(13, 21, 36, 0.82)`).
- Sombras profundas para separar la UI de Phaser: `--shadow-panel` (`0 24px 70px rgba(2, 6, 12, 0.55)`).
- Resplandores (Glows): `--glow-cyan` (`0 0 22px rgba(127, 216, 242, 0.16)`).

## 3. Estructura de Componentes React (`src/ui`)
La UI está dividida lógicamente entre **Pantallas (Screens)** y **Componentes (Components)**:

### Pantallas (`src/ui/screens`)
- `MainMenuScreen.tsx`: Extremadamente grande (43kb), maneja múltiples sub-vistas (exploración, inventario, personajes, logros).
- `LevelSummaryScreen.tsx`: Animada para mostrar estadísticas y progreso tras la meta.
- `PowerShopScreen.tsx`: UI de tienda flotante pausada durante el juego.
- `AuthScreen.tsx`, `GameIntroScreen.tsx`, `GameOverScreen.tsx`, `VictoryScreen.tsx`, `PauseScreen.tsx`.

### Componentes Flotantes y de HUD (`src/ui/components`)
- `HUD.tsx`: Muestra vidas, vida del boss, oro, XP.
- `MobileControls.tsx` y `AbilityControls.tsx`: Controles táctiles transparentes sobre el canvas.
- `AchievementUnlockToast.tsx` y `LevelUpToast.tsx`: Notificaciones emergentes estilo "brillo/pop-up".
- `SaveSyncStatus.tsx`: Indicador diminuto en esquina superior para el estado de Supabase.

## 4. Oportunidades de Pulido Visual y Modernización
Según los lineamientos de diseño premium solicitados, aquí hay áreas concretas para mejorar:

1. **Desacoplamiento de CSS:** Hay archivos muy grandes (ej. `main-menu.css` pesa 40KB y `gameplay.css` 62KB). Todo el CSS está concentrado en archivos monolíticos en vez de estar co-localizado con sus componentes.
2. **Micro-animaciones:** Hay transiciones CSS básicas (ej. `transform 520ms cubic-bezier(...)` en la selección de personajes), pero se podría agregar más vida a componentes estáticos como botones de tienda o las cartas del inventario.
3. **Refinamiento de Paleta:** El "Acero Etéreo" es bonito, pero a veces usar negro puro o bordes pesados ensucia la vista. El contraste entre `--aurum` (oro) y `--cyan` es muy fuerte. Habría que buscar armonía, quizás moviendo el cian hacia un azul un poco más eléctrico o usando el Oro como color unificador de recompensas/interacción.
4. **Layout en Móvil:** Como AGENTS.md dice "Mobile prioriza landscape", hay que revisar que ningún modal o menú principal se aplaste u oculte botones clave en pantallas pequeñas horizontales.

---

**Siguientes pasos sugeridos para el checklist:**
1. Definir qué área o archivo específico atacaremos primero (ej. *El HUD*, *La Pantalla de Título*, *Las notificaciones de logros*).
2. Refinar los tokens de CSS en `foundation.css` si queremos una nueva paleta.
