# Informe Fase 7 — sala de 4 y preparación para escala

## Estado

- Preparación técnica y cobertura automática: **completadas**.
- Certificación real de cuatro jugadores: **pendiente de QA manual** con cuatro clientes, al menos
  dos dispositivos, throttling, nivel encadenado, reconexión y salida.
- Comparación contra consumo real del proyecto: **pendiente del dashboard de Supabase**.
- Implementar ocho jugadores: fuera de alcance; el protocolo continúa limitado a
  `COOP_MAX_PLAYERS = 4`.

## Medición determinista de cuatro jugadores

Carga: 10 segundos, host + 3 guests, movimiento sostenido, snapshots nominales a 20 Hz,
keyframes a 4 Hz e inputs con cambio + keepalive.

| Métrica | Resultado |
|---|---:|
| Snapshots publicados | 177 (17,7/s efectivos) |
| Entregas de snapshots | 531 |
| Inputs publicados | 282 (9,4/s por guest) |
| Publicaciones totales | 459 |
| Entregas totales | 813 |
| Mensajes facturables mínimos | 1.272 (127,2/s) |
| Bytes publicados | 113.616 (≈11,36 KB/s) |
| Bytes entregados | 286.194 (≈28,62 KB/s) |

La cuenta facturable es un **mínimo**: Supabase cuenta cada broadcast enviado y cada entrega a un
suscriptor; Presence, joins y reconexiones reales no están incluidos en el harness. A esta tasa,
una sala sostenida durante 10 minutos representa aproximadamente 76.320 mensajes y una hora
aproximadamente 457.920.

## Contraste con límites oficiales consultados el 2026-07-11

Supabase documenta límites de 100 mensajes/s en Free, 500 en Pro con spend cap y 2.500 en Pro sin
spend cap/Team. La carga simulada de 127,2 mensajes/s supera el límite Free y queda dentro de Pro.
Los límites de conexiones son 200 Free y 500 Pro; una sala usa cuatro clientes WebSocket. El host
se une a cuatro canales y cada guest a dos (10 joins totales), lejos del límite de 100 canales por
conexión. Fuentes: [Realtime Limits](https://supabase.com/docs/guides/realtime/limits),
[Realtime Messages](https://supabase.com/docs/guides/platform/manage-your-usage/realtime-messages),
[Realtime Pricing](https://supabase.com/docs/guides/realtime/pricing).

La cuota mensual publicada es 2 millones de mensajes en Free y 5 millones en Pro. Si esta carga
fuera continua y exclusiva del juego, equivale aproximadamente a 4,37 horas-sala mensuales en
Free o 10,92 en Pro antes de agotar la cuota incluida. Esto no sustituye el reporte real: revisar
Project Settings → Product Reports → Realtime y la Usage page, como indica
[Realtime Reports](https://supabase.com/docs/guides/realtime/reports).

## Preparación técnica realizada

- Rangos de slot del guard derivados de `COOP_MAX_PLAYERS`.
- Formación de spawn centrada, acotada al mundo y probada hasta ocho posiciones.
- Harness con jitter determinista no nulo por defecto.
- Caso automático de cuatro jugadores con encadenado, reconexión y salida.
- Keyframes completos a 4 Hz; recuperación máxima teórica de secciones delta ≈250 ms.

## Puerta para estudiar ocho jugadores

Antes de subir `COOP_MAX_PLAYERS` hacen falta: QA real de cuatro, consumo del dashboard, decisión de
plan/costo y diseño de encoding compacto. Cambiar el máximo requerirá bump de protocolo y revisar
tamaño lineal de `players[]`, topics de input, presencia, HUD y densidad de spawn. Este informe no
autoriza ni implementa ocho jugadores.
