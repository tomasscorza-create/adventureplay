# 🌐 Multijugador Co-op — Guía del área

Documentación completa y de continuidad del **modo cooperativo online** de Adventure Play.
Optimizada para agentes de IA: lee esta guía y sigue los enlaces antes de tocar código.

> **Estado (Julio 2026):** co-op online **funcional** de **2 a 4 jugadores** en **Desafío** (`PuzzleScene`) y **Explorar** (`LevelScene`). Protocolo **v13** con input WebSocket por slot, predicción local del guest, interpolación temporal de entidades remotas y reconexión automática de 30 segundos.
> **Advertencia:** Existen problemas conocidos de divergencia y fallos de transporte documentados en la auditoría.

## ⚖️ Jerarquía de Verdad (¡Importante!)

Antes de modificar el multijugador, debes respetar este orden de prioridad como fuente de verdad:

1. **El código actual verificado** (Phaser, React, Supabase).
2. [**auditoria-y-plan-2026-07.md**](file:///c:/Users/usuario/Desktop/adventureplay/contextos/multijugador/auditoria-y-plan-2026-07.md): Documento vivo con los fallos reales vigentes, métricas y plan de trabajo.
3. [**arquitectura-de-red.md**](file:///c:/Users/usuario/Desktop/adventureplay/contextos/multijugador/arquitectura-de-red.md): Modelo teórico, API de sesión, diccionarios de mensajes y problemas actuales.
4. **Resto de documentos** (este README, integraciones, historial).

## 📂 Índice del área

| Documento | Qué contiene |
|---|---|
| [arquitectura-de-red.md](file:///c:/Users/usuario/Desktop/adventureplay/contextos/multijugador/arquitectura-de-red.md) | Transporte (Supabase Realtime), `CoopSession`, modelo host-autoritativo, problemas actuales y limitaciones de tests. |
| [auditoria-y-plan-2026-07.md](file:///c:/Users/usuario/Desktop/adventureplay/contextos/multijugador/auditoria-y-plan-2026-07.md) | Diagnóstico exhaustivo de v10 a v12, plan de fases (0 a 7). |
| [integracion-en-escenas.md](file:///c:/Users/usuario/Desktop/adventureplay/contextos/multijugador/integracion-en-escenas.md) | Implementación en `PuzzleScene` y `LevelScene`: sincronización, colisiones, interpolación. |
| [decisiones-limitaciones-historial.md](file:///c:/Users/usuario/Desktop/adventureplay/contextos/multijugador/decisiones-limitaciones-historial.md) | Decisiones vigentes vs reemplazadas, limitaciones de arquitectura, y cronología técnica. |
| [pruebas-multicliente.md](file:///c:/Users/usuario/Desktop/adventureplay/contextos/multijugador/pruebas-multicliente.md) | Harness determinista de 2–4 clientes y línea base de tráfico. |
| [endurecimiento-produccion.md](file:///c:/Users/usuario/Desktop/adventureplay/contextos/multijugador/endurecimiento-produccion.md) | Seguridad de protocolo, diagnóstico y bloqueo de migración de host. |

## 🎮 Cómo probarlo (2 clientes)

Las pruebas de navegador las hace el usuario (regla de `AGENTS.md`). Requisito clave: **ambos clientes deben apuntar al mismo proyecto Supabase**.

1. De 2 a 4 máquinas o pestañas, cada una autenticada con una cuenta distinta.
2. Menú → **Explorar** o **Desafío** → **Cooperativo / Jugar en cooperativo**.
3. Uno pulsa **Crear sala** (muestra un código de 4 caracteres). Los demás **Unirse** con ese código.
4. El host elige el nivel y pulsa **Comenzar** cuando estén listos.

## ✅ Verificación de código

* `npm run test:coop`: protocolo, link y simulación multicliente. **Nota:** Estos tests *no* cubren transporte real, seguridad entre sesiones continuas, ni la semántica de predicción en las escenas.
* `npm run check`: lint + tipos + suite completa; obligatorio antes de entregar.
