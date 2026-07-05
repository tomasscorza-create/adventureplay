# Adventure Play - Guia interna para agentes de IA

Este archivo es el registro interno del estado actual del proyecto y la guia de continuidad para futuros agentes. Debe leerse antes de tocar codigo.

## Uso rapido para agentes

Antes de modificar el proyecto:

1. Leer esta seccion, `Estado actual del proyecto`, `Reglas de arquitectura` y la seccion especifica de la tarea.
2. Revisar `git status --short` para no sobrescribir cambios existentes.
3. Confirmar en el codigo cualquier dato que pueda haber cambiado desde la ultima actualizacion de esta guia.
4. Mantener el cambio dentro de la arquitectura existente y evitar refactors no pedidos.
5. Ejecutar la verificacion obligatoria correspondiente antes de entregar.

Orden de prioridad cuando haya dudas o aparente contradiccion:

1. La peticion actual del usuario.
2. Las reglas de seguridad, arquitectura, guardado e input de este archivo.
3. El comportamiento confirmado en el codigo actual.
4. El estado descriptivo y los proximos pasos documentados aqui.

El codigo es la fuente de verdad del comportamiento ejecutable. Este archivo es la fuente de verdad de las decisiones, invariantes y expectativas de continuidad. Si ambos difieren, no asumir silenciosamente: verificar el caso, conservar compatibilidad y actualizar esta guia junto con el cambio cuando corresponda.

### Mapa rapido por tipo de tarea

| Tarea | Leer primero | Archivos de entrada |
| --- | --- | --- |
| UI, menu, HUD u overlays | Reglas de arquitectura, Reglas mobile | `src/App.tsx`, `src/ui/`, `src/styles.css` |
| Gameplay, colisiones o camara | Reglas para escenas, Reglas para entidades | `src/game/scenes/LevelScene.ts`, `src/game/entities/`, `src/game/systems/` |
| Controles desktop o tactiles | Sistema de input, Reglas mobile | `GameplayInputSystem.ts`, `TouchInputStore.ts`, `MobileControls.tsx` |
| Niveles, enemigos, items o plataformas | Datos editables | `src/game/data/`, `MovingPlatform.ts` |
| Nueva region o escenario | Proceso replicable para crear una region | `levels.ts`, `LevelScene.ts`, `PreloadScene.ts`, `MainMenuScreen.tsx`, `SaveDefaults.ts` |
| Personajes, poderes o tienda | Personajes jugables, Inventario, Reglas para progresion y guardado | `characters.ts`, `MainMenuScreen.tsx`, `GameSaveStore.ts` |
| Logros | Datos editables, Reglas para progresion y guardado | `achievements.ts`, `AchievementSystem.ts`, `MainMenuScreen.tsx`, `GameSaveStore.ts` |
| Persistencia o Supabase | Reglas para progresion y guardado | `GameSaveStore.ts`, `SupabaseSaveAdapter.ts`, `SaveDefaults.ts`, `supabase/migrations/` |
| Responsive o Android | Estado mobile y Android, Reglas mobile | `src/styles.css`, `MobileControls.tsx`, configuracion Phaser |

### Invariantes criticos

- Phaser controla el gameplay y React controla la UI externa.
- React y Phaser se comunican mediante `EventBus` o sistemas explicitos; no deben acoplarse directamente.
- Todo input jugable pasa por el sistema unificado.
- Todo progreso pasa por `GameSaveStore`; escenas y entidades no llaman Supabase ni escriben progreso en `localStorage`.
- Enemigos, items, niveles y plataformas deben permanecer orientados a datos siempre que sea razonable.
- Los textos visibles usan `ORO`; los identificadores internos compatibles conservan `coins` y nombres relacionados.
- Las acciones destructivas o de compra siempre requieren confirmacion explicita.
- Mobile prioriza landscape, safe areas y controles que no tapen el centro del gameplay.
- Las pruebas visuales en navegador las realiza el usuario. Los agentes no deben abrir, automatizar ni ejecutar pruebas de navegador salvo peticion explicita del usuario.
- `npm run check` es el minimo obligatorio antes de entregar cambios de codigo.

### Navegacion

- Estado y estructura: `Estado actual del proyecto`, `Estructura principal`, `Escenas existentes`.
- Funcionalidad vigente: `Demo jugable actual`, `Personajes jugables`, `Inventario`, `Controles actuales`.
- Implementacion: `Sistema de input`, `Datos editables`, reglas de arquitectura, escenas, entidades y guardado.
- Expansion de contenido: `Proceso replicable para crear una region`.
- Plataforma y calidad: `Estado mobile y Android`, `Reglas mobile`, `Verificacion obligatoria antes de entregar`.
- Continuidad: `Convenciones de codigo`, `Proximos pasos recomendados`, `Advertencias actuales`, `Mantenimiento de esta guia`.
- Evidencia antigua: `docs/verification-history.md`; no usarla como estado vigente sin volver a verificar.

## Estado actual del proyecto

- Proyecto local: `C:\Users\usuario\Desktop\adventureplay`.
- Nombre publico, repositorio y paquete npm: `Adventure Play` / `adventureplay`.
- `superjuego` permanece solo en `supabase/config.toml` como identificador del stack Docker local y en la migracion ya aplicada `20260626000000_create_game_saves.sql`. No renombrar ninguno sin una migracion deliberada de infraestructura o historial.
- Stack obligatorio ya aplicado: React + Vite + TypeScript + Phaser.
- Tipo de proyecto actual: demo web jugable 2D, preparada para evolucionar a Android mediante Capacitor mas adelante.
- Estado de calidad: `npm run check` pasa correctamente.
- Servidor usado durante desarrollo: Vite. Si `5173` esta ocupado, usar otro puerto como `5174`.
- Phaser renderiza el juego real en canvas. React no renderiza el juego frame a frame.
- React maneja UI externa: menu, seleccion de personaje, seleccion de modos/regiones/niveles, HUD, pausa, game over, victoria, controles tactiles y aviso de orientacion.
- El Event Bus conecta Phaser y React sin acoplarlos directamente.
- El progreso del juego requiere autenticacion Supabase y se guarda en `public.game_saves` mediante `GameSaveStore` + `SupabaseSaveAdapter`.
- Supabase local esta configurado con Docker y puertos `554xx`; usar `npm run supabase:start`, `npm run supabase:reset` y `npm run supabase:stop`.
- Las migraciones fuente para progreso remoto estan en `supabase/migrations/`: la primera crea `game_saves` y la segunda endurece su relacion con `auth.users`, permisos y funcion de timestamp.
- El proyecto alojado actual es `adventureplay` (`hlfyhbvzenuepojifetb`). Las migraciones `20260626000000` y `20260630000000` estan aplicadas en remoto desde el 2026-06-30; todo cambio posterior debe agregarse como una migracion nueva.
- El despliegue publico actual esta en `https://adventureplay.netlify.app/` y se construye desde `main` del repositorio `tomasscorza-create/adventureplay`. Netlify requiere `npm run build`, directorio publicado `dist`, `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` con alcance de build.
- Supabase Auth debe conservar `https://adventureplay.netlify.app` como `Site URL` y como Redirect URL exacta para confirmaciones de email, recuperacion y retornos de autenticacion. No asumir que este ajuste del Dashboard se versiona en `supabase/config.toml`, porque ese archivo sigue describiendo el stack local.
- El esquema de guardado de aplicacion esta en `SAVE_SCHEMA_VERSION = 16`; incluye nombre visible, icono de perfil y estadisticas acumuladas del jugador, cinco heroes, heroe principal, personajes desbloqueados, cargas por personaje, recompensas de nivel reclamadas, progreso ampliado de logros y rachas diarias, y conserva `player.coins` como clave interna para el ORO.
- El arte de gameplay sigue siendo mayormente placeholder; el selector de heroes ya usa retratos propios optimizados desde los PNG de diseno.
- Frontera Verde tiene los niveles 1 a 10 implementados y encadenados; desde el nivel 6 aparece M3 y en los niveles 7 a 10 pasa a ser la amenaza principal.
- Bosque encantado es la segunda region seleccionable y tiene LV1-LV10 implementados y encadenados desde `enchantedGrove1` hasta `enchantedGrove10`. Conserva tiempo, progreso, presion roja, checkpoint, meta, pozos y plataformas propias; reutiliza las IA/estadisticas de M0, M1, M2 y M3 con apariencias exclusivas del escenario. La variante tematica de M3 se identifica como E2M3 y domina la progresion avanzada.
- Volcan Activo es la tercera region jugable y tiene LV1-LV3 implementados y encadenados desde `activeVolcano1` hasta `activeVolcano3`. Usa fondo y plataformas flotantes fuente propios, terreno de roca/lava, pozos de magma, skins procedurales para M0/M1 y dos hojas normalizadas para M2. M3 no forma parte de estos tres niveles y no debe agregarse hasta una fase posterior pedida por el usuario.
- La web es instalable como PWA movil bajo el nombre `Adventure Play`: usa manifiesto landscape/fullscreen, iconos Android/iOS y service worker generado en produccion. Las actualizaciones esperan confirmacion del jugador para no recargar una partida activa.
- Phaser se carga de forma diferida despues de autenticar y queda en un chunk de gameplay independiente. Su advertencia de tamano es esperable; el chunk inicial tiene un presupuesto automatizado de 450 KiB.
- La entrada inicial usa `public/media/adventure-play-intro.mp4`: React intenta reproducirla de inmediato con su audio original, mientras autenticacion y Phaser cargan por debajo, y aplica una transicion breve antes de revelar el menu o la pantalla de acceso. Como los navegadores pueden bloquear autoplay con sonido, `GameIntroScreen` ofrece `Tocar para comenzar` solo cuando hace falta. La copia web conserva el indice MP4 al comienzo para iniciar rapido.
- La musica de fondo usa cuatro loops medievales CC0 en `public/music/`: menu, LV1-LV3, LV4-LV6 y LV7-LV10. `GameMusic` conserva encendido y volumen local, con 50% como intensidad inicial, y cruza las pistas durante 2,8 segundos para evitar cortes secos. El control de volumen solo escala las capas ya activas: no inicia pistas ni reinicia el crossfade.
- Los efectos usan una seleccion CC0 medieval/fantastica en `public/sfx/`. `GameSfx` precarga y decodifica los archivos con Web Audio para reproducirlos con baja latencia, variaciones leves y solapamiento seguro; conserva encendido y volumen local, con 75% como intensidad inicial.

## Estructura principal

