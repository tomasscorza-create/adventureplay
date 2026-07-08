# Estado Actual del Dashboard Administrador (AdventurePlay)

## Información General
- **Fecha de actualización:** 8 de Julio de 2026
- **Estado Global:** **Fase 1 Completada (Modo Solo Lectura)**
- **Ruta del Proyecto:** `C:\Users\usuario\Desktop\adventureplay-admin`
- **Conexión a Base de Datos:** Conectado directamente a la misma instancia de Supabase de producción/desarrollo del juego.

## Arquitectura de Seguridad
Cumpliendo con los requisitos estrictos de seguridad, el frontend administrador **NO** utiliza la *Service Role Key*. Toda la autenticación y consumo de datos funciona exclusivamente a través de la *Anon Key* pública, apalancándose en funciones RPC protegidas con `SECURITY DEFINER` y un estricto `search_path = public`. 

Para determinar si un usuario autenticado puede visualizar los datos, estas RPCs revisan internamente si su `auth.uid()` existe en la tabla `public.admin_users` con el rol `owner`.

## ¿Qué se construyó? (Fase 1)

### En la Base de Datos (Migraciones ya aplicadas)
- `admin_users`: Tabla de roles, restringe quién puede ver datos sensibles.
- `admin_audits`: Tabla preparatoria para registrar quién hace qué.
- `user_moderation`: Tabla preparatoria para suspender/banear usuarios.
- **RPCs creadas:**
  - `is_owner_admin()`
  - `get_admin_dashboard_metrics()`
  - `get_admin_players_list(limit, offset)`
  - `get_admin_player_detail(target_user_id)`

### En el Frontend (`adventureplay-admin`)
- Stack: **Vite + React + TypeScript** (sin Tailwind, utilizando Vanilla CSS modularizado).
- Autenticación: Implementada en `AuthContext.tsx` con barrera de protección en `OwnerRoute.tsx`.
- **Rutas y Vistas Operativas:**
  - `/login`: Inicia sesión a través de Supabase Auth estándar.
  - `/` (Dashboard): Muestra métricas globales sumadas en tiempo real a partir del JSON de `game_saves`.
  - `/players`: Lista tabular paginada/limitada de todos los jugadores que han hecho al menos un *save*.
  - `/players/:id` (Detalles): Vista pormenorizada de cada slot de guardado asociado a una cuenta, mostrando en detalle datos como Oro, Partidas, Derrotas, Personaje Activo y el JSON puro para inspección técnica.

## Limitaciones y Tareas Pendientes (Fase 2)

Actualmente, el panel está diseñado como un visor pasivo para no arriesgar los datos de producción. Lo que falta implementar (Fase 2):

1. **Permisos y Roles Avanzados:**
   - Habilitar los roles de `admin`, `support`, y `analyst` para permitir el acceso diferenciado al panel.
2. **Acciones Destructivas/Mutativas:**
   - Poder añadir o restar **Oro** manualmente desde la cuenta de un jugador.
   - Editar inventarios o forzar completado de niveles a modo de soporte técnico.
3. **Sistema de Moderación Activa:**
   - Hacer funcionales los botones de Banear y Suspender usando la tabla `user_moderation`, y aplicar esos filtros en el login o carga de partida en el juego principal.
4. **Registro de Auditoría:**
   - Implementar que toda acción mutativa desde el dashboard envíe un registro a la tabla `admin_audits` documentando el "antes y después" del JSON editado.
5. **Métricas Avanzadas (Dependientes del juego):**
   - Actualmente no podemos ver métricas como *Retención al Día 1* o *Muertes por Nivel Específico*, porque el juego solo acumula estadísticas globales al finalizar un *run*. Para tener datos profundos en el Dashboard, la Fase 2 debe incluir telemetría más precisa disparada desde el propio cliente de Phaser (ej: eventos al iniciar nivel, eventos al morir con coordenadas).

## Instrucciones para levantar el proyecto local
- Claves cargadas vía `.env.local` usando `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Se levanta con `npm run dev` dentro de su carpeta.
- Solo pueden ingresar usuarios dados de alta a nivel de SQL.
