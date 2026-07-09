# Adventure Play

Juego de plataformas 2D construido con React, TypeScript, Vite y Phaser. React controla autenticacion y UI; Phaser controla gameplay, fisicas y escenas. El progreso requiere una cuenta y se sincroniza con Supabase.

## Puesta en marcha

Requisitos: Node.js 24 y npm. Docker solo es necesario para ejecutar Supabase local.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Configura en `.env.local` una URL y publishable key validas. Para usar el backend local:

```powershell
npm run supabase:start
npm run supabase:reset
npm run dev
```

Detenerlo con `npm run supabase:stop`.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Servidor local Vite |
| `npm run check` | Lint, tipos, tests, auditorias y build |
| `npm run test` | Suite Vitest |
| `npm run build` | Build PWA y auditoria de produccion |
| `npm run preview` | Previsualizar `dist` |

## Arquitectura

- `src/App.tsx`: orquestacion React y estados globales.
- `src/ui/`: pantallas, componentes y hooks React.
- `src/game/`: escenas, entidades, sistemas y datos Phaser.
- `src/game/systems/save/`: cache sincronica y persistencia Supabase.
- `src/game/systems/net/`: transporte del co-op online (Supabase Realtime, host-autoritativo).
- `src/styles/`: estilos separados por area conservando la cascada.
- `supabase/migrations/`: fuente de verdad del esquema remoto.

Lee [AGENTS.md](./AGENTS.md) antes de modificar codigo. La configuracion de Supabase esta en [supabase/README.md](./supabase/README.md), el estado Android/PWA en [docs/android-pwa-readiness.md](./docs/android-pwa-readiness.md) y las verificaciones antiguas en [docs/verification-history.md](./docs/verification-history.md).

## Produccion y compatibilidad

- Sitio: <https://adventureplay.netlify.app/>
- Build: `npm run build`; publicacion: `dist`.
- Variables: `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
- `superjuego` se conserva solo como `project_id` del stack Supabase local y dentro de una migracion ya desplegada. No debe reutilizarse como nombre publico, paquete npm ni ruta del repositorio; cambiar esos dos identificadores rompería continuidad local o alteraria historial remoto.

El QA visual y los recorridos completos de gameplay son manuales. La validacion automatica obligatoria antes de entregar es `npm run check`.