- `src/App.tsx`: orquesta la UI y los eventos globales; `usePhaserGame` monta Phaser de forma diferida despues de autenticar.
- `src/ui/screens/MainMenuScreen.tsx`: orquesta el flujo React del menu; las vistas de exploracion, inventario, logros y detalle de personaje viven en `src/ui/screens/main-menu/`.
- `src/main.tsx`: entrada React.
- `src/styles.css`: punto de entrada que conserva el orden de cascada; las reglas estan separadas por area en `src/styles/`.
- `src/styles/navigation-polish.css`: ultima capa de cascada para densidad, scroll y navegacion coherentes en las secciones React; no contiene estilos del escenario Phaser.
- `vite.config.ts`: manifiesto PWA, estrategia de actualizacion y politica de cache; las solicitudes a Supabase deben seguir usando red y no cachearse en el service worker.
- `eslint.config.js`: reglas compartidas para TypeScript, React, hooks y scripts Node.
- `.github/workflows/ci.yml`: pipeline de GitHub para lint, tipos, tests, auditorias de contenido, build y dependencias.
- `public/_headers`: encabezados de seguridad y cache para el despliegue Netlify; conservar CSP compatible con Supabase y con los estilos React existentes.
- `public/favicon.svg`: fuente editable de los iconos PWA; ejecutar `npm run pwa:assets` despues de modificarla.
- `src/ui/components/PwaUpdatePrompt.tsx`: aviso no intrusivo que permite aplicar o posponer una nueva version.
- `src/ui/screens/GameIntroScreen.tsx`: intro de video inicial, espera segura del destino y transicion de entrada hacia la aplicacion.
- `src/game/main.ts`: crea la instancia Phaser.
- `src/game/config/gameConfig.ts`: configuracion Phaser, escenas, escala y fisicas Arcade.
- `src/game/events/EventBus.ts`: Event Bus tipado entre React y Phaser.
- `src/game/scenes/`: escenas Phaser.
- `src/game/entities/`: entidades jugables de Phaser.
- `src/game/systems/`: sistemas separados por responsabilidad.
- `src/game/systems/save/GameSaveStore.ts`: cache sincronica para Phaser y cola de persistencia remota.
- `src/game/systems/save/SupabaseSaveAdapter.ts`: adapter async para `public.game_saves`.
- `src/shared/supabase/client.ts`: cliente Supabase web configurado por `VITE_SUPABASE_URL` y preferentemente `VITE_SUPABASE_PUBLISHABLE_KEY`; conserva compatibilidad con `VITE_SUPABASE_ANON_KEY`.
- `src/game/data/`: datos editables de enemigos, items, niveles y progresion.
- `src/game/data/levels.ts`: contrato publico y agregador de niveles; cada region vive en `src/game/data/levels/` y comparte solo helpers de construccion.
- `src/game/data/characters.ts`: datos editables de personajes jugables.
- `src/game/data/music.ts`: catalogo de pistas y regla de intensidad musical por numero de etapa.
- `src/game/data/sfx.ts`: catalogo, volumen, variantes, pitch y cooldown de cada efecto.
- `src/game/data/powerShop.ts`: paquetes, costos y textos compartidos por la tienda del menu y la compra durante gameplay.
- `src/game/data/achievements.ts`: definiciones, textos, objetivos y lectura de progreso de los logros.
- `src/game/systems/achievements/AchievementSystem.ts`: registra derrotas y finalizaciones validas, y desbloquea logros sin depender de React.
- `src/ui/components/AchievementUnlockToast.tsx`: aviso React en cola para logros desbloqueados durante gameplay; recibe eventos tipados desde Phaser y no contiene logica de concesion.
- `src/ui/components/SaveSyncStatus.tsx`: aviso React compacto del estado remoto; muestra carga, guardado y confirmacion breve fuera del gameplay, conserva los errores visibles en cualquier pantalla y ofrece el reintento explicito de `GameSaveStore`.
- `src/ui/hooks/usePhaserGame.ts`: importa e inicia Phaser solo despues de autenticar; destruye la instancia al cerrar sesion y permite reintentar una carga fallida.
- `src/assets/characters/portraits/`: retratos WebP optimizados usados por las cards y fichas de heroes; las fuentes maestras pueden archivarse fuera del repositorio.
- `src/assets/characters/faust.png`: hoja normalizada 96x80 de Faust con 45 cuadros para reposo, carrera, salto, caida, ataque, dano y muerte. Incluye intermedios deterministas para suavizar el movimiento sin cambiar su identidad y se regenera junto con `faust-animation.json` mediante `scripts/prepare-faust-assets.py`; si las fuentes ya estan fuera del repo, pasar su carpeta como primer argumento.
- `src/assets/weapons/sword-1.png`: arma separada de Faust. `weapons.ts` define su aspecto y los anclajes por cuadro para que el cuerpo no dependa de una espada concreta.
- `src/assets/menu/`: fondo, controles y arte WebP optimizados del menu principal; `mode-explore.webp` presenta visualmente el modo Explorar. Las fuentes maestras pueden archivarse fuera del repositorio.
- `src/assets/ui/profile-icons/`: nueve iconos de perfil autocontenidos; `profileIcons.ts` no depende de la carpeta de diseños.
- `src/assets/enemies/m3-run-1.png` a `m3-run-5.png`: cinco cuadros transparentes y alineados de carrera lateral de M3; las fuentes maestras pueden archivarse fuera del repositorio.
- `src/assets/scenery/enchanted-forest/`: fondo y cuatro arboles por capas de Bosque encantado; las fuentes maestras pueden archivarse fuera del repositorio.
- `src/assets/scenery/active-volcano/`: fondo y capa media usados por Volcan Activo; la hoja de capa media se recorta en runtime para distribuir cuatro islas de parallax.
- `src/assets/enemies/active-volcano-m2/`: hojas fuente de vuelo y ataque del M2 volcanico; `PreloadScene` las separa, limpia sus indices y normaliza a cuadros 320x320.
- `src/assets/enemies/enchanted-m2/`: diez poses fuente del M2 de Bosque encantado, normalizadas a cuadros 320x320 durante `PreloadScene`; los originales pueden archivarse fuera del repositorio.
- `src/assets/enemies/enchanted-m3/`: siete poses de E2M3 para reposo, carrera, ataque y derrota; los originales pueden archivarse fuera del repositorio.
- `src/game/entities/enemies/M3Enemy.ts`: enemigo perseguidor M3 con estados de alerta, persecucion, salto, ataque, recuperacion, dano y derrota; tiene dos puntos de vida, barra propia y navegacion preventiva de bordes/plataformas.
- `src/game/scenes/preload/loadSceneAssets.ts`: registra las rutas y claves de assets; `PreloadScene` conserva la generacion de texturas y animaciones.
- `src/game/scenes/level/LevelRunTracker.ts`: cuenta tiempo/acciones del intento y aplica estadisticas una sola vez; `LevelScene` conserva la orquestacion jugable.
- `src/game/entities/platforms/MovingPlatform.ts`: plataforma fisica movil que transporta entidades y sincroniza su representacion de piedra.
- `src/shared/types/`: tipos compartidos entre React, Phaser y sistemas.
- `src/shared/constants/`: constantes compartidas.
- `src/shared/music/GameMusic.ts`: reproduccion, desbloqueo tras gesto, persistencia de encendido/volumen y crossfade de la musica de fondo.
- `src/shared/sfx/GameSfx.ts`: precarga, cache decodificada, mezcla y persistencia de encendido/volumen de Sonido.
- `src/ui/components/`: componentes React reutilizables.
- `src/ui/screens/`: pantallas React.
- `src/ui/screens/LevelSummaryScreen.tsx`: resumen animado posterior a cada meta; presenta estadisticas reales, logros del recorrido y avance manual con tema por region.
- `src/ui/screens/PowerShopScreen.tsx`: compra pausada de cargas desde los botones de poder durante gameplay; confirma la operacion y ofrece continuar o volver al menu.

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

