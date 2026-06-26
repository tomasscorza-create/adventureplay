# Superjuego - Guia interna para agentes de IA

Este archivo es el registro interno del estado actual del proyecto y la guia de continuidad para futuros agentes. Debe leerse antes de tocar codigo.

## Estado actual del proyecto

- Proyecto local: `C:\Users\usuario\Desktop\superjuego`.
- Stack obligatorio ya aplicado: React + Vite + TypeScript + Phaser.
- Tipo de proyecto actual: demo web jugable 2D, preparada para evolucionar a Android mediante Capacitor mas adelante.
- Estado de build: `npm run build` pasa correctamente.
- Servidor usado durante desarrollo: Vite. Si `5173` esta ocupado, usar otro puerto como `5174`.
- Phaser renderiza el juego real en canvas. React no renderiza el juego frame a frame.
- React maneja UI externa: menu, seleccion de personaje, seleccion de modos/regiones/niveles, HUD, pausa, game over, victoria, controles tactiles y aviso de orientacion.
- El Event Bus conecta Phaser y React sin acoplarlos directamente.
- El guardado actual usa `localStorage` mediante `LocalSaveAdapter`.
- El arte actual es placeholder generado en Phaser con texturas simples. No hay arte final todavia.
- El bundle de produccion emite una advertencia de chunk grande por Phaser. Es esperable por ahora; no optimizar prematuramente salvo que el usuario lo pida.

## Estructura principal

- `src/App.tsx`: monta Phaser, escucha eventos globales y decide que UI React mostrar.
- `src/ui/screens/MainMenuScreen.tsx`: flujo React de menu principal, seleccion de personaje, modos, mapa de regiones y seleccion de niveles.
- `src/main.tsx`: entrada React.
- `src/styles.css`: layout global, HUD, overlays, controles tactiles, responsive y orientacion.
- `src/game/main.ts`: crea la instancia Phaser.
- `src/game/config/gameConfig.ts`: configuracion Phaser, escenas, escala y fisicas Arcade.
- `src/game/events/EventBus.ts`: Event Bus tipado entre React y Phaser.
- `src/game/scenes/`: escenas Phaser.
- `src/game/entities/`: entidades jugables de Phaser.
- `src/game/systems/`: sistemas separados por responsabilidad.
- `src/game/data/`: datos editables de enemigos, items, niveles y progresion.
- `src/game/data/characters.ts`: datos editables de personajes jugables.
- `src/shared/types/`: tipos compartidos entre React, Phaser y sistemas.
- `src/shared/constants/`: constantes compartidas.
- `src/ui/components/`: componentes React reutilizables.
- `src/ui/screens/`: pantallas React.

## Escenas existentes

- `BootScene`: arranca la carga inicial.
- `PreloadScene`: crea texturas placeholder y pasa al menu.
- `MainMenuScene`: fondo del menu y escucha `START_GAME`.
- `WorldMapScene`: creada como placeholder para futuro mapa.
- `LevelScene`: escena jugable principal.
- `BattleScene`: creada como placeholder para futuros combates especiales.
- `UIScene`: placeholder Phaser para UI interna si hiciera falta, pero la UI actual vive en React.
- `GameOverScene`: escena de resultado que comunica derrota o victoria a React.

## Demo jugable actual

La demo actual permite:

