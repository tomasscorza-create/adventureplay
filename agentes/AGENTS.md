# Adventure Play - Guía operativa para agentes de IA

## Propósito

Este archivo es el punto de entrada operativo para agentes de IA. Actúa como el manual central de operaciones, reglas y convenciones. Los detalles profundos de diseño, subsistemas y especificaciones viven en el directorio `contextos/`. Debes leer esta guía antes de tocar código.

## Reglas críticas

* El código actual es la fuente de verdad del comportamiento ejecutable.
* Antes de modificar, revisar `git status --short`.
* No sobrescribir cambios existentes del usuario.
* No hacer refactors grandes si la tarea no los pide.
* Phaser controla gameplay, físicas y escenas.
* React controla autenticación, menú, HUD, overlays y UI externa.
* React y Phaser se comunican por `EventBus` o sistemas explícitos.
* Todo input jugable pasa por el sistema unificado.
* Todo progreso pasa por `GameSaveStore`.
* Escenas y entidades no deben escribir progreso directamente en Supabase ni en `localStorage`.
* Contenido de juego debe permanecer orientado a datos siempre que sea razonable.
* Compras y acciones destructivas requieren confirmación explícita.
* Mobile prioriza landscape, safe areas y controles que no tapen el centro del gameplay.
* Las pruebas visuales en navegador las realiza el usuario salvo pedido explícito.
* `npm run check` es la validación mínima obligatoria antes de entregar cambios de código.

## Flujo obligatorio antes de modificar código

1. Leer `AGENTS.md`.
2. Leer los archivos relevantes de `contextos/`.
3. Revisar `git status --short`.
4. Confirmar en el código cualquier dato sensible o posiblemente desactualizado.
5. Mantener la tarea acotada.
6. Ejecutar verificación obligatoria.

## Orden de prioridad ante conflictos

1. Petición actual del usuario.
2. Reglas de arquitectura, seguridad, guardado e input.
3. Código actual verificado.
4. Documentación contextual.
5. Estado histórico o descripciones antiguas.

## Mapa rápido por tipo de tarea

| Tipo de tarea | Leer primero | Archivos o carpetas principales |
|---|---|---|
| UI / React / menú / HUD | `contextos/infraestructura/ui-react-y-estilos.md`, `contextos/estetica visual/datosvisuales.md` | `src/ui/`, `src/App.tsx`, `src/styles/` |
| Gameplay / escenas Phaser | `contextos/arquitectura/reglas-phaser.md` | `src/game/scenes/`, `src/game/entities/`, `src/game/systems/` |
| Input / controles desktop y mobile | `contextos/gameplay/sistema-de-input.md` | `GameplayInputSystem.ts`, `TouchInputStore.ts`, `MobileControls.tsx` |
| Mobile / PWA / Android | `contextos/infraestructura/mobile-y-pwa.md` | `vite.config.ts`, `CameraSystem.ts`, `PwaUpdatePrompt.tsx` |
| Guardado / Supabase | `contextos/infraestructura/guardado-y-supabase.md` | `GameSaveStore.ts`, `SupabaseSaveAdapter.ts`, `SaveDefaults.ts` |
| Niveles / regiones / contenido | `contextos/desarrollo/creacion-de-contenido.md` | `src/game/data/levels.ts`, `src/game/data/levels/` |
| Enemigos / entidades / físicas | `contextos/datos-de-juego/entidades.md`, `contextos/arquitectura/reglas-phaser.md` | `src/game/data/enemies.ts`, `src/game/entities/` |
| Inventario / economía / logros / progresión | `contextos/datos-de-juego/economia-y-logros.md`, `contextos/datos-de-juego/progresion-y-niveles.md` | `src/game/data/`, `AchievementSystem.ts`, `InventorySystem.ts` |
| Co-op online | `contextos/multijugador/README.md` | `src/game/systems/net/`, `CoopLobby.tsx`, `CoopSceneLink.ts` |
| Assets / música / SFX / estética visual | `contextos/estetica visual/reporte_temas_contextuales.md` | `src/assets/`, `loadSceneAssets.ts`, `music.ts`, `sfx.ts`, `GameMusic.ts`, `GameSfx.ts` |
| Admin dashboard | `contextos/admin/estado-dashboard-admin.md` | Proyecto `adventureplay-admin` |
| Verificación / QA | Ver sección "Verificación obligatoria" abajo | `package.json` (scripts) |

## Arquitectura base resumida