- Ver primero una intro de video de 4,5 segundos que cubre la carga inicial y cierra con una transicion cinematografica hacia el menu; si el motor tarda mas, conserva la intro con un estado discreto hasta que el destino esta listo.
- Abrir menu principal.
- Ver el menu principal ilustrado con marco, fondo nocturno y botones graficos funcionales, adaptado a desktop y landscape movil.
- El menu principal suma ambiente CSS liviano: seis hojas con deriva lenta, dos destellos espaciados y una pequeña estela luminosa que recorre el contorno fijo de `Iniciar juego` mediante `offset-path`. No rotar el borde completo del boton. Debe respetar `prefers-reduced-motion` y ocultarse en el perfil mobile Rendimiento; no convertirlo en particulas Phaser ni agregar video/canvas extra al menu.
- En landscape movil, el titulo del menu principal queda centrado arriba y los cuatro accesos se distribuyen en una grilla de dos columnas por dos filas.
- Ver cuatro accesos graficos compactos en el menu principal: Iniciar juego, Personaje, Inventario y Logros. Logros usa `src/assets/menu/menu-achievements.webp` y abre una sala de trofeos responsive con progreso real.
- Las nueve cabeceras internas del menu usan `MenuHeading` con un unico titulo centrado y el retorno convencional a la izquierda. Comparten la textura de madera `src/assets/menu/fondo100.jpg`, pero cada variante desplaza el fondo para mostrar un recorte diferente; no volver a agregar subtitulos/eyebrows dentro de estas cabeceras. La cabecera permanece visible al desplazar contenido y, en landscape mobile, las tabs principales de perfil, logros e inventario quedan accesibles debajo.
- Abrir desde la esquina superior izquierda una pagina completa de perfil con estetica derivada de la sala de Logros y paginas intercambiables `Editar perfil` y `Estadisticas`. Editar perfil permite cambiar un nombre persistente de 2 a 20 caracteres, consultar el correo y elegir uno de nueve iconos sin nombres visibles. Estadisticas combina progreso historico existente con tiempo activo, acciones, APM promedio, intentos, metas y derrotas acumulados al cerrar cada recorrido.
- Desbloquear veinte logros: ocho faciles y doce medios, distribuidos en `Aventura`, `Combate` y `Descubrimiento`.
- Ver cada logro nuevo durante la partida mediante una tarjeta animada `Logro desbloqueado` con icono y nombre. Si se obtienen varios a la vez, React los presenta en cola sin superponerlos.
- Ver cada subida mediante una tarjeta superior `Nivel aumentado` con el nuevo LV y sus recompensas ya acreditadas. Subidas y logros comparten una unica cola React: nunca se superponen y cada aviso espera a que termine el anterior.
- La sala de logros divide las veinte definiciones en subpaginas internas para `Aventura`, `Combate` y `Descubrimiento`, siguiendo el patron de tabs del inventario; usa iconos SVG semanticos compartidos con los avisos, tarjetas compactas y una paleta marron/dorada coherente con el menu.
- Las tarjetas de los logros faciles muestran un pequeno rayo visual debajo de su icono, sin etiqueta ni explicacion textual.
- Cada categoria incorpora cuatro logros medios con dos rayos. Incluyen progreso acumulado, objetivos por intento, cobertura de ambas regiones y rachas de tres dias consecutivos para avance de nivel y apertura de cajas.
- Cada logro concede una recompensa pequena definida junto a su contenido: ORO, XP o cargas de regeneracion/poder letal para el heroe activo. `AchievementSystem` la aplica exactamente una vez al desbloquear el ID.
- El aviso de desbloqueo, la tarjeta de la sala y el resumen de nivel muestran la recompensa. Durante gameplay, el HUD anima `+ ORO` o `+ XP` junto al contador correspondiente y los controles de poder animan las cargas recibidas.
- Crear cuenta o entrar con email/password antes de jugar.
- Elegir personaje jugable desde el boton Personaje del menu principal.
- En una cuenta nueva o reiniciada, completar primero la pantalla obligatoria `Elige tu heroe`; solo Dunel, Ruder y Sarix pueden elegirse inicialmente, Amy y Faust aparecen bloqueados, y solo el elegido queda desbloqueado.
- Tras esa primera eleccion, entrar directamente a la seleccion de modos y destacar `Explorar` una sola vez. Las cuentas con heroe principal ya definido deben seguir iniciando en el menu principal.
- Desbloquear heroes restantes desde su ficha `Ver`, con confirmacion previa y una progresion global: #1 requiere LV4/700 ORO, #2 LV8/7000, #3 LV12/70000 y desde #4 se conserva LV12 mientras el precio se duplica a 140000, 280000 y sucesivos.
- Abrir inventario del jugador desde el boton Inventario del menu principal.
- Abrir opciones desde la tuerca junto a Menu principal.
- Ver en Opciones el acceso `Sonido y musica`; su pagina interna permite encender o apagar cada sistema y ajustar independientemente su intensidad de 0 a 100. Los valores iniciales son 75% para Sonido y 50% para Musica, y las cuatro preferencias persisten localmente incluso al cerrar sesion.
- Salir de la cuenta desde la seccion Cuenta dentro de Opciones; el acceso ya no vive junto a la tuerca del menu principal.
- Reiniciar todo el progreso desde Opciones con confirmacion destructiva, conservando la cuenta de autenticacion pero restaurando el save inicial.
- Abrir seleccion de modo Explorar desde Iniciar juego.
- Ver el modo Explorar presentado con arte propio de aventura en su tarjeta `Campana del continente`; Desafio y Arena conservan su presentacion bloqueada.
- En el explorador, el mapa de regiones izquierdo se escala completo al espacio disponible y no tiene scroll; la lista de niveles derecha conserva cabecera fija y scroll independiente. El contenedor general no debe capturar el desplazamiento de niveles.
- Elegir niveles desbloqueados desde Frontera Verde.
- Jugar los niveles 1 a 10 de Frontera Verde.
- Seleccionar Bosque encantado como segunda region y jugar sus niveles 1 a 10; solo `Umbral encantado` comienza desbloqueado y los siguientes se abren en cadena.
- Seleccionar Volcan Activo como tercera region y jugar `Umbral de ceniza`, `Rios de magma` y `Furia del crater`; solo LV1 comienza desbloqueado y LV3 cierra temporalmente la region.
- Recorrer Bosque encantado sobre piedra verde azulada con musgo y raices, con el fondo y cuatro arboles propios distribuidos en capas de parallax.
- Enfrentar en `Umbral encantado` dos M0 inmoviles con aspecto de guardianes de musgo y dos M1 perseguidores con aspecto de criaturas de corteza; su comportamiento sigue reutilizando `BasicEnemy` y `M1Enemy`.
- Enfrentar un M2 de Bosque encantado que reutiliza la IA aerea existente y sincroniza poses propias de vuelo, frenado/preparacion, picada, recuperacion y explosion. El ave fuente mira a la izquierda; `M2Enemy` usa `flipX` cuando avanza a la derecha e inclina el sprite segun la trayectoria real de picada.
- Enfrentar a E2M3 desde LV3 de Bosque encantado. Reutiliza la IA completa, dos puntos de vida y barra de M3, pero sincroniza poses propias de reposo, carrera, ataque y explosion, con carga verde y estela durante la embestida. LV6-LV10 aumentan su presencia de 4 a 8 ejemplares y su inteligencia de 0.84 a 1.00.
- Mover personaje.
- Saltar.
- Atacar cuerpo a cuerpo.
- Ver una estela visual de espada con ventana breve de dano al atacar.
- Enfrentar al enemigo basico rojo M0 como obstaculo quieto.
- Derrotar al monstruo M1 con espada o saltando encima; durante la persecucion comprueba bordes y solo salta pozos con llegada posible.
- Esquivar o golpear al ave M2, que ahora acecha y avisa brevemente antes de cada picada directa.
- Enfrentar a M3 desde el nivel 6; los niveles 7 a 10 reducen criaturas y peligros secundarios para dar mayor presencia a este enemigo.
- Ver a M3 perseguir al jugador en ambas direcciones con un ciclo lateral de cinco cuadros y una escala visual cercana a la del heroe.
- Ver a M3 alertarse una sola vez al adquirir objetivo, recordar brevemente su ultima posicion, perseguir a 140 px/s y preparar una embestida de hasta 180 px/s antes de poder danar por contacto.
- Dañar a M3 con dos ataques normales o dos giros de espada; cada impacto vacia la mitad de su barra roja fina. El poder letal conserva su comportamiento de eliminacion inmediata.
- Ver a M3 detectar el final de las plataformas: salta si existe una superficie alcanzable al otro lado y se detiene si el salto no es seguro.
- Ver un pequeno efecto visual de explosion al derrotar monstruos.
- Escuchar musica medieval tranquila en el menu, aventura orquestal en LV1-LV3, una marcha mas tensa en LV4-LV6 y una pieza intensa en LV7-LV10. Cada cambio usa una mezcla gradual, no un corte seco.
- Escuchar efectos medievales/rudos sincronizados con botones, salto ejecutado, espada, giro, poderes, impactos reales, derrotas, dano, ORO, pickups, checkpoints, progreso, meta y game over. Los controles de movimiento no deben emitir clics de UI adicionales.
- El efecto musical de meta puede terminar naturalmente mientras se mira el resumen, pero `Proximo` o `Finalizar` deben cancelarlo inmediatamente antes de abandonar esa pantalla.
- Ejecutar con `K` un giro completo de espada con alcance circular de 128 px, daño unico por enemigo y 6 segundos de recarga. No consume cargas ni ORO; conserva `player.rangedDamage` como clave interna compatible para sus mejoras y combina ese valor con el daño melee vigente. Phaser publica en `HudState.spinCooldownRemainingMs` la recarga basada en su propio reloj para que se congele correctamente al pausar; los botones K mobile/desktop muestran anillo radial y segundos restantes.
- Regenerar la vida hasta el maximo de 4 consumiendo una carga persistente; cada personaje comienza con 3 cargas propias.
- La salud maxima comienza en 4, aumenta permanentemente a 5 en LV6, a 6 en LV10 y a 7 en LV15; no aumenta mediante objetos temporales del escenario.
- Desde LV3 hasta LV10 aparece exactamente un corazon de salud temporal por nivel, siempre solo entre el 60% y el 80% del recorrido. Cura 1 punto sin superar el maximo actual, desaparece al tocarlo, dispara un pulso y mensaje en el HUD, y reaparece al reiniciar porque no se persiste.
- Lanzar un poder horizontal en la direccion hacia la que mira el heroe; recorre la pantalla hacia izquierda o derecha, atraviesa el escenario, explota al interceptar un monstruo y lo elimina. Cada personaje nuevo comienza con 5 cargas propias.
- Ver los poderes desktop sobre la esquina inferior derecha interior del canvas. Cada uno conserva su activacion directa y suma un boton `+` independiente para abrir la compra de sus cargas.
- Comprar cargas durante gameplay con la escena, fisica y reloj pausados. Tras confirmar una compra valida, elegir entre continuar con los contadores actualizados o regresar al menu.
- Recibir dano.
- Cada perdida real de salud dispara un golpe visual global: tinte rojo sobre canvas y UI durante 1 segundo y una sacudida breve de camara. Debe activarse tambien por pozos, presion y dano letal, pero no durante contactos bloqueados por invulnerabilidad.
- Derrotar enemigos.
- Ganar experiencia.
- Subir desde LV1 hasta el maximo LV80 mediante una curva gradual de aproximadamente 2.36 millones de XP acumulada; los primeros niveles son rapidos y los tramos altos estan pensados para progreso de largo plazo.
- Recibir recompensas unicas de progresion en LV1-LV5: kit 3/5 en LV1, +1 dano melee en LV2, +10 velocidad en LV3, 100 ORO + 1 regeneracion en LV4, y 150 ORO + 2 regeneraciones + 3 poderes letales en LV5.
- Recibir recompensas unicas de progresion en LV6-LV10: +1 vida maxima en LV6, +10 velocidad en LV7, 5 regeneraciones + 8000 ORO en LV8, +1 dano melee en LV9 y +1 vida maxima en LV10.
- Recibir recompensas unicas de progresion en LV11-LV15: +1 dano a distancia en LV11, 10000 ORO + 10 poderes letales en LV12, +10 velocidad en LV13, 12000 ORO + 5 regeneraciones + 10 poderes letales en LV14, y +1 vida maxima + 15000 ORO en LV15.
- Recoger ORO.
- Recoger piezas de ORO estaticas distribuidas de principio a fin; cada una vale entre 1 y 3 y se persiste inmediatamente en `save.player.coins`.
- Recibir ORO variable al derrotar monstruos: M0 entrega 2-4, M1 entrega 4-7, M2 entrega 7-10 y M3 entrega 12-16.
- Gastar ORO desde la ficha `Ver` de cada heroe para comprar cargas de regeneracion o ataque letal con confirmacion previa.
- Recoger piezas de inventario en el mapa.
- Encontrar una caja de recompensa unica en cada nivel; permanece en reintentos hasta recogerla y luego no vuelve a aparecer.
- Recibir al azar un objeto valido de inventario al abrir cada caja y conservarlo en el guardado remoto.
- Activar checkpoint y reaparecer alli al reintentar el mismo nivel; la camara y la presion se reposicionan de forma segura.
- Los huecos del suelo siempre son pozos atravesables: el borde inferior del mundo no actua como piso. Caer descuenta exactamente 1 punto de salud y reaparece al jugador sobre suelo seguro junto a la linea roja izquierda, conservando el progreso visible actual en vez de volver al inicio o checkpoint.
- Un Game Over definitivo limpia `checkpointId`: `Reintentar` conserva el mismo nivel seleccionado pero siempre comienza desde `playerStart`. El checkpoint solo sirve para continuar mientras la partida del nivel sigue activa.
- `ACTIVE_LEVEL_CHANGED` mantiene en React el `levelId` real de la partida. `RESTART_GAME` debe enviarlo explicitamente para que derrota, victoria y pausa reinicien el mismo nivel y nunca usen silenciosamente Frontera Verde como seleccion anterior.
- Llegar a la meta.
- Avanzar en cadena del nivel 1 al nivel 10 al completar cada meta.
- Desde el nivel 4, cruzar plataformas de piedra que se mueven horizontal o verticalmente.
- Saltar desde plataformas moviles; el estado de suelo contempla `blocked.down` y `touching.down` mediante `Player.isGrounded()`.
- Afrontar una progresion escalonada: LV1-LV3 introducen peligros con densidad creciente, LV4-LV5 combinan plataformas moviles y LV6-LV10 reducen peligros secundarios para centrar el desafio en M3.
- En los niveles 5 y 6, esquivar peligros que quitan dos vidas y sierras letales de tres vidas.
- En los niveles 7 a 10, afrontar la serie `Caceria del Coloso I-IV`, dominada por M3 y con menos peligros ofensivos secundarios que los niveles anteriores.
- Ver al completar cada nivel un resumen animado con monstruos derrotados, tiempo activo del recorrido, ORO recogido, APM del intento, logros desbloqueados, nivel superado y siguiente destino. La partida solo avanza al pulsar `Proximo`; el ultimo nivel usa `Finalizar`.
- Ver victoria.
- Ver game over.
- Antes de abrir Game Over, reproducir la animacion de derrota completa durante 620 ms con la fisica del jugador deshabilitada; `Player.markDefeated()` cubre tambien derrotas por tiempo o presion que no pasan por `takeDamage()`.
- Pausar.
- La pantalla de pausa abre siempre primero su panel normal. Dentro de ese panel, una tuerca grafica igual a la del menu abre ajustes locales de `Sonido y musica` y `Controles`; `Aceptar` y `Volver a pausa` regresan exclusivamente al panel pausado, sin reanudar ni abandonar la partida. No expone Cuenta ni el reinicio destructivo del progreso.
- Guardar progreso basico en `public.game_saves` para el usuario autenticado.
- Ver un estado compacto de sincronizacion remota. `Sincronizado` desaparece tras una confirmacion breve; los errores permanecen con `Reintentar` y nunca se mezclan con los errores del formulario de autenticacion.
- Guardar el personaje seleccionado en `public.game_saves`.
- Guardar piezas recogidas en el inventario persistente.
- Ver los niveles 1 a 10 como completados, pendientes o bloqueados en la interfaz de exploracion.
- Desbloquear automaticamente el nivel 7 al normalizar una partida existente que ya tenga completado el nivel 6.