- Abrir menu principal.
- Elegir personaje jugable desde el boton Personaje del menu principal.
- Abrir inventario del jugador desde el boton Inventario del menu principal.
- Abrir seleccion de modo Explorar desde Iniciar juego.
- Elegir niveles desbloqueados desde Frontera Verde.
- Jugar los niveles 1, 2 y 3 de Frontera Verde.
- Mover personaje.
- Saltar.
- Atacar cuerpo a cuerpo.
- Ver una estela visual de espada con ventana breve de dano al atacar.
- Enfrentar al enemigo basico rojo M0 como obstaculo quieto.
- Derrotar al monstruo M1 con espada o saltando encima.
- Esquivar o golpear al ave M2 mientras cruza horizontalmente hacia el jugador.
- Disparar proyectiles.
- Recibir dano.
- Derrotar enemigos.
- Ganar experiencia.
- Subir de nivel.
- Recoger monedas.
- Recoger piezas de inventario en el mapa.
- Activar checkpoint.
- Llegar a la meta.
- Avanzar del nivel 1 al nivel 2 y del nivel 2 al nivel 3 al completar la meta.
- Ver una transicion visual de 4 segundos antes de cargar el siguiente nivel.
- Ver victoria.
- Ver game over.
- Pausar.
- Guardar progreso basico en `localStorage`.
- Guardar el personaje seleccionado en `localStorage`.
- Guardar piezas recogidas en el inventario persistente.
- Ver niveles completados, pendientes, bloqueados y proximamente en la interfaz de exploracion.

## Personajes jugables

- Personaje inicial y fallback: Ruder.
- Personajes disponibles actuales: Ruder, Amy, Dunel y Sarix.
- La seleccion se guarda como `selectedCharacterId` dentro de `SaveData`.
- `src/game/data/characters.ts` define nombre, textura y prefijo de animacion por personaje.
- `PreloadScene` normaliza los spritesheets de Amy, Dunel y Sarix a la misma grilla jugable 96x80 que Ruder.
- `Player` recibe un `CharacterDefinition`; no debe volver a depender de una textura fija como `"player"`.

## Inventario

- El menu principal solo muestra accesos a secciones; el inventario se abre desde el boton Inventario.
- La pantalla Inventario tiene tabs superiores para mirar una categoria a la vez.
- El inventario usa `save.player.inventory` y se guarda con `LocalSaveAdapter`.
- Las categorias actuales son: Planos y llaves, Herramientas y armas, Pociones.
- `src/game/data/items.ts` define `inventoryCategories` y los `ItemDefinition` con `inventoryCategory`.
- Las piezas no-moneda del mapa usan la textura placeholder `inventory-piece` y se agregan al inventario al recogerlas.
- Las monedas siguen sumando `coins` y no se muestran dentro de las tres categorias de inventario.

## Controles actuales

Desktop:

- Izquierda: flecha izquierda o `A`.
- Derecha: flecha derecha o `D`.
- Salto: flecha arriba, `W` o espacio.
- Ataque cuerpo a cuerpo: `J`.
- Disparo: `K`.
- Pausa: `P` o `Esc`.

Mobile:

- Controles tactiles en `MobileControls`.
- Movimiento: botones `<` y `>`.
- Acciones: `^` salto, `J` ataque, `K` disparo.
- Pausa: `||` arriba a la derecha.
- En vertical aparece aviso de orientacion y se ocultan controles.
- En horizontal movil aparece HUD compacto arriba izquierda y controles abajo.

## Sistema de input

El input esta unificado. No volver a leer teclado directamente desde `MovementSystem` ni desde entidades.

- `src/shared/types/input.ts`: define `GameplayInputState` y `GameplayInputFrame`.
- `src/game/systems/input/TouchInputStore.ts`: estado tactil global y cola de taps rapidos.
- `src/game/systems/input/GameplayInputSystem.ts`: combina teclado + tactil en un frame de input.
- `src/game/systems/movement/MovementSystem.ts`: consume `GameplayInputFrame`.
- `src/game/scenes/LevelScene.ts`: lee input una vez por frame y lo pasa a movimiento/acciones.

Regla importante: toda nueva entrada jugable debe agregarse primero al input unificado, no como acceso directo a DOM, teclado o pointer desde la escena.

## Estado mobile y Android

El proyecto todavia no esta empaquetado con Capacitor. Esta preparado a nivel web/mobile para ese paso.

Ya existe:

