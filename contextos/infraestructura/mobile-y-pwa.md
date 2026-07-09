# 📱 Estado Mobile y PWA

Este documento centraliza las reglas de infraestructura para dispositivos móviles y aplicaciones web progresivas (PWA) de *Adventure Play*.

## 1. Reglas de PWA y Service Worker
- El proyecto es una **PWA instalable** en Android y iOS con nombre, colores e iconos propios.
- Utiliza un Service Worker de producción generado por Vite (`vite.config.ts`) que precarga el cliente del juego y limpia cachés antiguos.
- **Actualizaciones:** Se manejan manualmente mediante el componente React `PwaUpdatePrompt.tsx`. Nunca forzar recargas automáticas que interrumpan partidas.
- **Restricción Crítica:** ¡NUNCA cachear endpoints de Supabase! Autenticación y progreso de juego deben realizarse por red viva para no romper el guardado remoto.

## 2. Configuración Visual y Layout
- **Orientación:** El juego prioriza y exige formato `landscape` (horizontal). En vertical, se bloquea la vista con un `<OrientationNotice />` y se ocultan los controles.
- **Viewport:** Usa `fullscreen` y `viewport-fit=cover`.
- **Safe Areas:** Utiliza siempre variables CSS `env(safe-area-inset-*)` para respetar notches y barras del sistema operativo en el HUD y pantallas.
- El canvas utiliza un render responsivo con la política `Phaser.Scale.FIT`.

## 3. Comportamiento en Gameplay
La constante `MOBILE_GAMEPLAY_QUERY` (en `shared/constants/game.ts`) es la única fuente de verdad para activar los componentes móviles de React y el comportamiento de cámara móvil.

### Cámara y Zoom
- En modo móvil se aplica un zoom agresivo a la cámara de `1.15x`.
- **Cámara extendida:** El mundo visualmente se extiende 160 unidades hacia abajo. La cámara acompaña este espacio para elevar el suelo de juego, asegurando que los controles táctiles de la parte inferior descansen visualmente "en tierra" y nunca tapen a los enemigos ni al héroe.

### Rendimiento
- Existen perfiles de rendimiento (Calidad 90%, Equilibrado 75%, Rendimiento 62.5%). Equilibrado es el predeterminado.
- Al activar Rendimiento, el juego desactiva filtros costosos (como blur) y sombras de forma dinámica. El zoom de cámara siempre compensa la resolución para mantener el mismo FOV.

## 4. Estado Play Store / Capacitor
Actualmente es una PWA lista para envolverse. Pendiente antes de subir a Play Store:
- Instalar y configurar dependencias nativas de Capacitor.
- Crear el proyecto de Android y definir el `package id`.
- Configurar splash screens e íconos y forzar fullscreen nativo vía configuración.
- Validaciones y despliegue final (`.aab` firmado).