## Personajes jugables

- Personaje inicial y fallback: Ruder.
- Personajes disponibles actuales: Ruder, Amy, Dunel, Sarix y Faust.
- La seleccion se guarda como `selectedCharacterId` dentro de `SaveData`.
- `primaryCharacterId` registra la eleccion inicial y `unlockedCharacterIds` controla que heroes pueden seleccionarse.
- Cada personaje conserva cargas independientes en `SaveData.characterPowerCharges`; cambiar de heroe actualiza inmediatamente los contadores sin compartir consumos.
- La pantalla Elegir heroe usa un carrusel circular de los cinco retratos WebP: los heroes desbloqueados siempre se agrupan primero y los bloqueados quedan despues; en una cuenta nueva el orden inicial comienza Dunel, Ruder, Sarix, Amy y Faust. Solo el heroe central aparece en primer plano; los anteriores/siguientes quedan apilados atras con escala, profundidad y desenfoque. Se navega con flechas, teclado, rueda, indicadores o deslizamiento tactil; solo la card central selecciona al personaje y conserva el boton `Ver`.
- Las cards bloqueadas oscurecen, desaturan y difuminan con fuerza el retrato, y muestran un candado grande centrado ademas de la etiqueta compacta con nivel/precio. No usar solo color o una cifra pequena para comunicar el bloqueo.
- `Ver` abre una ficha interna con las dos cantidades de poderes y el acceso a la tienda de ORO.
- Dentro de la tienda, seleccionar un paquete solo prepara la operacion; el dialogo muestra heroe, cantidad y costo antes de permitir confirmar o cancelar.
- Durante la eleccion inicial no hay salida al menu ni botones `Ver`: cualquiera de los cinco heroes puede llevarse al centro del carrusel y elegirse como principal.
- Tras elegirlo, los otros cuatro heroes quedan bloqueados, conservan `Ver` y comparten el requisito del proximo desbloqueo global; comprar uno no libera ni abarata los restantes.
- `src/game/data/characterUnlocks.ts` es la unica fuente de heroes iniciales, nivel requerido y costo creciente. `App.tsx` vuelve a calcular el requisito al confirmar para que la UI no pueda enviar un precio obsoleto o menor.
- `src/game/data/characters.ts` define nombre, textura y prefijo de animacion por personaje.
- `PreloadScene` normaliza los spritesheets de Amy, Dunel y Sarix a la misma grilla jugable 96x80 que Ruder. Faust ya ingresa como hoja 96x80 preparada desde sus fuentes independientes.
- Faust usa `Espada 1` como `EquippedWeapon`: el arma se renderiza separada del cuerpo, sigue la mano derecha mediante los 45 anclajes de `faust-animation.json`, interpola posicion y giro por frame del motor y refleja ambos al cambiar de direccion. El giro `K` agrega su propia representacion radial temporal sin hornear la espada dentro del personaje.
- Las futuras espadas deben agregarse en `src/game/data/weapons.ts` y cargarse en `PreloadScene`; no volver a hornearlas dentro de los cuadros de Faust.
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
- La tienda por personaje vende regeneracion en paquetes 3/350, 5/490 y 12/750 ORO; ataque letal en paquetes 10/200, 25/390 y 60/750 ORO.
- `powerShop.ts` es la unica fuente de esos paquetes tanto en la ficha del heroe como durante la partida; no duplicar precios en componentes React.
- Elegir un paquete nunca compra directamente: debe abrir `Confirmar compra`, y solo esa confirmacion descuenta ORO y suma cargas.
- Cada nivel define una sola `rewardBox`; sus recompensas posibles son los items con `inventoryCategory` en `items.ts`.
- `SaveData.claimedRewardBoxes` registra las cajas ya abiertas para que no reaparezcan en partidas posteriores.
- `SaveData.achievements` guarda IDs desbloqueados, acumulados de combate/ORO, niveles perfectos, enemigos conocidos, checkpoints unicos y rachas diarias; la UI solo representa esos datos y no concede logros.
- Las recompensas de logros se conceden en `AchievementSystem`, nunca desde React. Los poderes premiados pertenecen a `save.selectedCharacterId` en el momento del desbloqueo.

## Controles actuales

Desktop:

- Izquierda: flecha izquierda o `A`.
- Derecha: flecha derecha o `D`.
- Salto: flecha arriba, `W` o espacio.
- Ataque cuerpo a cuerpo: `J`.
- Ataque giratorio: `K`.
- Regenerar vida: `Q`.
- Poder letal: `E`.
- Pausa: `P` o `Esc`.

Mobile:

- Controles tactiles en `MobileControls`.
- Opciones > Controles moviles permite elegir de forma persistente entre `Comando 1` y `Comando 2` sin modificar el save remoto. La pantalla muestra una previsualizacion fiel de cada distribucion y cambia inmediatamente el panel inferior al perfil seleccionado.
- Cada comando conserva de forma independiente tamano, separacion, opacidad, posicion de movimiento, posicion de ataques y modo zurdo. Cambiar o restaurar un comando no debe modificar el otro; vibracion y rendimiento siguen siendo ajustes generales compartidos.
- `Comando 1`: conserva dos controles translucidos de movimiento a la izquierda y una fila compacta de espada, giro, regeneracion y poder letal a la derecha. El salto no tiene boton visible: cualquier `pointerdown` sobre un area libre de la mitad derecha que no sea un boton/control interactivo encola `jump` mediante `TouchInputStore`, incluso mientras otro dedo mantiene movimiento.
- `Comando 2`: usa un joystick de tres extremos en el lado de movimiento. Arrastrar a izquierda/derecha mantiene esa direccion, entrar en el extremo superior encola salto y una diagonal permite avanzar y saltar a la vez. Un toque libre en la mitad del joystick tambien salta; un toque corto sobre el propio joystick salta al soltar sin convertir cada arrastre en un salto accidental.
- En `Comando 2`, el ataque de espada J es el boton principal grande del lado de acciones; giro K, regeneracion Q y poder letal E son tres botones menores alrededor. Conservan recarga, disponibilidad, contadores y feedback de recompensas existentes.
- El modo zurdo intercambia completos los lados de movimiento y acciones en ambos esquemas. En `Comando 2`, el area libre de salto acompana al lado del joystick.
- Pausa: icono SVG arriba a la derecha.
- En vertical aparece aviso de orientacion y se ocultan controles.
- En horizontal movil aparece HUD compacto arriba izquierda y controles abajo.
- Durante gameplay React monta un solo conjunto de controles: `MobileControls` para puntero tactil o viewport compacto, y `AbilityControls` para escritorio amplio con puntero fino. No volver a montar ambos y depender solo de CSS para ocultar uno.
- En desktop, `AbilityControls` incluye primero los botones J/K de 42 px y despues los poderes Q/E de 58 px. J/K deben permanecer visualmente menores que los poderes especiales; K comparte el mismo indicador de recarga que mobile.
- `MOBILE_GAMEPLAY_QUERY` en `shared/constants/game.ts` es la fuente comun que decide controles y zoom; no duplicar la media query entre React y Phaser.
- Opciones muestra `Comandos` solo cuando `MOBILE_GAMEPLAY_QUERY` no activa el perfil mobile. `KeyboardBindingStore` persiste localmente dos teclas configurables por accion, impide duplicados entre acciones y notifica cambios para actualizar en vivo las etiquetas J/K/Q/E de la interfaz. `GameplayInputSystem` toma ese mapa al crear cada recorrido; no volver a hardcodear teclas dentro de la escena.
- Los comandos iniciales son A/Flecha izquierda, D/Flecha derecha, Espacio/W, J, K, Q, E y P/Esc. Cada accion debe conservar al menos una asignacion; Retroceso o Supr liberan una casilla y `Restaurar` recupera los defaults.

