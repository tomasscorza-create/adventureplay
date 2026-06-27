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
- El progreso del juego requiere autenticacion Supabase y se guarda en `public.game_saves` mediante `GameSaveStore` + `SupabaseSaveAdapter`.
- Supabase local esta configurado con Docker y puertos `554xx`; usar `npm run supabase:start`, `npm run supabase:reset` y `npm run supabase:stop`.
- La migracion fuente para progreso remoto esta en `supabase/migrations/20260626000000_create_game_saves.sql`.
- El esquema de guardado de aplicacion esta en `SAVE_SCHEMA_VERSION = 2`; incluye `claimedRewardBoxes` y conserva `player.coins` como clave interna para el ORO.
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
- `src/game/systems/save/GameSaveStore.ts`: cache sincronica para Phaser y cola de persistencia remota.
- `src/game/systems/save/SupabaseSaveAdapter.ts`: adapter async para `public.game_saves`.
- `src/shared/supabase/client.ts`: cliente Supabase web configurado por `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- `src/game/data/`: datos editables de enemigos, items, niveles y progresion.
- `src/game/data/characters.ts`: datos editables de personajes jugables.
- `src/game/entities/platforms/MovingPlatform.ts`: plataforma fisica movil que transporta entidades y sincroniza su representacion de piedra.
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
- Crear cuenta o entrar con email/password antes de jugar.
- Elegir personaje jugable desde el boton Personaje del menu principal.
- Abrir inventario del jugador desde el boton Inventario del menu principal.
- Abrir opciones desde la tuerca junto a Menu principal.
- Encender o apagar sonido y musica por separado desde Opciones.
- Abrir seleccion de modo Explorar desde Iniciar juego.
- Elegir niveles desbloqueados desde Frontera Verde.
- Jugar los niveles 1 a 6 de Frontera Verde.
- Mover personaje.
- Saltar.
- Atacar cuerpo a cuerpo.
- Ver una estela visual de espada con ventana breve de dano al atacar.
- Enfrentar al enemigo basico rojo M0 como obstaculo quieto.
- Derrotar al monstruo M1 con espada o saltando encima.
- Esquivar o golpear al ave M2, que ahora acecha y hace picadas directas hacia el jugador.
- Ver un pequeno efecto visual de explosion al derrotar monstruos.
- Escuchar musica suave original generada por Web Audio tras la primera interaccion.
- Escuchar sonidos sutiles de interfaz, salto, ataque, disparo, recoleccion, golpes a monstruos, derrota de monstruos y dano recibido.
- Disparar proyectiles.
- Recibir dano.
- Derrotar enemigos.
- Ganar experiencia.
- Subir de nivel.
- Recoger ORO.
- Recoger piezas de ORO estaticas distribuidas de principio a fin; cada una vale entre 1 y 3 y se persiste inmediatamente en `save.player.coins`.
- Recibir ORO variable al derrotar monstruos: M0 entrega 2-4, M1 entrega 4-7 y M2 entrega 7-10.
- Recoger piezas de inventario en el mapa.
- Encontrar una caja de recompensa unica en cada nivel; permanece en reintentos hasta recogerla y luego no vuelve a aparecer.
- Recibir al azar un objeto valido de inventario al abrir cada caja y conservarlo en el guardado remoto.
- Activar checkpoint.
- Llegar a la meta.
- Avanzar en cadena del nivel 1 al nivel 6 al completar cada meta.
- Desde el nivel 4, cruzar plataformas de piedra que se mueven horizontal o verticalmente.
- Saltar desde plataformas moviles; el estado de suelo contempla `blocked.down` y `touching.down` mediante `Player.isGrounded()`.
- Afrontar una progresion aproximada de 15-20% de presion adicional por nivel mediante auto-scroll, velocidad de peligros, cantidad de enemigos y plataformas moviles.
- En los niveles 5 y 6, esquivar peligros que quitan dos vidas y sierras letales de tres vidas.
- Ver una transicion visual de 4 segundos antes de cargar el siguiente nivel.
- Ver victoria.
- Ver game over.
- Pausar.
- Guardar progreso basico en `public.game_saves` para el usuario autenticado.
- Guardar el personaje seleccionado en `public.game_saves`.
- Guardar piezas recogidas en el inventario persistente.
- Ver los niveles 1 a 6 como completados, pendientes o bloqueados, y los niveles 7 a 10 como proximamente en la interfaz de exploracion.

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
- El inventario usa `save.player.inventory` y se guarda con `GameSaveStore`.
- Las categorias actuales son: Planos y llaves, Herramientas y armas, Pociones.
- `src/game/data/items.ts` define `inventoryCategories` y los `ItemDefinition` con `inventoryCategory`.
- Las piezas del mapa que no son ORO usan la textura placeholder `inventory-piece` y se agregan al inventario al recogerlas.
- El ORO sigue sumando en la clave tecnica `coins` y no se muestra dentro de las tres categorias de inventario.
- El presupuesto de ORO del camino usa `round(25 * 1.1^(nivel - 1))`: LV1=25 y LV10=59; las recompensas de enemigos son adicionales.
- La interfaz y los textos para jugadores deben usar siempre `ORO`; conservar `coins`, `Coin`, `coinReward` y `bronzeCoin` solo como identificadores internos compatibles con los guardados existentes.
- Cada nivel define una sola `rewardBox`; sus recompensas posibles son los items con `inventoryCategory` en `items.ts`.
- `SaveData.claimedRewardBoxes` registra las cajas ya abiertas para que no reaparezcan en partidas posteriores.

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
- `src/shared/audio/GameAudio.ts`: capa compartida de audio procedural para musica, UI y feedback de gameplay.
- `GameAudio` guarda preferencias locales de `musicEnabled` y `soundEnabled` para controlar musica y sonidos por separado.

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
4. Para M2, usar `aggression` en `levels.ts` si el nivel debe hacerlo atacar mas rapido y con menos pausa entre picadas.

Para agregar un personaje:

1. Agregar definicion en `characters.ts`.
2. Cargar su asset en `PreloadScene`.
3. Crear o normalizar una textura con las animaciones esperadas por `Player`: idle, run, jump, fall, attack, hurt y dead.
4. Mantener la seleccion a traves de `GameSaveStore`, no con estado temporal de escena.

Para agregar un item:

1. Agregar definicion en `items.ts`.
2. Si debe mostrarse en el inventario, asignar `inventoryCategory`.
3. Ajustar `InventorySystem` solo si el tipo de item requiere logica nueva.
4. Agregar spawn en `levels.ts` o en el futuro en mapas Tiled.

Para agregar un nivel:

1. Agregar definicion en `levels.ts`.
2. Usar `nextLevelId` si completar ese nivel debe encadenar con otro.
3. Mantener plataformas, enemigos, ORO, checkpoint y meta como datos.
4. Definir una `rewardBox` con ID unico y posicion alcanzable.
5. Mas adelante migrar a Tiled en `src/assets/maps/` sin romper la interfaz de `LevelDefinition`.

Para agregar plataformas moviles:

1. Mantener la plataforma dentro de `platforms` en `levels.ts`.
2. Agregar `movement` con `axis`, `distance` y `speed` solo a las piedras que deban moverse.
3. No crear tweens de plataformas dentro de `LevelScene`; la fisica y el movimiento pertenecen a `MovingPlatform`.
4. Combinar la plataforma movil con pozos, pinchos o sierras solo desde los datos del nivel.

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
- `InventorySystem` controla recoleccion de items y ORO.
- Las piezas de inventario deben pasar por `InventorySystem.collect`, no escribirse directamente en el save desde la UI.
- Las recompensas aleatorias de cajas tambien deben pasar por `InventorySystem.collect` y marcar su ID en `claimedRewardBoxes` antes de persistir.
- El ORO del camino y de enemigos debe pasar por `InventorySystem.collect`; no incrementar `coins` directamente desde entidades.
- El grupo fisico interno `coins` debe mantener `allowGravity: false` e `immovable: true`; si se deja la configuracion por defecto del grupo, sobrescribe a `Coin` y las piezas de ORO caen fuera del mapa.
- `GameSaveStore` es la capa sincronica que deben usar Phaser y React para leer/escribir `SaveData`.
- `SupabaseSaveAdapter` es la capa remota actual y persiste en `public.game_saves`.
- `SaveDefaults.ts` define `SAVE_SCHEMA_VERSION`, defaults y normalizacion de saves.
- La seleccion de personaje vive en `SaveData.selectedCharacterId`.
- No escribir directamente en `localStorage` para progreso desde escenas, entidades o componentes. `GameAudio` si usa `localStorage` solo para preferencias locales de sonido/musica.
- No llamar Supabase directamente desde escenas o entidades; usar `GameSaveStore` para conservar el flujo sincronico de Phaser.
- Para migrar a Supabase real: aplicar las migraciones con `supabase link --project-ref <project-ref>` y `supabase db push`, luego cambiar variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- Antes de cambiar estructura de save, pensar en versionado.
- Durante transiciones entre niveles, Phaser muestra el efecto visual y React oculta HUD/controles usando el estado `level-transition`.
- `LevelDefinition.stageNumber` conserva la numeracion real del escenario en HUD y transiciones; no inferirla desde el nombre tematico.
- El HUD muestra un indicador pequeno `LV I` a `LV X` para el nivel del escenario, separado del nivel RPG del personaje.

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
- Recoger ORO.
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
6. Crear los niveles 7 a 10 desde datos conservando la progresion de dificultad.
7. Agregar menu de configuracion y remapeo basico.
8. Agregar Capacitor cuando la experiencia mobile web este comoda.

## Advertencias actuales

- `WorldMapScene`, `BattleScene` y `UIScene` existen como estructura futura, no como features completas.
- No hay assets finales.
- No hay tests automatizados.
- No hay empaquetado Android todavia.
- La arquitectura esta preparada, pero debe crecer gradualmente para no volver la demo dificil de entender.