- Canvas responsive con Phaser `Scale.FIT`.
- Bloqueo de scroll/overscroll en CSS.
- `touch-action: none` para evitar gestos molestos durante la partida.
- Controles tactiles.
- Aviso en vertical.
- Layout landscape movil.
- Uso de `env(safe-area-inset-*)` para notch/barras del sistema.

Pendiente antes de Play Store:

- Instalar y configurar Capacitor.
- Crear proyecto Android.
- Definir package id.
- Configurar iconos y splash screen.
- Activar fullscreen nativo.
- Generar `.aab`.
- Firmar build de produccion.
- Probar en dispositivo fisico Android.

## Datos editables

No hardcodear nuevos enemigos, items o niveles dentro de `LevelScene` si pueden vivir como datos.

- Enemigos: `src/game/data/enemies.ts`.
- Personajes: `src/game/data/characters.ts`.
- Items: `src/game/data/items.ts`.
- Niveles: `src/game/data/levels.ts`.
- Experiencia y habilidades: `src/game/data/progression.ts`.

Para agregar un enemigo:

1. Agregar definicion en `enemies.ts`.
2. Si sirve la IA basica, agregar spawn en `levels.ts`.
3. Si necesita IA propia, crear clase en `src/game/entities/enemies/` extendiendo `BaseEnemy`.

Para agregar un personaje:

1. Agregar definicion en `characters.ts`.
2. Cargar su asset en `PreloadScene`.
3. Crear o normalizar una textura con las animaciones esperadas por `Player`: idle, run, jump, fall, attack, hurt y dead.
4. Mantener la seleccion a traves de `LocalSaveAdapter`, no con estado temporal de escena.

Para agregar un item:

1. Agregar definicion en `items.ts`.
2. Si debe mostrarse en el inventario, asignar `inventoryCategory`.
3. Ajustar `InventorySystem` solo si el tipo de item requiere logica nueva.
4. Agregar spawn en `levels.ts` o en el futuro en mapas Tiled.

Para agregar un nivel:

1. Agregar definicion en `levels.ts`.
2. Usar `nextLevelId` si completar ese nivel debe encadenar con otro.
3. Mantener plataformas, enemigos, monedas, checkpoint y meta como datos.
4. Mas adelante migrar a Tiled en `src/assets/maps/` sin romper la interfaz de `LevelDefinition`.

## Reglas de arquitectura

1. Phaser es responsable de loop, fisicas, colisiones, entidades, camara, enemigos, proyectiles y gameplay.
2. React es responsable de UI externa, overlays, HUD, pantallas, configuracion futura, inventario futuro y controles tactiles.
3. React no debe renderizar entidades ni actualizar gameplay cada frame.
4. Phaser no debe importar componentes React.
5. La comunicacion React/Phaser debe pasar por `EventBus` o por sistemas explicitos como el store de input.
6. Mantener logica de negocio fuera de componentes visuales.
7. Mantener datos de contenido fuera de escenas cuando sea razonable.
8. Evitar archivos enormes mezclando escena, datos, UI y sistemas.
9. Agregar abstracciones solo cuando reduzcan duplicacion real o protejan una expansion concreta.
10. No introducir sistemas avanzados si rompen la claridad de la demo minima.

## Reglas para escenas

- Las escenas deben orquestar sistemas, no contener toda la logica del juego.
- `LevelScene` puede coordinar entidades, colisiones y eventos, pero no debe crecer como archivo monolitico.
- Si una responsabilidad empieza a repetirse o crecer, extraer a `systems/`.
- No cargar assets finales directamente desde escenas futuras sin pasar por `PreloadScene` o un sistema claro de carga.
- Mantener nombres de escenas estables porque React y eventos dependen del flujo actual.

## Reglas para entidades