## Sistema de input

El input esta unificado. No volver a leer teclado directamente desde `MovementSystem` ni desde entidades.

- `src/shared/types/input.ts`: define `GameplayInputState` y `GameplayInputFrame`.
- `src/game/systems/input/TouchInputStore.ts`: estado tactil global y cola de taps rapidos.
- `src/game/systems/input/GameplayInputSystem.ts`: combina teclado + tactil en un frame de input.
- `src/game/systems/movement/MovementSystem.ts`: consume `GameplayInputFrame`.
- `MovementSystem` conserva cada pulsacion de salto durante 120 ms y permite 100 ms de gracia al abandonar una superficie. Mantener ambas tolerancias para que teclado y tactil no pierdan saltos cerca del aterrizaje o del borde.
- El apoyo no debe exigir `velocity.y >= 0`: las plataformas flotantes ascendentes pueden transmitir una velocidad negativa moderada mientras el jugador sigue sobre ellas. `MovementSystem` solo considera ascenso propio cuando supera el 45% del impulso de salto, manteniendo el salto disponible sobre piezas estaticas y moviles de las tres regiones sin habilitar dobles saltos.
- `src/game/scenes/LevelScene.ts`: lee input una vez por frame y lo pasa a movimiento/acciones.
- `GameSfx` es la unica capa de efectos. Phaser solicita cues semanticos por `SFX_REQUESTED` en el `EventBus` y React los reproduce por el mismo contexto Web Audio que usa la UI; escenas y sistemas no crean nodos ni cargan archivos directamente. El salto suena solo cuando `MovementSystem` confirma que se ejecuto, y los impactos suenan solo cuando hubo dano real.
- `AbilityControls` muestra los poderes clicables en desktop; `MobileControls` integra sus equivalentes tactiles y ambos escriben en `TouchInputStore`.
- Los poderes se representan con badges circulares compactos, iconos SVG, tecla y contador; mantener esta lectura visual tanto en desktop como en controles tactiles.
- En desktop, el `+` de compra es un control hermano del boton de activacion: debe seguir disponible aunque la carga este agotada o regenerar este deshabilitado por vida completa.

Regla importante: toda nueva entrada jugable debe agregarse primero al input unificado, no como acceso directo a DOM, teclado o pointer desde la escena.

## Estado mobile y Android

El proyecto todavia no esta empaquetado con Capacitor. Esta preparado a nivel web/mobile para ese paso.

Ya existe:

- PWA instalable en Android y iOS con nombre, colores e iconos propios.
- Modo `fullscreen`, orientacion `landscape`, `viewport-fit=cover` y metadatos para la pantalla de inicio.
- Service worker de produccion que precarga el cliente del juego y limpia caches antiguos.
- Actualizacion manual mediante aviso React; no cambiar a recarga automatica mientras pueda interrumpir una partida.
- Boton de instalacion propio en telefonos: solo se muestra fuera del modo instalado y fuera del gameplay activo; usa `beforeinstallprompt` cuando esta disponible y ofrece instrucciones manuales en iOS u otros navegadores.
- Canvas responsive con Phaser `Scale.FIT`.
- Bloqueo de scroll/overscroll en CSS.
- `touch-action: none` para evitar gestos molestos durante la partida.
- Controles tactiles.
- Aviso en vertical.
- Layout landscape movil.
- Camara de gameplay con zoom `1.15` en el mismo perfil mobile/compacto que activa `MobileControls`; escritorio conserva `1.0`. Mobile extiende visualmente el terreno 160 unidades hacia abajo y desplaza la camara sobre esa continuidad para elevar suelo, heroe y escenario por encima de los controles. Los calculos de seguimiento usan el ancho mundial visible despues del zoom para mantener los limites laterales correctos.
- El perfil mobile ofrece Calidad 90%, Equilibrado 75% (`960x540`) y Rendimiento 62,5%; Equilibrado es el default. `game/main.ts` redimensiona Phaser al cambiar el ajuste y `CameraSystem` compensa siempre el factor tanto en zoom como en el borde mundial superior visible para conservar el acercamiento `1.15`, elevar suelo/personajes y mantener el mismo campo visual. Rendimiento tambien elimina blur/sombras costosas durante partida; no desacoplar resolucion y compensacion de camara.
- Opciones muestra `Controles moviles` exclusivamente bajo el perfil mobile. `MobileGameplaySettings` persiste tamaño, separacion, opacidad, desplazamiento de ambos bloques, modo zurdo, vibracion y perfil de rendimiento; React aplica los valores mediante variables CSS sin modificar hitboxes ni logica jugable.
- Los toques validos de salto libre muestran un pulso local en la mitad derecha. `MobileActionBuffer` conserva J/K durante 120 ms solo en mobile; desktop mantiene input inmediato. `GameHaptics` usa `navigator.vibrate` cuando existe y esta habilitado para salto ejecutado, ataque, giro, daño real y fin de recarga.
- La linea roja se posiciona cada frame sobre el borde mundial realmente visible, compensando zoom y scroll. Su limite de dano usa el borde derecho de esa misma linea; no volver a calcular el contacto solo desde `camera.scrollX`.
- Uso de `env(safe-area-inset-*)` para notch/barras del sistema.

La PWA mejora instalacion, carga repetida y disponibilidad del cliente web, pero no convierte el guardado remoto en offline: autenticacion y progreso siguen necesitando Supabase. No agregar cache para sus endpoints ni restaurar progreso local como sustituto.

Pendiente antes de Play Store:

- Instalar y configurar Capacitor.
- Crear proyecto Android.
- Definir package id.
- Configurar iconos y splash screen.
- Activar fullscreen nativo.
- Generar `.aab`.
- Firmar build de produccion.
- Probar en dispositivo fisico Android.
- Completar identidad/verificacion del desarrollador, politica de privacidad, Data safety, clasificacion de contenido y demas declaraciones externas de Play Console. Consultar `docs/android-pwa-readiness.md`; no afirmar certificacion desde el codigo web.

## Datos editables

No hardcodear nuevos enemigos, items o niveles dentro de `LevelScene` si pueden vivir como datos.

- Enemigos: `src/game/data/enemies.ts`.
- Personajes: `src/game/data/characters.ts`.
- Items: `src/game/data/items.ts`.
- Niveles: contrato en `src/game/data/levels.ts` y definiciones regionales en `src/game/data/levels/`.
- Experiencia y habilidades: `src/game/data/progression.ts`.

Para agregar un enemigo:

1. Agregar definicion en `enemies.ts`.
2. Si sirve la IA basica, agregar spawn en `levels.ts`.
3. Si necesita IA propia, crear clase en `src/game/entities/enemies/` extendiendo `BaseEnemy`.
4. Para M2, usar `aggression` en `levels.ts` si el nivel debe hacerlo atacar mas rapido y con menos pausa entre picadas.
5. Para M3, conservar la IA en `M3Enemy`: no convertir su persecucion, animacion, barra de vida ni deteccion de bordes en logica especial dentro de `LevelScene`.

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
2. Asignar `theme` para seleccionar la familia visual correcta; los valores actuales son `verdant-frontier`, `enchanted-forest` y `active-volcano`.
3. Usar `nextLevelId` si completar ese nivel debe encadenar con otro.
4. Mantener plataformas, enemigos, ORO, checkpoint y meta como datos.
5. Definir una `rewardBox` con ID unico y posicion alcanzable.
6. Agregar el nivel a la region correspondiente de `MainMenuScreen.tsx` y a la secuencia de normalizacion de `SaveDefaults.ts` cuando corresponda.
7. Mas adelante migrar a Tiled en `src/assets/maps/` sin romper la interfaz de `LevelDefinition`.

Para agregar plataformas moviles:

1. Mantener la plataforma dentro de `platforms` en `levels.ts`.
2. Agregar `movement` con `axis`, `distance` y `speed` solo a las piedras que deban moverse.
3. No crear tweens de plataformas dentro de `LevelScene`; la fisica y el movimiento pertenecen a `MovingPlatform`.
4. Combinar la plataforma movil con pozos, pinchos o sierras solo desde los datos del nivel.

## Proceso replicable para crear una region

Esta seccion resume la construccion de Bosque encantado y convierte sus decisiones en un flujo reutilizable. El objetivo es que una region nueva comparta sistemas de gameplay sin convertirse en una copia visual ni introducir estados globales que apunten a la region anterior.

### Decisiones de arquitectura tomadas

- Una region no requiere una escena Phaser nueva. `LevelScene` sigue siendo el orquestador y `LevelDefinition.theme` selecciona la familia visual.
- La identidad de la region vive en assets, parallax, terreno, decoracion y skins; tiempo, progreso, camara, presion roja, checkpoint, meta, guardado y colisiones se reutilizan.
- Los niveles permanecen en los modulos regionales agregados por `levels.ts`. No crear arrays de plataformas, enemigos o peligros dentro de `LevelScene`.
- El mapa y sus listas de niveles viven en React, dentro de `src/ui/screens/main-menu/ExploreView.tsx`. Cada region declara sus propios `LevelSlot`.
- El mapa de Explorar usa `src/assets/menu/explore-map/complete.webp` como base y siete recortes regionales alineados. Los nombres no se escriben sobre la ilustracion: hover, foco o clic resaltan el recorte y el titulo correcto aparece en el panel derecho. Las fuentes maestras pueden archivarse fuera del repositorio.
- El primer nivel de cada region se agrega a `levelSequences` en `SaveDefaults.ts`. La normalizacion debe desbloquearlo tanto en saves nuevos como existentes.
- Los enemigos reutilizados aceptan una textura por tema. `BasicEnemy` y `M1Enemy` conservan IA, stats, dano y recompensas; solo cambia su `textureKey`.
- Si un enemigo tematico tiene varias poses, la IA sigue siendo la fuente del estado y la animacion solo lo representa. No crear temporizadores visuales paralelos que puedan desincronizar ataque, recuperacion o muerte.
- CSS sirve para diferenciar la UI React de seleccion de region. Las entidades dentro del canvas no pueden estilizarse individualmente con CSS: sus skins deben cargarse o generarse en Phaser mediante `PreloadScene`.
- Las pruebas visuales siguen a cargo del usuario. El agente entrega auditoria y build, e indica la comprobacion manual pendiente.

