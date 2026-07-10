# Pruebas multicliente y simulación de red

## Alcance

`src/game/systems/net/CoopMulticlient.test.ts` ejecuta `CoopSceneLink` con un transporte
determinista en memoria definido en `src/game/systems/net/testing/CoopNetworkHarness.ts`.
No abre sockets ni requiere Supabase: simula el fan-out de broadcasts, slots, reloj, retrasos,
pérdidas y reordenamiento para obtener resultados reproducibles.

Ejecutar:

```powershell
npm run test:coop
```

## Cobertura

- Entrada y roster inicial con 2, 3 y 4 clientes.
- Host y guests con slots deterministas.
- Sincronización inicial y snapshots host-autoritativos.
- Movimiento, salto, ataque cuerpo a cuerpo y consumo de poderes.
- Victoria, derrota, salida de un guest y cambio encadenado de nivel.
- Snapshot retrasado, input reordenado, pérdida de input y pérdida de snapshot.
- Recuperación del movimiento sostenido mediante keepalive.
- Reserva y recuperación del mismo slot, rechazo por versión, expiración y resultado durante desconexión.
- Conteo de publicaciones, entregas por fan-out, descartes y bytes JSON aproximados.

## Línea base de tráfico

Medición determinista del 2026-07-10: 4 clientes, 60 FPS simulados, 10 segundos, tres guests
manteniendo movimiento y un snapshot simple con cuatro estados de jugador.

| Métrica | Resultado |
|---|---:|
| Frecuencia efectiva de snapshots | 17,7 Hz |
| Frecuencia de input por guest | 9,4 Hz |
| Publicaciones | 459 |
| Entregas después de fan-out | 813 |
| Bytes JSON publicados | ~71.244 B |
| Bytes JSON entregados | ~197.994 B |
| Snapshots publicados / entregados | 177 / 531 |
| Inputs publicados | 282 |

Los bytes miden únicamente `JSON.stringify(payload)` en UTF-8. No incluyen envelopes de
Supabase, WebSocket, TLS ni headers; sirven como presupuesto comparativo y detector de regresiones,
no como estimación de facturación exacta.

El límite configurado es 20 Hz, pero con frames de 16,67 ms y el throttle actual basado en
`timeMs - lastSnapshotSentAt >= 50`, el resultado efectivo es ~17,7 Hz por redondeo y deriva. La
prueba acepta 17–20 Hz y deja este dato visible para una optimización posterior.

## Límites del harness

- Verifica la lógica de protocolo y `CoopSceneLink`; no reemplaza una prueba real de Supabase
  Realtime, autenticación, presencia ni cuotas del proyecto alojado.
- El modelo de gameplay es mínimo. Las colisiones y físicas completas de Phaser continúan siendo
  responsabilidad de las pruebas de escena y del QA manual multicliente.
- La pérdida de un input sostenido se recupera por keepalive. Un `justPressed` breve cuyo único
  broadcast se pierde no tiene confirmación ni retransmisión en el protocolo actual.
