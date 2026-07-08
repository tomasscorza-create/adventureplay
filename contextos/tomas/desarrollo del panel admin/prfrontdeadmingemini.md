# Propuesta: Arquitectura Dashboard Administrador Independiente

**Fecha:** 8 de Julio de 2026
**Modelo de IA Usado:** Gemini 3.1 Pro (High)
**Entorno y Capacidad de Cómputo:** Agente Local en Antigravity IDE, con capacidad completa de lectura/escritura en el sistema de archivos (Windows), ejecución asíncrona de terminal (PowerShell) e instanciación de subagentes paralelos.

---

## 1. Visión General y Estructura Fija
Construiremos un frontend totalmente independiente (`adventureplay-admin`) que no compartirá bundle ni lógica de cliente con el juego principal. 
Este proyecto estará conectado a la misma instancia de Supabase de `adventureplay` pero **estará completamente prohibido el uso de la Service Role Key en el cliente**. Todo acceso privilegiado se manejará a través del backend de Supabase (PostgreSQL RPCs y RLS estricto).

- **Ubicación:** `C:\Users\usuario\Desktop\adventureplay-admin`
- **Stack:** React + Vite + TypeScript (sin Tailwind, utilizando CSS modular o vanilla para mantener cohesión con las reglas globales, a menos que se autorice usar Tailwind por agilidad administrativa).

## 2. Jerarquía de Autenticación y Roles
El panel usará Supabase Auth estándar, pero el acceso a las rutas estará protegido por un sistema de roles anclado en la base de datos, no hardcodeado.

Crearemos una nueva tabla `public.admin_users`:
- **Roles Escalables:**
  - `owner`: Acceso total, puede crear otros administradores.
  - `admin`: Acceso de gestión, baneos y métricas.
  - `support`: Gestión de usuarios, pero sin capacidad de baneo destructivo o acceso a métricas globales.
  - `analyst`: Solo lectura de métricas de juego y embudos, sin acceso a datos personales ni modificaciones.

## 3. Acceso Seguro a Datos (El motor del Admin)
Para evitar el uso de la *Service Role Key* en el frontend de `adventureplay-admin`:
1. **Lectura de Usuarios y Partidas:** Crearemos **PostgreSQL Functions (RPC)** con la directiva `SECURITY DEFINER`. Estas funciones verificarán internamente si el `auth.uid()` que realiza la petición existe en `admin_users` con el rol adecuado. Si es así, la función devolverá la lista de usuarios o saves sin romper las reglas de seguridad RLS del cliente del juego.
2. **Tableros Analíticos:** Las métricas pesadas (oro circulante, promedios) se calcularán en Vistas Materializadas o RPCs en Supabase para no saturar la red descargando miles de JSONBs al frontend.

## 4. Auditoría Administrativa (Obligatoria)
Ninguna acción de un administrador pasará desapercibida. Se creará la tabla `public.admin_audits`:
- `id` (UUID)
- `admin_id` (UUID del administrador que ejecutó)
- `action` (Ej: 'SUSPEND_USER', 'UNBAN_USER')
- `target_user_id` (UUID del jugador afectado)
- `previous_state` / `new_state` (JSON con el cambio aplicado)
- `created_at` (Fecha y hora)

## 5. Sistema Estructural de Moderación y Baneos
No usaremos un simple booleano. Crearemos una tabla `public.user_moderation` (o extenderemos los perfiles) para controlar los estados:
- **Estados posibles:** `ACTIVE`, `SUSPENDED` (temporal), `BANNED` (permanente).
- **Atributos:**
  - `reason` (Texto con el motivo).
  - `expires_at` (Timestamp, NULL si es permanente).
  - `issued_by` (UUID del administrador responsable).
*(Nota: Esto requerirá que el juego principal modifique su flujo de carga para leer este estado y bloquear la entrada a Phaser si el jugador está suspendido).*

## 6. Módulos y Secciones Iniciales (Fase 1)
El panel se estructurará con una barra de navegación lateral y las siguientes secciones:

1. **Dashboard General:** Resumen rápido y tarjetas KPI de salud del juego.
2. **Métricas de Juego (Analytics):**
   - Usuarios: Totales, activos recientes, activos 24h / 7d / 30d.
   - Economía: Oro total generado vs gastado.
   - Progreso: Nivel promedio, personajes más usados, sesiones.
   - Puntos de Dolor: Embudo de niveles (dónde más abandonan, dónde más mueren).
3. **Gestión de Jugadores:**
   - Datatable paginada de cuentas con buscador.
   - **Detalle del Jugador:** Vista completa de su `game_save` (oro, nivel, inventario).
4. **Moderación / Baneos:**
   - Herramienta para cambiar el estado de la cuenta, ver historial de moderación de ese usuario e imputar el motivo.

## 7. Plan de Ejecución
1. **Infraestructura (Backend Supabase):** 
   - Crear migraciones SQL para `admin_users`, `admin_audits` y las RPC de lectura privilegiada.
2. **Scaffolding Frontend:** 
   - Inicializar el repo Vite `adventureplay-admin`.
   - Implementar el layout base y protección de rutas.
3. **Módulo Auth & Auditoría:** 
   - Login y testeo de RPC. Visor interno de auditoría.
4. **Módulo de Analítica:** 
   - Integrar gráficos (ej. recharts) consumiendo las vistas/RPC de agregación.
5. **Módulo Gestión y Moderación:** 
   - ABM y detalle de usuarios, y finalmente la lógica de baneo con registro de auditoría.