- Entidades Phaser deben encapsular estado propio de gameplay inmediato.
- `Player` mantiene stats, estado, direccion, dano, invulnerabilidad y hitbox melee.
- `BaseEnemy` mantiene vida, dano, patrulla y recompensa.
- Nuevos enemigos deben reutilizar `BaseEnemy` cuando sea posible.
- Proyectiles deben seguir siendo entidades separadas, no rectangulos anonimos dentro de la escena.
- No poner UI React ni llamadas DOM dentro de entidades.

## Reglas para progresion y guardado

- `ProgressionSystem` controla experiencia, subida de nivel y desbloqueo inicial de habilidades.
- `InventorySystem` controla recoleccion de items/monedas.
- Las piezas de inventario deben pasar por `InventorySystem.collect`, no escribirse directamente en el save desde la UI.
- `LocalSaveAdapter` es la unica capa de persistencia actual.
- La seleccion de personaje vive en `SaveData.selectedCharacterId`.
- No escribir directamente en `localStorage` desde escenas, entidades o componentes.
- Si se agrega Supabase en el futuro, crear otro adapter con una interfaz compatible; no reemplazar de golpe el save local sin migracion.
- Antes de cambiar estructura de save, pensar en versionado.
- Durante transiciones entre niveles, Phaser muestra el efecto visual y React oculta HUD/controles usando el estado `level-transition`.

## Reglas mobile

- El juego debe priorizar landscape en Android.
- En vertical debe mantenerse el aviso de orientacion salvo que el usuario pida jugabilidad vertical real.
- Los controles tactiles deben ocupar bordes inferiores y no tapar el centro del gameplay.
- Pausa debe quedar arriba derecha y lejos del HUD.
- HUD movil debe ser compacto y legible.
- Mantener safe areas con `env(safe-area-inset-*)`.
- No usar hover como unica senal de interaccion.
- No depender de `pointer: coarse` solamente; hay pruebas de navegador con pointer fino y viewport chico.
- Probar al menos: desktop 1280x720, portrait 390x844, landscape 844x390.

## Verificacion obligatoria antes de entregar cambios

Ejecutar:

```powershell
npm run build
```

Si se toca UI/mobile, verificar visualmente:

- Desktop: controles tactiles ocultos, aviso oculto.
- Portrait movil: aviso visible, controles ocultos.
- Landscape movil: aviso oculto, controles visibles, HUD no se cruza con controles ni pausa.

Si se toca gameplay, verificar manualmente:

- Iniciar partida.
- Moverse.
- Saltar.
- Atacar.
- Disparar.
- Pausar.
- Recibir dano.
- Derrotar enemigo.
- Recoger moneda.
- Completar nivel.

## Convenciones de codigo

- TypeScript estricto.
- Usar imports tipados con `import type` cuando corresponda.
- Mantener ASCII en archivos salvo necesidad clara.
- Comentarios solo donde aclaren una decision no obvia.
- No mezclar refactors no pedidos con cambios funcionales.
- No tocar `dist/` ni `node_modules/` manualmente.
- No editar artefactos generados.
- Evitar dependencias nuevas salvo que aporten una ventaja clara.

## Proximos pasos recomendados

1. Refinar jugabilidad tactil: probar caminar + saltar + atacar/disparar simultaneamente en Android real.
2. Mejorar camara y escala del nivel para landscape.
3. Agregar animaciones placeholder por estados del jugador.
4. Separar mejor factories/spawners de `LevelScene` si crece el contenido.
5. Preparar loader para mapas Tiled.
6. Crear mas niveles desde datos.
7. Agregar menu de configuracion y remapeo basico.
8. Agregar Capacitor cuando la experiencia mobile web este comoda.

## Advertencias actuales

- `WorldMapScene`, `BattleScene` y `UIScene` existen como estructura futura, no como features completas.
- No hay assets finales.
- No hay tests automatizados.
- No hay empaquetado Android todavia.
- La arquitectura esta preparada, pero debe crecer gradualmente para no volver la demo dificil de entender.
