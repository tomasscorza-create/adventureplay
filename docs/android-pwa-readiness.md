# Estado Android y PWA

Revision tecnica: 2026-06-30.

## Alcance actual

Adventure Play se distribuye actualmente como PWA desde Netlify. El repositorio no contiene un proyecto Android, APK, AAB, Trusted Web Activity ni Capacitor. Por eso no existen todavia `compileSdk`, `targetSdk`, firma de aplicacion, Play App Signing ni un paquete que Google pueda certificar.

La instalacion desde Chrome Android genera un WebAPK administrado y firmado por el proveedor del navegador. Esa instalacion web no convierte este repositorio en una aplicacion publicada en Google Play.

## Estado tecnico de la PWA

- Manifiesto con `id`, `name`, `short_name`, `start_url`, `scope`, idioma, direccion, colores, categorias y descripcion.
- Experiencia preferida `fullscreen` con fallback `standalone` y `minimal-ui`.
- Orientacion landscape e iconos PNG 192/512, icono maskable 512 y Apple Touch Icon.
- Service worker de produccion, limpieza de caches viejos y endpoints Supabase siempre en red.
- Actualizaciones bajo confirmacion para no recargar una partida activa.
- Boton de instalacion visible solo en telefonos y solo mientras la app no se ejecuta instalada. Usa el dialogo nativo cuando Chromium entrega `beforeinstallprompt`; en navegadores sin esa API muestra el procedimiento manual.

## Requisitos Google/Android que no se resuelven con codigo web

Si se publica un APK/AAB o una Trusted Web Activity en Google Play, antes del envio hay que:

1. Crear y verificar la cuenta de desarrollador o empresa. La verificacion de desarrolladores Android comienza a aplicarse el 30 de septiembre de 2026 en Brasil, Indonesia, Singapur y Tailandia y se amplia globalmente en 2027.
2. Registrar el nombre de paquete y firmar el artefacto. La identidad, documentos, telefono, direccion y, para organizaciones, D-U-N-S no pueden completarse desde este repositorio.
3. Usar el SDK estable actual al crear el proyecto nativo: Android 16 / API 36 y Build Tools 36.x. La regla vigente de Google Play exige como minimo Android 15 / API 35 para nuevas apps y actualizaciones, pero un proyecto nuevo debe preferir API 36 y volver a comprobar el requisito antes de cada envio porque la politica avanza con Android.
4. Completar en Play Console App content, clasificacion por edades, audiencia objetivo, acceso de revisores y Data safety.
5. Publicar una politica de privacidad real, accesible tanto desde la ficha de Play como desde la app, que identifique al responsable y describa email de cuenta, progreso remoto, finalidad, retencion, eliminacion y proveedores. No se deben inventar esos datos legales en codigo.
6. Declarar de forma exacta la recoleccion y transferencia de datos de Supabase y cualquier analitica o SDK futuro. Incluso una app que declare no recolectar datos debe completar Data safety y enlazar su politica de privacidad.
7. Probar el artefacto firmado en dispositivos fisicos y revisar Android vitals, accesibilidad, contenido, permisos y comportamiento de pantalla completa antes de produccion.

Ninguna revision local puede prometer por si sola la aprobacion o certificacion de Google Play: depende del artefacto final, la cuenta verificada, las declaraciones del titular, el contenido publicado y la revision de Google.

## Fuentes oficiales de continuidad

- Requisitos de API objetivo: https://support.google.com/googleplay/android-developer/answer/11926878
- SDK Android 16: https://developer.android.com/about/versions/16/setup-sdk
- Verificacion de desarrolladores Android: https://developer.android.com/developer-verification/guides
- Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Instalacion PWA: https://web.dev/learn/pwa/installation/
- Prompt de instalacion PWA: https://web.dev/learn/pwa/installation-prompt/
