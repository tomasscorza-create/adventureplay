# 📏 Reglas y Convenciones para Phaser

Documento centralizado para la arquitectura de escenas, entidades y sistemas dentro de `src/game/`.

## 1. Reglas Generales de Arquitectura
- **Responsabilidad Clara:** Phaser controla colisiones, cámara, físicas de gameplay y animaciones. NO maneja bases de datos (Supabase) ni interfaces externas (React).
- **Prohibición de "God Classes":** Las escenas (como `LevelScene.ts` o `PuzzleScene.ts`) orquestan, no hacen todo. Si una responsabilidad (ej. disparos, movimiento) crece, SE EXTRAE inmediatamente a `src/game/systems/`.
- **Separación Lógica/Arte:** La lógica, colisiones y estado puro del juego NO debe atarse directamente a un gráfico de resolución concreta. (Ej: M3 usa inteligencia compartida y solo cambia sprites si es jefe de bosque o volcán).

## 2. Escenas (LevelScene y PuzzleScene)
- Nunca hardcodear arrays de entidades, coordenadas ni parámetros dentro de las escenas. TODO sale del contrato `src/game/data/`.
- No cargar rutas finales de assets estáticos (PNGs, audio) directamente en las escenas. Deben cargarse de manera ordenada a través del `PreloadScene`.

## 3. Entidades
- Las entidades (que extienden de `BaseEnemy` o `Player`) encapsulan estado de gameplay propio (animaciones, hitbox).
- **No añadir UI ni lógica de DOM en entidades**.

## 4. Físicas y Mecánicas
- **Gravedad y Pozos:** En Explorar, caer fuera de plataforma (`y > limite`) cuenta como caída al pozo. Genera daño fijo (1HP) y respawnea con seguridad. No es un game over inmediato a menos que llegue a 0 vidas.
- **Plataformas Móviles:** La física y movimiento de plataformas pertenecen a `MovingPlatform.ts`. Usa `axis`, `distance` y `speed` de `levels.ts`. NUNCA crear tweens flotantes directamente en `LevelScene`.
- **Proyectiles:** Los poderes letales (`PowerProjectile`) **no** usan gravedad ni interactúan con plataformas móviles. Solo explotan contra enemigos. Se lanzan usando `Player.facing`.

## 5. IA Crítica (Familia M2 y M3)
- **Familia M3 (Jefes y Elites):** 
  - Usa máquina de estados.
  - **Física Limítrofe:** Nunca camina a ciegas a un precipicio. Salta solo si detecta una superficie del otro lado (`LevelScene` se la provee).
  - **Daño:** Tiene 2 HP. Exige exactamente 2 golpes regulares para morir sin importar los stats RPG de daño cuerpo a cuerpo del héroe. (El letal es excepción).
  - Las versiones temáticas (`E2M3` en Bosque, `E3M3` en Volcán) usan exactamente la MISMA IA y la misma clase. Solo cambian sus *sprites* (`flipX` y cargas).
- **Familia M2 (Aéreo):**
  - Ajusta el ángulo del cuerpo según su vector de velocidad de "picada" hacia el héroe.
