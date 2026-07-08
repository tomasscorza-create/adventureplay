# Análisis de Datos: Panel Administrador vs Repositorio Actual

**Fecha:** 8 de Julio de 2026
**Objetivo:** Evaluar el estado actual de los datos en `adventureplay` y definir los requisitos para alimentar el futuro Dashboard Administrador Independiente.

---

## 1. Tablas existentes en Supabase
Actualmente, el juego usa una arquitectura muy ligera y centrada en JSON:
- **`auth.users`**: Tabla nativa de Supabase donde se guardan las credenciales, emails y UUIDs.
- **`public.game_saves`**: Única tabla pública, creada en la migración `20260626000000`.
  - Columnas: `id`, `user_id`, `slot_id`, `save_version`, `save_data` (JSONB), `created_at`, `updated_at`.
  - Tiene RLS estricto (`auth.uid() = user_id`) que impide listar los saves de otros jugadores.

No existen actualmente tablas para administradores, roles, auditoría ni telemetría detallada.

## 2. Cómo se guardan los datos del juego
Toda la progresión y estado del jugador vive dentro del payload JSONB `save_data` bajo la interfaz `SaveData` (`src/shared/types/game.ts`):
- **Progreso y Niveles:** `unlockedLevels` (array de IDs), `completedLevels` (array de IDs), y `checkpointId`.
- **Usuarios:** La identidad la provee `auth.users`, y el perfil (nombre, icono) vive en `SaveData.player.displayName` y `profileIconId`.
- **Oro:** Guardado en `SaveData.player.coins`. Es un balance actual, no un registro de transacciones.
- **Inventario:** Array de IDs de ítems recogidos en `SaveData.player.inventory`.
- **Personajes:** `selectedCharacterId`, `primaryCharacterId` y `unlockedCharacterIds` (array de IDs disponibles).
- **Estadísticas Acumuladas:** `statistics.runsPlayed`, `completedRuns`, `defeats`, `gameplaySeconds`, `actions`. También hay progreso de logros en `achievements`.

## 3. Datos actualmente disponibles para el Panel
Gracias a que PostgreSQL puede consultar dentro de columnas JSONB (`save_data->'player'->>'coins'`), ya podemos obtener métricas como:
- Total de usuarios registrados (consultando `auth.users` con Service Role desde un backend/RPC).
- Nivel promedio de los jugadores (promediando `save_data->'player'->>'level'`).
- Usuarios activos recientes (ordenando por `updated_at` de la tabla `game_saves`).
- Personajes más usados (agrupando por `save_data->>'selectedCharacterId'`).

## 4. Datos FALTANTES para métricas reales
Para cumplir con los requerimientos del Dashboard, nos faltan datos que el juego actualmente no registra ni retiene:
1. **Retención Exacta (Activos 24h/7d/30d):** Podemos inferirlo a groso modo con `updated_at`, pero si un jugador entra y no guarda, no se refleja. Faltaría un registro de **sesiones**.
2. **Embudo de Abandono y Muertes:** El juego no guarda *dónde* muere el jugador ni en qué nivel abandona. Las `statistics` son globales. Necesitamos saber qué nivel es el más mortífero.
3. **Flujo de Economía:** Solo tenemos el "balance actual" de Oro. No sabemos cuánto oro total se ha generado (dropeado/recolectado) vs cuánto se ha gastado (comprando recargas de personaje).

## 5. Cambios mínimos necesarios en el juego (Backend/Game)
Para alimentar el panel sin romper la arquitectura actual, el juego necesitará:
1. **Funciones RPC Seguras (Backend):** 
   - Crear funciones en Supabase (ej. `get_admin_metrics()`) ejecutadas con `security definer`. Esto permite que el Admin Dashboard (que pasará un token JWT de un admin válido) lea datos de todos los `game_saves` sin requerir la Service Role Key en el frontend ni romper el RLS de los jugadores.
2. **Registro de Partidas (Telemetría):** 
   - Crear una tabla nueva en Supabase: `public.level_runs` o agregar estadísticas segmentadas por nivel dentro de `SaveData` (ej. `deathsPerLevel: { 'enchantedGrove1': 45 }`, `abandonmentsPerLevel`). La opción de tabla separada es mucho más analítica.
3. **Registro de Economía:** 
   - Añadir variables acumulativas en `SaveData.statistics`: `totalGoldEarned` y `totalGoldSpent`.
4. **Roles y Baneos:** 
   - Crear tabla `public.admin_users` (UUID, role: owner, admin, support, analyst).
   - Crear tabla `public.admin_audits` (logs de acciones).
   - Crear tabla o columna `banned_status` en perfiles. El juego deberá verificar al inicio: `if (isBanned) return showBannedScreen()`.
