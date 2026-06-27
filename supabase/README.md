# Supabase local y migraciones

El juego usa Supabase Auth y guarda el progreso en `public.game_saves`. Phaser lee/escribe contra `GameSaveStore`, que mantiene un cache sincronico en memoria y encola persistencia remota con `SupabaseSaveAdapter`.

## Validacion local con Docker

```powershell
npm run supabase:start
npm run supabase:reset
npm run supabase:stop
```

`supabase start` levanta el stack local en Docker. `supabase db reset` recrea la base local y aplica todo lo que exista en `supabase/migrations`.

Este repo usa puertos locales `554xx` para no chocar con otros proyectos Supabase:

- API: `http://127.0.0.1:55421`
- DB: `postgresql://postgres:postgres@127.0.0.1:55422/postgres`
- Studio: `http://127.0.0.1:55423`

## Llevar a Supabase real

1. Crear o elegir un proyecto Supabase real.
2. Ejecutar `supabase login`.
3. Ejecutar `supabase link --project-ref <project-ref>`.
4. Revisar la migracion en `supabase/migrations`.
5. Aplicar con `supabase db push`.
6. Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en el entorno real.

## Cliente web

- `src/shared/supabase/client.ts` crea el cliente Supabase.
- `src/ui/screens/AuthScreen.tsx` maneja email/password.
- `src/game/systems/save/GameSaveStore.ts` mantiene el save actual para Phaser y evita carreras de snapshots viejos.
- `src/game/systems/save/SupabaseSaveAdapter.ts` usa `upsert` sobre `game_saves`.
