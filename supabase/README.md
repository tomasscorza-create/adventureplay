# Supabase local y despliegue remoto

El juego usa Supabase Auth y guarda el progreso en `public.game_saves`. Phaser lee y escribe mediante `GameSaveStore`; `SupabaseSaveAdapter` sincroniza el save en segundo plano. El progreso no usa `localStorage`.

## Identificador local compatible

El producto y el repositorio se llaman `Adventure Play` / `adventureplay`. `supabase/config.toml` conserva `project_id = "superjuego"` para no renombrar los recursos Docker locales existentes. La misma palabra aparece en un comentario de la migracion `20260626000000_create_game_saves.sql`, que ya fue aplicada en remoto y no debe reescribirse. Ninguna de las dos apariciones es marca publica ni nombre del proyecto alojado.

## Validacion local con Docker

```powershell
npm run supabase:start
npm run supabase:reset
supabase db lint --local
npm run supabase:stop
```

`supabase db reset` recrea la base local, aplica en orden todos los archivos de `supabase/migrations` y luego ejecuta `supabase/seed.sql`.

Puertos locales aislados de otros proyectos:

- API: `http://127.0.0.1:55421`
- DB: `postgresql://postgres:postgres@127.0.0.1:55422/postgres`
- Studio: `http://127.0.0.1:55423`

## Estado preparado para remoto

- `20260626000000_create_game_saves.sql` crea la tabla, el trigger y las politicas RLS.
- `20260630000000_harden_game_saves_ownership.sql` vincula cada save con `auth.users`, elimina sus saves si se elimina la cuenta, restringe permisos al rol autenticado y endurece la funcion del trigger.
- Cada usuario solo puede leer o modificar filas cuyo `user_id` coincida con `auth.uid()`.
- El cliente admite `VITE_SUPABASE_PUBLISHABLE_KEY`; `VITE_SUPABASE_ANON_KEY` queda como compatibilidad con claves legacy.

## Proyecto alojado actual

- Nombre: `adventureplay`.
- Project ref: `hlfyhbvzenuepojifetb`.
- URL: `https://hlfyhbvzenuepojifetb.supabase.co`.
- Las migraciones `20260626000000` y `20260630000000` fueron aplicadas el 2026-06-30.
- El frontend local apunta al proyecto mediante `.env.local`, que permanece fuera de Git.

No volver a ejecutar la primera conexion salvo que cambie el proyecto vinculado. Para comprobar sincronizacion usar `supabase migration list`; para cambios nuevos, crear otra migracion y no editar las ya desplegadas.

## Primera conexion a Supabase alojado

No ejecutar estos comandos hasta tener creado el proyecto correcto y acceso autorizado.

```powershell
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase db push --dry-run
supabase db push
supabase migration list
```

Para un proyecto remoto nuevo, no hace falta `db pull`. Si el proyecto elegido ya contiene tablas o migraciones, ejecutar primero `supabase db pull`, revisar el SQL generado y resolver cualquier diferencia antes de hacer `db push`.

El seed local esta vacio y no debe enviarse a produccion. No usar `--include-seed` salvo que se agreguen datos de produccion deliberadamente.

## Variables del frontend

Copiar la URL y la publishable key desde el dialogo **Connect** del proyecto:

```env
VITE_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Guardarlas en `.env.local` para desarrollo o en las variables protegidas del proveedor de despliegue. Volver a compilar despues de cambiarlas. Nunca exponer `service_role`, `sb_secret_...`, la contrasena de Postgres ni un personal access token en variables `VITE_*`.

## Auth para produccion

En el Dashboard de Supabase:

1. Mantener habilitado Email/Password.
2. Definir **Site URL** con el dominio real del juego.
3. Agregar los dominios autorizados en **Redirect URLs**.
4. Elegir si se exige confirmacion de email. El cliente admite ambos casos: con confirmacion muestra un aviso y espera el inicio de sesion; sin confirmacion entra directamente.
5. Antes de publicar a usuarios reales, configurar SMTP propio para correos de confirmacion y recuperacion.

## Comprobacion posterior al despliegue

1. Ejecutar `npm run build` con las variables remotas.
2. Crear un usuario de prueba y confirmar el email si corresponde.
3. Entrar, elegir heroe y producir un cambio de progreso.
4. Confirmar en Table Editor que existe exactamente una fila `game_saves` para ese usuario y slot `default`.
5. Confirmar que `save_version` coincide con `SAVE_SCHEMA_VERSION` y que `save_data` contiene el cambio.
6. Probar con una segunda cuenta que no puede leer ni alterar el save de la primera.

## Flujo para cambios futuros de base de datos

```powershell
supabase migration new nombre_del_cambio
npm run supabase:reset
supabase db lint --local
supabase db push --dry-run
supabase db push
```

No modificar la base remota manualmente desde Table Editor o SQL Editor. La fuente de verdad versionada es `supabase/migrations`.