### Orden optimizado de implementacion

1. Revisar `git status --short` y no restaurar, mover ni borrar assets fuente que el usuario haya reorganizado.
2. Definir un ID estable de tema y region. Para Bosque encantado se usa `theme: "enchanted-forest"` y el primer nivel es `enchantedGrove1`.
3. Inspeccionar dimensiones, transparencia y funcion de los assets antes de copiarlos. Mantener las fuentes en un archivo maestro externo y copiar solo los archivos usados a `src/assets/scenery/<tema>/`.
4. Registrar todos los assets de gameplay en `scenes/preload/loadSceneAssets.ts` con claves agrupadas por tema; `PreloadScene` genera texturas y animaciones. No cargar rutas finales directamente desde `LevelScene`.
5. Crear primero un nivel minimo recorrible en `levels.ts`: `worldWidth`, tiempo, auto-scroll, inicio, suelo, plataformas, pozos, ORO, caja, checkpoint y meta. Usar IDs unicos para caja, checkpoint y peligros.
6. Agregar la region y sus slots en `main-menu/ExploreView.tsx`. Diferenciar el estado activo con clases CSS tematicas colocadas despues de las reglas generales que puedan sobrescribirlas.
7. Agregar el primer nivel a `levelSequences` de `SaveDefaults.ts` para no dejarlo bloqueado en cuentas existentes.
8. Implementar el render tematico en metodos separados de `LevelScene`: fondo, capas de parallax, terreno, decoracion y visual de pozos. Conservar las colisiones basadas en los mismos datos.
9. Incorporar enemigos gradualmente. Primero reutilizar IA existente con una textura tematica opcional; crear una clase nueva solo si cambia el comportamiento.
10. Revisar todo flujo que conserva nivel: inicio, pausa, derrota, victoria, transicion y reintento. Ninguno debe depender de un fallback fijo de otra region.
11. Adaptar `audit:levels` para que las reglas especificas de una region se filtren por `theme`; no asumir que el numero de escenario es global.
12. Ejecutar `git diff --check` y `npm run check`. Dejar la prueba visual y el recorrido completo pendientes del usuario salvo peticion explicita.

### Implementacion actual de Bosque encantado

- Region: `enchanted-forest`, visible como `Bosque encantado` en el mapa.
- Niveles actuales: `enchantedGrove1` a `enchantedGrove10`, con numeracion local LV1-LV10 y cadena completa mediante `nextLevelId`.
- Disponibilidad: desbloqueado por normalizacion en saves nuevos y existentes, independiente del avance de Frontera Verde.
- Base compartida: 5200 px, seis pozos, plataformas bajas/elevadas, ORO, caja, checkpoint y meta; LV1 comienza con 72 segundos y auto-scroll 52.
- Direccion visual: fondo luminoso verde azulado, cuatro arboles transparentes en capas de parallax, luciernagas, piedra humeda verde azulada, musgo y raices.
- Assets de runtime: `src/assets/scenery/enchanted-forest/`; las fuentes maestras se conservan en el archivo externo de diseño.
- Enemigos actuales: M0 inmoviles, M1 perseguidores, M2 aereos y E2M3 terrestre. M0 usa skin de musgo/raices; M1 usa skin de corteza/runa; M2 y E2M3 conservan sus IA originales con animaciones tematicas sincronizadas por estado.
- Pipeline de M2: los PNG se cargan como fuentes, se recortan para retirar guias blancas, se centran en cuadros transparentes 320x320 y forman las animaciones `enchanted-m2-flight`, `enchanted-m2-windup`, `enchanted-m2-dive`, `enchanted-m2-recover` y `enchanted-m2-defeat`.
- Pipeline de E2M3: los siete PNG 272x240 se cargan sin recortar para conservar su alineacion y forman `enchanted-m3-idle`, `enchanted-m3-run`, `enchanted-m3-alert`, `enchanted-m3-attack-windup`, `enchanted-m3-attack`, `enchanted-m3-hurt` y `enchanted-m3-defeat`. `M3Enemy` selecciona esta variante visual sin duplicar la IA.
- UI: segunda pieza seleccionable del mapa, estado `Nuevo`, columna de nivel tematica y LV1 jugable.
- Auditoria: distingue los niveles por region, exige LV1-LV10 completos y encadenados, y protege el aumento estricto de presion, enemigos y peligros junto con la reduccion de tiempo.

### Implementacion actual de Volcan Activo

- Region/tema: `active-volcano`; niveles `activeVolcano1` a `activeVolcano3`, disponibles como tercera pieza del mapa y encadenados solo dentro de la region.
- Base: 5600 px, seis rios/pozos de magma, superficies bajas y elevadas, ORO 25/28/30, caja unica, checkpoint y meta por nivel.
- Curva inicial: LV1 68 s/60 presion/6 enemigos/3 peligros; LV2 64 s/70/8/5; LV3 60 s/82/10/7 y tres plataformas moviles.
- Enemigos: reutiliza las IA de M0, M1 y M2. M0/M1 usan texturas `volcanic-enemy-*` generadas por Phaser; M2 usa animaciones `volcanic-m2-flight|windup|dive|recover|defeat` sincronizadas con su maquina de estados.
- Arte: `volcanic-background` queda fijo; `volcanic-midground` aporta cuatro recortes alternados de parallax; el terreno y los pozos se dibujan con roca oscura, bordes incandescentes y grietas de lava.
- Restriccion vigente: ningun spawn `m3`/`e2m3` en LV1-LV3. La auditoria exige exactamente tres niveles, cadena completa, progresion esperada y ausencia de M3.

### Curva de progresion de Bosque encantado LV1-LV10

| Nivel | Nombre | Tiempo | Presion roja | Enemigos | M2 | E2M3 | Peligros ofensivos | Plataformas moviles | Funcion de diseno |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| LV1 | Umbral encantado | 72 s | 52 | 5 | 1 | 0 | 2 | 0 | Presenta skins, picada aerea y ritmo base bajo presion. |
| LV2 | Raices despiertas | 69 s | 60 | 7 | 2 | 0 | 4 | 0 | Reduce zonas seguras y obliga a leer amenazas desde ambos planos. |
| LV3 | Dosel vigilante | 66 s | 68 | 9 | 3 | 1 | 5 | 3 | Introduce E2M3 con inteligencia 0.50 y entrega el primer corazon de recuperacion. |
| LV4 | Senderos cambiantes | 63 s | 78 | 11 | 4 | 2 | 7 | 5 | Combina dos E2M3 con picadas consecutivas y cinco superficies moviles. |
| LV5 | Corazon del bosque | 60 s | 88 | 13 | 5 | 3 | 9 | 7 | Lleva E2M3 a inteligencia 0.80 dentro del examen acumulativo final. |
| LV6 | Santuario quebrado | 58 s | 100 | 14 | 5 | 4 | 10 | 8 | Transicion hacia la segunda mitad con E2M3 como amenaza terrestre principal. |
| LV7 | Caceria esmeralda I | 56 s | 108 | 15 | 5 | 5 | 11 | Inicia la caceria avanzada con un E2M3 adicional y nueve superficies moviles. |
| LV8 | Caceria esmeralda II | 54 s | 116 | 16 | 5 | 6 | 12 | Eleva la lectura simultanea de persecucion, vuelo y rutas moviles. |
| LV9 | Caceria esmeralda III | 52 s | 124 | 17 | 5 | 7 | Lleva la IA a 0.96 y agrega presion sin colocar enemigos sobre bordes. |
| LV10 | Corazon ancestral | 50 s | 132 | 18 | 5 | 8 | Examen final con IA 1.00, doce plataformas moviles y catorce peligros. |

Reglas obligatorias de esta curva:

- Cada nivel aumenta estrictamente `autoScrollSpeed`, cantidad de enemigos y peligros ofensivos.
- Cada nivel reduce estrictamente `timeLimitSeconds`.
- LV3-LV10 contienen exactamente un corazon entre el 60% y el 80% del recorrido, aislado de enemigos, ORO, cajas y peligros.
- El presupuesto de ORO conserva la formula compartida y llega de 25 en LV1 a 59 en LV10.
- La densidad de amenazas por pixel y la velocidad de la linea roja de cada LV1-LV5 deben superar a su equivalente de Frontera Verde. `audit:levels` valida ambas comparaciones.
- La dificultad procede de densidad, combinacion de planos y presion temporal; no se deben crear superposiciones inevitables entre enemigos y peligros para inflar dificultad artificialmente.
- LV3 introduce plataformas moviles; LV4-LV5 las combinan con mas M2; LV6-LV10 transfieren gradualmente el protagonismo a E2M3 sin introducir una mecanica nueva sin aprendizaje previo.

### Errores encontrados y prevencion

- Reintento en region incorrecta: `RESTART_GAME` no transportaba `levelId` y `GameOverScene` tenia fallback a `meadowOutpost`. Solucion: `ACTIVE_LEVEL_CHANGED` sincroniza el nivel real en React, `RESTART_GAME` exige `{ levelId }` y derrota/victoria conservan `restartLevelId`.
- Fallbacks silenciosos: iniciar o reintentar con datos incompletos podia abrir Frontera Verde. Solucion: los eventos tipados exigen nivel; una referencia invalida en resultado vuelve al menu en vez de seleccionar otra region.
- Auditoria acoplada a la primera region: `stageNumber >= 6` exigia M3 y `stageNumber >= 3` exigia corazon para cualquier region. Solucion: las reglas exclusivas de Frontera Verde se filtran mediante `theme`.
- Colision de numeracion: ordenar o mostrar solo por `stageNumber` produce dos `LV1` ambiguos. Solucion: agrupar y rotular por region/tema antes del numero local.
- Cascada CSS duplicada: el archivo contiene reglas antiguas y finales para `.region-piece`; una variante tematica declarada demasiado pronto puede ser sobrescrita. Solucion: colocar `.region-piece--enchanted` y estados activos despues de la ultima regla base efectiva.
- CSS aplicado al lugar equivocado: CSS no puede cambiar sprites Phaser individuales porque todo gameplay se dibuja en canvas. Solucion: generar/cargar texturas Phaser y reservar CSS para UI React.
- Saves existentes sin acceso: agregar solo el nivel al menu no lo desbloquea en partidas previas. Solucion: normalizar el primer ID de cada secuencia en `SaveDefaults.ts` sin borrar progreso.
- Huecos visuales sin dano real: separar suelo sin un peligro `pit` permite inconsistencias de caida y falla la auditoria. Solucion: cada hueco entre plataformas de suelo debe quedar cubierto por un pozo de datos.
- Cambios de assets ajenos: durante esta expansion habia PNG fuente movidos a nuevas carpetas. Solucion: conservar esos movimientos del usuario y trabajar con copias dentro de `src/assets`, sin restaurar rutas antiguas.

