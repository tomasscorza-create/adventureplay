# Fase 7 — Endurecimiento de producción

## Resultado

Las fases 7A y 7B están implementadas sobre el protocolo v10. La migración de host de 7C no se
implementó: el transporte cliente a cliente actual no ofrece una operación atómica de elección ni
un token de autoridad que impida dos hosts simultáneos.

## 7A — Validación y seguridad

Todo broadcast v10 viaja en un `CoopWireEnvelope` con versión, identidad declarada, rol y payload.
`CoopSecurityGuard` aplica antes de entregar mensajes al gameplay:

- tamaño máximo por clase de mensaje y rechazo de números no finitos;
- emisor presente, rol coherente y versión compatible;
- input solo de guests, slot ligado al participante, `seq` entero creciente y `bits` entre 0 y 255;
- descarte de duplicados y mensajes viejos por slot;
- token bucket de input a 30 mensajes/s con ráfaga máxima de 12;
- ventana de anomalías de 10 segundos; el host expulsa tras 40 rechazos repetidos, no por jitter
  aislado;
- `snapshot` y `start` solo desde host; `won`/`lost` solo desde host; un guest solo anuncia su
  propia salida;
- compras de cargas positivas enviadas por un guest se rechazan: Broadcast no puede demostrar
  saldo, inventario o transacción legítima.

Como consecuencia, la tienda dentro de una partida co-op queda disponible solo para el host. Para
reabrirla a guests hace falta una RPC transaccional que valide saldo y devuelva las cargas
autoritativas. La presencia inicial sigue siendo información declarada por el cliente: los límites
y tipos se normalizan, pero no constituyen prueba criptográfica de propiedad.

El envelope mejora la validación y trazabilidad, pero `senderKey` no autentica criptográficamente al
emisor. En un canal Broadcast público, un cliente modificado que conozca las claves de Presence
puede intentar suplantarlas. El siguiente escalón de producción es usar canales privados con
Realtime Authorization y trasladar acciones económicas/autoridad durable a RPC de Postgres.

## 7B — Pruebas e instrumentación

La suite `npm run test:coop` cubre protocolo, seguridad, diagnósticos, enlace de escena y harness
multicliente. Incluye 2, 3 y 4 clientes; movimiento; flancos simultáneos; ataque; poderes; victoria;
derrota; retry; cambio de nivel; salida; jitter; duplicados; mensajes viejos; retraso; pérdida;
reordenamiento; desconexión y reconexión compatible/incompatible.

`CoopDiagnostics` está apagado por defecto y no escribe periódicamente en consola. Para una sesión
manual:

```js
localStorage.setItem("cd", "1"); location.reload()
window.__COOP_DIAG__()
localStorage.removeItem("cd"); location.reload()
```

El snapshot expuesto contiene mensajes y bytes enviados/recibidos, tasas, desglose por evento y
slot, snapshots completos/delta, frecuencia efectiva, latencia media de input aplicado, desyncs,
reconexiones y descartes de seguridad. No contiene tokens, sesiones ni payloads del jugador.

Línea base simulada: cuatro clientes durante 10 segundos, 60 FPS, tres guests en movimiento:

| Métrica | Resultado |
|---|---:|
| Snapshots efectivos | 17,7 Hz |
| Input por guest | 9,4 Hz |
| Publicaciones / entregas | 459 / 813 |
| Bytes JSON publicados / entregados | 102.207 / 251.967 |
| Snapshots publicados / entregados | 177 / 531 |
| Inputs publicados | 282 |

La prueba real con cuatro navegadores y Supabase continúa siendo QA manual: iniciar cuatro cuentas,
guardar una lectura inicial, jugar al menos 10 minutos incluyendo poderes y cambio de nivel,
simular una desconexión breve y guardar la lectura final. Los bytes JSON no incluyen WebSocket,
TLS ni overhead del proveedor y no equivalen a facturación.

## 7C — Migración de host bloqueada por diseño

Presence permite observar membresía, pero no ofrece compare-and-swap, lease exclusivo ni fencing
token. Elegir simplemente el guest con menor slot/clientId puede producir split-brain ante una
partición, un evento `leave` tardío o el retorno del host anterior. Por eso no se agregó elección
cliente-cliente ni se modificó el esquema en esta fase.

Infraestructura mínima segura propuesta:

1. Tabla de sesión/lease con `room_id`, `host_user_id`, `epoch`, `lease_expires_at`, versión y último
   keyframe autoritativo.
2. RPC transaccional `claim_coop_host(room_id, expected_epoch)` que valide `auth.uid()`, membresía,
   versión y lease vencido, bloquee la fila, incremente `epoch` y devuelva el resultado atómico.
3. RPC de renovación aceptada solo para el host y epoch vigentes.
4. Todos los mensajes autoritativos incluyen `epoch`; el cliente descarta epochs antiguos. El host
   anterior que regresa se incorpora como guest.
5. Canal privado con políticas RLS/Realtime Authorization; broadcast del cambio solo después del
   commit. Restauración desde el keyframe confirmado por el host anterior, no desde un candidato.
6. Tests de partición: dos candidatos simultáneos, host antiguo que vuelve, lease vencido durante
   cambio de nivel, partida terminada y snapshots de epoch anterior.

La función debe usar `security invoker` cuando sea posible; si requiere `security definer`, debe
fijar un `search_path` vacío, calificar relaciones y restringir explícitamente `EXECUTE`. La
service-role key nunca debe llegar al navegador.

## Verificación

- `npm run test:coop`
- `npm run check`
- auditoría de producción con chunk inicial dentro del límite configurado