* **React vs Phaser:** React gestiona la interfaz gráfica y los flujos fuera del gameplay; Phaser es el motor exclusivo de físicas, renderizado de mundo y lógicas in-game.
* **EventBus:** El puente unificado. Phaser emite eventos, React los escucha (y viceversa). No hay referencias cruzadas directas.
* **GameSaveStore:** El único orquestador del guardado local y remoto.
* **Input unificado:** Todo tap móvil o tecla pasa por un middleware (input unificado) antes de interactuar con el jugador.
* **Data-driven content:** Archivos como `levels.ts` dictan qué se dibuja y quién aparece. Las escenas son genéricas y dinámicas, no están hardcodeadas con clases concretas.
* **Supabase:** Base de datos remota para persistencia vía tabla `public.game_saves`.
* **Co-op online:** Sistema multijugador host-autoritativo desacoplado en `src/game/systems/net/` que simula inputs y comparte snapshots.

## Estado actual resumido

* **Stack:** React + Vite + TypeScript + Phaser. Ver versiones exactas en `package.json`.
* **Demo web:** Totalmente jugable.
* **Supabase:** Auth activa y guardado remoto funcional.
* **Modos actuales:** Explorar (acción lateral con presión de auto-scroll) y Desafío (cámaras de puzzles físicos libres).
* **Regiones actuales:** Frontera Verde, Bosque Encantado y Volcán Activo (10 niveles cada una).
* **PWA:** Funcional e instalable con Service Worker nativo.
* **Android:** Preparado a nivel web, pero despliegue final a Capacitor/Play Store pendiente.
* **Co-op:** Multijugador en red de 2 a 4 jugadores disponible en Explorar y Desafío.
* **Despliegue:** Sitio hosteado en Netlify usando secretos protegidos de Vite.

## Reglas por área

* **UI / React:** Todo diseño debe usar Vanilla CSS con tokens globales. Refiérete a `contextos/infraestructura/ui-react-y-estilos.md` y `contextos/estetica visual/datosvisuales.md`.
* **Gameplay / Phaser:** Separa lógica y orquestación. Evita God Classes. Refiérete a `contextos/arquitectura/reglas-phaser.md`.
* **Input:** Ninguna pulsación va directo al jugador. Refiérete a `contextos/gameplay/sistema-de-input.md`.
* **Guardado:** La única capa aceptada es `GameSaveStore`. Refiérete a `contextos/infraestructura/guardado-y-supabase.md`.
* **Mobile:** Las acciones táctiles usan hitboxes extendidos y áreas ciegas. Refiérete a `contextos/infraestructura/mobile-y-pwa.md`.
* **Contenido / regiones:** La lógica es conducida por datos. Nuevos recursos van a `src/game/data/`. Refiérete a `contextos/desarrollo/creacion-de-contenido.md`.
* **Co-op:** La lógica de red va separada de Phaser, sincronizando a 20Hz. Refiérete a `contextos/multijugador/README.md`.
* **Assets:** Usa texturas y WebP optimizados para cuidar el bundle final.
* **Verificación:** Es manual para jugabilidad, automatizada para validación de niveles y progresión.

## Verificación obligatoria

* `git diff --check`
* `npm run check` (Ejecuta linter, TypeScript, Vitest, auditorías de contenido de juego y build).
* **QA Manual:** El QA visual (layout, menús superpuestos) y recorridos completos de nivel (probar jefes, saltar abismos, jugabilidad táctil) son exclusivamente responsabilidad manual del usuario, a menos que el usuario solicite explícitamente a un agente verificar algo específico.

## Advertencias de alto riesgo

* Saltarse `GameSaveStore` y escribir directo a `localStorage` o Supabase.
* Leer input directo desde el teclado o puntero dentro de escenas o entidades de Phaser.
* Duplicar lógica del co-op o meter sockets dentro de la lógica del mundo de `LevelScene`.
* Hardcodear arreglos de enemigos, posiciones o recuentos de ítems dentro de una Escena en vez de instanciar los Data files.
* Hacer ajustes para móviles tocando solo CSS, sin considerar el zoom de cámara de Phaser o los handlers de toques táctiles.
* Configurar Service Worker para cachear Supabase, rompiendo las promesas de red de base de datos.
* Modificar/renombrar IDs heredados como `superjuego` sin una estrategia de migración masiva pensada.
* Reintroducir acoplamiento importando un componente React dentro de un subsistema Phaser o viceversa.
* No reescribir migraciones de Supabase ya aplicadas ni identificadores históricos; para cambios de esquema, crear migraciones nuevas.

## Pendiente de migrar a contextos

* Sin pendientes detectados en esta pasada. Si aparece información específica valiosa no cubierta por `contextos/`, migrarla antes de eliminarla de cualquier documento.

## Mantenimiento de esta guía

* Actualizar `AGENTS.md` solo si cambian invariantes críticos, el flujo de trabajo, la arquitectura superior o los archivos de referencia.
* **No agregar listas largas de features** o resúmenes masivos de lo que hace cada nivel del juego.
* Documentar detalles de sistemas, diseño y parámetros dentro de los archivos pertinentes en `contextos/`.
* Confirmar siempre en código antes de afirmar estados arquitectónicos que puedan quedar viejos con las actualizaciones de los programadores (Humanos o IAs).