### Checklist de salida para una region nueva

- [ ] `LevelDefinition.theme` nuevo o reutilizado y aplicado a todos sus niveles.
- [ ] Assets fuente preservados, copias de runtime organizadas y claves cargadas en `PreloadScene`.
- [ ] Fondo, al menos dos profundidades de parallax y terreno visual propio.
- [ ] Primer nivel agregado a datos, menu, secuencia de guardado y normalizacion de saves existentes.
- [ ] Inicio, plataformas, pozos, ORO, caja, checkpoint y meta alcanzables con IDs unicos.
- [ ] Enemigos orientados a datos; IA reutilizada con skin tematica cuando corresponda.
- [ ] Reintento desde pausa, derrota y victoria conserva el `levelId` exacto.
- [ ] Transiciones no cruzan de region salvo que `nextLevelId` lo indique expresamente.
- [ ] Auditoria diferencia regiones y no aplica reglas tematicas a niveles ajenos.
- [ ] `git diff --check` y `npm run check` pasan.
- [ ] Prueba visual y recorrido manual marcados como pendientes del usuario si no fueron solicitados.

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
- M3 recibe exactamente un punto de dano por ataque normal aunque el heroe haya aumentado su dano RPG; debe requerir dos golpes o dos giros. El poder letal sigue siendo la unica excepcion de un impacto.
- La carrera de M3 usa `enemy-m3-run-1` a `enemy-m3-run-5` a 10 FPS. Mantener los cinco cuadros con el mismo lienzo, linea de suelo y escala para evitar saltos visuales.
- M3 muestra una alerta breve al detectar al jugador y su rango de persecucion escala aproximadamente de 1120 px en LV6 a 1280 px en LV10.
- `LevelDefinition.m3Intelligence` escala de 0.55 en LV6 a 0.95 en LV10. Aumenta rango/recuerdo, anticipacion del ataque, frecuencia de embestida, correccion aerea y evaluacion de saltos; mantenerlo entre 0.35 y 1 y no reducirlo al avanzar de nivel.
- E2M3 usa el mismo `LevelDefinition.m3Intelligence`: 0.50/0.65/0.80 en Bosque LV3-LV5 y 0.84/0.88/0.92/0.96/1.00 en LV6-LV10. Su identificador y arte son propios, pero no debe bifurcarse su logica de persecucion en `LevelScene`.
- M3 solo causa dano durante su estado `attack-lunge`; el contacto durante alerta, persecucion o recuperacion no debe herir al jugador.
- Si M3 cae fuera del mundo por una plataforma movil o un salto limite, vuelve a su ultima superficie segura con la persecucion reiniciada, sin quedar activo debajo del escenario.
- M3 debe consultar las superficies fisicas recibidas desde `LevelScene` antes de avanzar por un borde; solo inicia el salto de pozo si encuentra una plataforma alcanzable.
- Proyectiles deben seguir siendo entidades separadas, no rectangulos anonimos dentro de la escena.
- `PowerProjectile` no usa gravedad ni colisiona con plataformas. Recibe `Player.facing`, nace delante del heroe y conserva velocidad horizontal con ese signo hasta salir por el borde visible correspondiente.
- No poner UI React ni llamadas DOM dentro de entidades.

## Reglas para progresion y guardado

- `ProgressionSystem` controla experiencia, subida de nivel y desbloqueo inicial de habilidades.
- Cada subida valida/aplica la recompensa y emite `PLAYER_LEVELED_UP`; React representa el aviso mediante `LevelUpToast`. Este evento y `ACHIEVEMENT_UNLOCKED` deben seguir alimentando la misma cola de progreso en `App.tsx`.
- `MAX_PLAYER_LEVEL = 80` y `getExperienceToNextLevel()` en `progression.ts` son la unica fuente de la curva RPG. El requisito debe aumentar estrictamente en cada nivel; LV80 no acumula mas XP y el HUD muestra `MAX`.
- La curva actual exige 100 XP para pasar de LV1 a LV2, crece suavemente hasta unos 90.950 XP de LV79 a LV80 y suma aproximadamente 2.36 millones. No sustituirla por incrementos lineales cortos.
- `levelRewardDefinitions` es la fuente de las recompensas LV1-LV15 y `SaveData.claimedLevelRewards` impide duplicarlas. ORO y mejoras permanentes pertenecen al progreso global; las cargas se acreditan al heroe activo al subir.
- `InventorySystem` controla recoleccion de items y ORO.
- Las piezas de inventario deben pasar por `InventorySystem.collect`, no escribirse directamente en el save desde la UI.
- Las recompensas aleatorias de cajas tambien deben pasar por `InventorySystem.collect` y marcar su ID en `claimedRewardBoxes` antes de persistir.
- El ORO del camino y de enemigos debe pasar por `InventorySystem.collect`; no incrementar `coins` directamente desde entidades.
- El grupo fisico interno `coins` debe mantener `allowGravity: false` e `immovable: true`; si se deja la configuracion por defecto del grupo, sobrescribe a `Coin` y las piezas de ORO caen fuera del mapa.
- `GameSaveStore` es la capa sincronica que deben usar Phaser y React para leer/escribir `SaveData`.
- `SupabaseSaveAdapter` es la capa remota actual y persiste en `public.game_saves`.
- Cada conexion de `GameSaveStore` usa el ID de usuario como identidad y una generacion interna. Una carga antigua nunca puede restaurar datos despues de `disconnect()` ni sobrescribir una sesion posterior.
- `TOKEN_REFRESHED` y los demas eventos de Auth que conservan el usuario no deben recargar el save remoto. Solo `INITIAL_SESSION` y `SIGNED_IN` abren la conexion; `SIGNED_OUT` la invalida.
- Los errores de persistencia deben dejar el save marcado como pendiente, hacer que `flush()` rechace y conservar la opcion de `retry()`. Cerrar sesion o completar un reinicio nunca puede continuar si el flush requerido falla.
- React observa los cambios mediante `GameSaveStore.onSyncStateChange()` y los errores mediante `onError()`. Ambos registros devuelven una funcion de limpieza; no sondear el store por frame ni reutilizar `authError` para fallos de progreso.
- `SaveDefaults.ts` define `SAVE_SCHEMA_VERSION`, defaults y normalizacion de saves.
- `normalizeSaveData()` recibe datos remotos como `unknown`: nunca asumir que objetos, arrays, numeros o IDs respetan TypeScript en runtime.
- Vida maxima, velocidad, salto, dano y habilidades se reconstruyen desde `PLAYER_DEFAULTS`, nivel y recompensas vigentes; no se aceptan valores arbitrarios del JSON remoto. Salud, experiencia, ORO, cargas y estadisticas se convierten en enteros finitos dentro de sus limites validos.
- Personajes, niveles, items de inventario, enemigos, cajas, checkpoints, logros y fechas de racha se filtran contra las definiciones actuales. Las colecciones unicas eliminan duplicados; el inventario conserva duplicados como cantidades y limita su entrada remota a 10.000 elementos.
- Todo nivel de recompensa igual o inferior al nivel RPG actual se considera reclamado al normalizar. Esto conserva la aplicacion exactamente una vez y evita que un array remoto incompleto vuelva a conceder ORO, cargas o mejoras permanentes.
- La seleccion de personaje vive en `SaveData.selectedCharacterId`.
- Las cargas de poderes viven en `save.characterPowerCharges[save.selectedCharacterId]`; cada uso valido debe guardarse inmediatamente con `GameSaveStore`.
- Las compras descuentan `save.player.coins`, acreditan solo al `characterId` de la ficha abierta y persisten ambos cambios juntos mediante `GameSaveStore`.
- Desbloquear un heroe exige y descuenta el requisito actual de `characterUnlocks.ts`, agrega su ID a `save.unlockedCharacterIds` y no lo selecciona automaticamente. El numero de compras pagadas se deriva de `unlockedCharacterIds.length - 1`, por lo que no requiere un contador duplicado en el save.
- Nunca ejecutar una compra desde el primer clic del paquete ni desde eventos de la card: exigir el boton explicito `Confirmar compra`.
- La normalizacion de schema 3 a 4 asigna las cargas globales antiguas al personaje que estaba seleccionado y entrega los defaults 3/25 al resto.
- La normalizacion de schema 4 a 5 conserva los heroes entonces existentes desbloqueados en cuentas antiguas; los saves actuales mantienen solo sus heroes ya desbloqueados y reciben cargas por defecto para Faust sin desbloquearlo automaticamente.
- Regenerar con la vida completa o intentar usar un poder sin cargas no debe consumir inventario.
- No escribir directamente en `localStorage` para progreso desde escenas, entidades o componentes.
- No llamar Supabase directamente desde escenas o entidades; usar `GameSaveStore` para conservar el flujo sincronico de Phaser.
- Para migrar a Supabase real: seguir `supabase/README.md`, revisar primero `supabase db push --dry-run`, aplicar con `supabase db push` y usar `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` en el frontend. Nunca exponer claves secretas o `service_role` en variables `VITE_*`.
- La confirmacion de email puede estar habilitada o deshabilitada: `App.tsx` debe conservar ambos flujos. Con confirmacion, el registro muestra un aviso y espera el inicio de sesion; sin confirmacion, la sesion se carga inmediatamente.
- Antes de cambiar estructura de save, pensar en versionado.
- `Reiniciar juego` debe usar `GameSaveStore.reset()` y esperar `flush()`; restablece ORO, inventario, niveles, cajas, logros, personaje y cargas, pero no elimina el usuario de Supabase Auth.
- El reinicio nunca debe ejecutarse desde el primer clic: mostrar el alcance completo y exigir `Borrar progreso`; `Cancelar` no modifica el save.
- Durante el resumen entre niveles, Phaser pausa fisica y conserva la escena de fondo; React renderiza `LevelSummaryScreen` y oculta HUD/controles usando el estado `level-transition`.
- `LEVEL_COMPLETED` transporta un `LevelCompletionSummary` con tema, nivel, monstruos derrotados, duracion activa, ORO recogido, APM, logros nuevos y destino siguiente. `CONTINUE_LEVEL` es la unica confirmacion que carga el nivel siguiente o cierra la region.
- `LevelDefinition.stageNumber` conserva la numeracion real del escenario en HUD y resumen; no inferirla desde el nombre tematico.
- Los contadores del resumen pertenecen al intento actual: se reinician al crear `LevelScene`, acumulan ORO del camino y recompensas de enemigos, y no muestran el saldo total persistente.
- El APM cuenta inicios o cambios de direccion y pulsaciones de salto, ataque, giro, regeneracion y poder. No cuenta cada frame de una tecla sostenida, no incluye pausa y divide las acciones por los minutos activos del intento.
- El HUD muestra un indicador pequeno `LV I` a `LV X` para el nivel del escenario, separado del nivel RPG del personaje.

