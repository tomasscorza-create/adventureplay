# 🛠️ Desarrollo: Creación de Contenido y Datos

Adventure Play es un juego fuertemente orientado a datos (Data-Driven). El contenido nuevo casi NUNCA requiere modificar clases base.

## 1. Archivos de Contrato (Data Layer)
* **`src/game/data/enemies.ts`**: Define ID, texturas, IA.
* **`src/game/data/characters.ts`**: Héroes, nombres, animaciones.
* **`src/game/data/items.ts`**: Piezas, pociones.
* **`src/game/data/levels.ts`**: Orquestador maestro de la campaña.
* **`src/game/data/progression.ts`**: Curvas RPG, vida.

## 2. Cómo agregar nuevo contenido
**Agregar un Enemigo:**
1. Agregar definición técnica en `enemies.ts`.
2. Si recicla comportamiento base, añadir a los spawns en `levels.ts`.
3. Si la lógica es 100% nueva, crear clase extendiendo de `BaseEnemy` en `entities/enemies/`. 
4. *¡Atención!* No alterar M3 para variaciones visuales.

**Agregar un Personaje (Héroe):**
1. Añadirlo a `characters.ts`.
2. Cargar assets gráficos optimizados en `PreloadScene`.
3. Crear los estados del sprite (idle, run, jump, etc).
4. El personaje se desbloquea vía ORO en `characterUnlocks.ts`. 

## 3. Proceso replicable para crear una Región
Para escalar el modo "Explorar", no se crea una nueva Escena. Se crea un Tema Visual.
**Sigue estos pasos estrictos:**
1. Define un ID estable (ej: `theme: "frozen-peaks"`). Crea `src/game/data/levels/frozenPeaks.ts`.
2. Cargar texturas de background/tileset con sufijo del tema en `loadSceneAssets.ts`. `PreloadScene` los horneará.
3. Crear nivel base (worldWidth, tiempo, scroll de presión, cajas, oro, meta y checkpoint obligatorios).
4. Configura el fondo y los recortes Parallax en `LevelScene.ts` (solo en el bloque de renderizado visual, NO en la física).
5. Agrega los 10 niveles encadenados en `ExploreView.tsx` (para que React sepa qué pintar en el mapa).
6. ¡CRÍTICO! Agrega el Nivel 1 a `levelSequences` en `SaveDefaults.ts`. Sin esto, a las cuentas de base de datos antiguas jamás se les desbloqueará la región.
7. Respeta el diseño: LV3 introduce plataformas móviles. Corazones a partir del LV3 van entre el 60-80% del mapa, aislados de amenazas masivas. La presión roja de LV1 a LV5 debe superar ligeramente a la región anterior.

## Advertencia Central
**Nunca hardcodees:**
No inyectes `this.add.sprite(200, 150, "boss")` a mitad del archivo `LevelScene.ts`.
El motor debe iterar sobre `levelDefinition.enemies` o `levelDefinition.platforms` para construir un nivel dinámicamente.