## Reglas mobile

- El juego debe priorizar landscape en Android.
- En vertical debe mantenerse el aviso de orientacion salvo que el usuario pida jugabilidad vertical real.
- Los controles tactiles deben ocupar bordes inferiores y no tapar el centro del gameplay.
- El suelo movil debe conservar su extension inferior continua para que los controles descansen visualmente sobre terreno y no sobre el heroe o las amenazas.
- En Frontera Verde, los segmentos centrales de la base se repiten solo en horizontal mediante imagenes consecutivas y se estiran una unica vez en vertical. No usar `TileSprite` con la altura mobile extendida: repetiria la franja superior de pasto dentro de la base y produciria falsos pisos o parches horizontales.
- En `Comando 1`, el salto mobile pertenece al area libre de la mitad derecha. En `Comando 2`, pertenece a la mitad del joystick: izquierda por defecto y derecha en modo zurdo. Botones, enlaces, el joystick u otros controles interactivos nunca deben activarlo por propagacion; el joystick resuelve su propio gesto y permite salto en su extremo superior o con un toque corto.
- Los ajustes de tamano, separacion, opacidad, posicion y modo zurdo se guardan en perfiles independientes para `Comando 1` y `Comando 2`, y deben afectar solo la presentacion activa de `MobileControls`. El modo zurdo intercambia los bloques completos y, para `Comando 2`, tambien el lado libre de salto, sin salir del input unificado. Los ajustes locales antiguos compartidos se migran copiandolos inicialmente a ambos perfiles.
- La vibracion es mejora progresiva: debe fallar silenciosamente si `navigator.vibrate` no existe, y nunca sustituye feedback visual/sonoro.
- Separar visualmente movimiento, acciones normales y poderes; usar superficies translucidas e iconos en lugar de bloques opacos con letras como contenido principal.
- Pausa debe quedar arriba derecha y lejos del HUD principal. En landscape mobile, el indicador pequeno de LV del escenario comparte su fila, alineado a la izquierda del boton con un margen breve y sin superponerse.
- HUD movil debe ser compacto y legible.
- El HUD de gameplay agrupa nivel RPG y experiencia en un solo recuadro vertical: `Lv N`, divisor y cifras de XP sin etiqueta. Tiempo, vida, progresion, ORO y la barra del recorrido comparten una unica fila en landscape mobile; desktop usa la misma agrupacion y una barra de recorrido corta.
- Mantener safe areas con `env(safe-area-inset-*)`.
- No usar hover como unica senal de interaccion.
- No depender de `pointer: coarse` solamente; hay pruebas de navegador con pointer fino y viewport chico.
- Las superficies de pantalla completa deben conservar fallback `vh`/`vw` y preferir `dvh`/`dvw` cuando esten disponibles para respetar las barras dinamicas del navegador movil.
- Las secciones React navegables deben mantener `MenuHeading` visible durante el scroll, con la accion de volver a la izquierda. En landscape mobile, compactar espacios y tarjetas antes de reducir legibilidad; perfil, logros e inventario conservan tambien sus tabs principales bajo la cabecera.
- Probar al menos: desktop 1280x720, portrait 390x844, landscape 844x390.

## Verificacion obligatoria antes de entregar cambios

Ejecutar:

```powershell
npm run check
```

`npm run check` ejecuta ESLint, TypeScript, Vitest, las tres auditorias de contenido y el build de produccion. `audit:achievements` valida IDs, objetivos, recompensas, los 20 logros totales y exactamente cuatro logros medios por categoria. `audit:levels` valida los 23 niveles actuales entre tres regiones, IDs encadenados, presupuesto de ORO, cobertura de cada hueco mediante un pozo, suelo de aparicion de enemigos terrestres y corazones aislados entre el 60% y el 80% desde LV3. `audit:progression` protege el maximo LV80, el aumento estricto, la cobertura completa de la tabla y el objetivo de largo plazo. El build ejecuta ademas `audit:production`, que limita el chunk inicial, impide precargar Phaser y comprueba los encabezados de seguridad. Vitest cubre sesion, persistencia, normalizacion, estado de sincronizacion y estadisticas de intentos. Bosque encantado exige diez niveles y su curva completa; Volcan Activo exige exactamente LV1-LV3, progresion creciente y ausencia de M3. Las advertencias de cercania deben revisarse, no ignorarse automaticamente.

Cuando cambien migraciones, ejecutar ademas `npm run supabase:start`, `npm run supabase:reset`, `supabase db lint --local --fail-on error` y `npm run supabase:stop`. Estos comandos validan exclusivamente Docker local; no sustituirlos por operaciones `--linked` salvo peticion explicita.

Las pruebas visuales y manuales en navegador quedan a cargo del usuario. Un agente solo debe ejecutarlas cuando el usuario lo pida expresamente; en los demas casos debe entregar las verificaciones automaticas y dejar esta comprobacion como pendiente del usuario.

Si el usuario solicita verificar UI/mobile, comprobar:

- Desktop: controles tactiles ocultos, aviso oculto.
- Portrait movil: aviso visible, controles ocultos.
- Landscape movil: aviso oculto, controles visibles, HUD no se cruza con controles ni pausa.
- Landscape movil: suelo y heroe quedan elevados, la extension inferior conserva la apariencia del terreno, los botones son comodos y la linea roja permanece pegada al margen izquierdo aun con zoom.

Si el usuario solicita verificar gameplay en navegador, comprobar manualmente:

- Iniciar partida.
- Moverse.
- Saltar tocando un area libre de la pantalla, tambien mientras se mantiene una direccion; confirmar que tocar cualquier boton no agrega un salto.
- En `Comando 2`, arrastrar el joystick a ambos lados, saltar hacia arriba, probar avance + salto en diagonal y confirmar que un toque libre en la mitad del joystick tambien salta. Verificar por separado J central y K/Q/E alrededor.
- Atacar.
- Ejecutar ataque giratorio.
- Pausar.
- Recibir dano.
- Derrotar enemigo.
- En nivel 6 o superior, comprobar que M3 corre lateralmente con cinco cuadros, gira al cambiar la posicion relativa del jugador y mantiene una escala cercana a la del heroe.
- Golpear o disparar una vez a M3 y confirmar media barra; repetir y confirmar derrota. Verificar por separado que el poder letal lo elimina de inmediato.
- Llevar a M3 hacia un pozo y confirmar que salta solo cuando existe una plataforma alcanzable, sin caminar directamente al vacio.
- Recoger ORO.
- Abrir Personaje, entrar con `Ver`, elegir un paquete, cancelar sin cambios y confirmar otra compra comprobando ORO y cargas.
- Validar con un save nuevo que solo Dunel, Ruder y Sarix puedan elegirse inicialmente; luego comprobar bloqueo de los otros cuatro heroes, requisitos LV4/700, LV8/7000, LV12/70000, duplicacion posterior, cancelacion y desbloqueo persistente.
- Abrir Opciones y comprobar que `Sonido y musica` abre su pagina interna; ajustar ambos volumenes, recargar y cerrar/abrir sesion para confirmar la persistencia. Comprobar tambien que `Salir de la cuenta` y `Reiniciar juego` estan dentro de Cuenta; cancelar el reinicio sin alterar datos.
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
6. Recorrer manualmente LV6-LV10 completos para afinar velocidades, ventanas de alerta y saltos limite de M1/M3 sin volver a saturarlos con peligros secundarios.
7. Probar manualmente Bosque encantado LV1-LV10 completos y ajustar saltos, lectura de piedra, densidad de arboles, M2, E2M3 y velocidad de presion.
8. Agregar menu de configuracion y remapeo basico.
9. Agregar Capacitor cuando la experiencia mobile web este comoda.
10. Probar instalacion y actualizacion de la PWA en Android real antes de reutilizar esta base en Capacitor.

## Advertencias actuales

- `WorldMapScene`, `BattleScene` y `UIScene` existen como estructura futura, no como features completas.
- No hay un paquete completo de assets finales; M3 ya usa cinco cuadros laterales propios, pero gran parte del resto del gameplay sigue siendo placeholder.
- Los tests automatizados actuales cubren sesion, cola de guardado, normalizacion, aviso de sincronizacion y estadisticas del intento; gameplay, balance y layout visual siguen requiriendo recorridos manuales.
- No hay empaquetado Android todavia.
- La arquitectura esta preparada, pero debe crecer gradualmente para no volver la demo dificil de entender.
- La velocidad acumulada actual llega a 310 en LV15 y sigue dentro del rango previsto. Antes de agregar mejoras que lleven al jugador a 340 o mas, revisar manualmente saltos, atajos, persecuciones y ritmo de camara; 340 es el umbral de advertencia de balance, no un aumento aprobado automaticamente.

## Mantenimiento de esta guia

Actualizar `AGENTS.md` en el mismo cambio cuando se modifique de forma material cualquiera de estos puntos:

- Responsabilidad entre React y Phaser.
- Flujo de escenas, eventos o input.
- Estructura o version del guardado.
- Reglas de Supabase y persistencia.
- Contenido disponible, controles o progresion.
- Politica mobile, comandos de verificacion o archivos de entrada importantes.

Al actualizarla:

1. Describir solo comportamiento implementado o marcarlo claramente como pendiente.
2. Verificar rutas, nombres de tipos, comandos y versiones contra el repositorio actual.
3. No borrar invariantes ni decisiones de compatibilidad sin confirmar primero que dejaron de aplicar.
4. Evitar copiar la misma regla en nuevas secciones; enlazar conceptualmente con la seccion responsable.
5. Mantener separados el estado confirmado, las reglas obligatorias, las advertencias y los proximos pasos.
6. Si una comprobacion no se ejecuto en el turno actual, no presentarla como validacion reciente.

El historial de comprobaciones anteriores se conserva en `docs/verification-history.md`. Es solo evidencia historica: el estado vigente, las reglas obligatorias y los riesgos actuales permanecen en este archivo.

Ultima revision documental: 2026-07-02. Esta fecha indica revision del contenido; la validacion ejecutada durante el cierre se registra en el README y en el commit correspondiente.
