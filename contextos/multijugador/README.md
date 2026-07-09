# 🌐 Multijugador Co-op — Guía del área

Documentación completa y de continuidad del **modo cooperativo online** de Adventure Play.
Cubre todo lo construido, no solo lo último. Optimizada para agentes de IA: tablas sobre prosa,
valores y nombres exactos del código fuente.

> **Estado (actualizado):** co-op online **funcional** en los dos modos jugables:
> **Desafío** (`PuzzleScene`) y **Explorar** (`LevelScene`). Host-autoritativo sobre Supabase
> Realtime, cámara independiente por dispositivo, fin de partida compartido. Protocolo **v4** con
> modelo de slots N-ready (gameplay aún de 2 jugadores). Ver historial de fases en
> `decisiones-limitaciones-historial.md`.

## Índice del área

| Documento | Qué contiene |
|---|---|
| `arquitectura-de-red.md` | Transporte (Supabase Realtime), `CoopSession`, mensajes, modelo host-autoritativo, mapa de archivos. |
| `integracion-en-escenas.md` | Cómo `PuzzleScene` y `LevelScene` implementan el co-op: jugadores, snapshots, interpolación, colisiones, fin compartido. Tabla de qué se sincroniza por modo. |
| `decisiones-limitaciones-historial.md` | Decisiones de diseño y su porqué (cámara, presión, fate), limitaciones conocidas, evolución y continuidad. |

## Resumen ejecutivo (30 segundos)

- **Transporte:** un singleton fuera de Phaser (`coopSession`) sobre **Supabase Realtime**
  (broadcast + presence, canal `coop-room-<CÓDIGO>`). Sin servidor propio, sin tablas, sin RLS.
- **Modelo:** **host-autoritativo**. El host simula toda la física de ambos jugadores y del
  mundo, y transmite *snapshots* ~20 Hz. El guest envía su input **al cambiar** (tope 30 Hz) más
  un keepalive, **congela** sus cuerpos autoritativos y renderiza el snapshot interpolado.
- **Slots (protocolo N-ready):** `this.player` = **slot 0** = **host**; `this.player2` = **slot 1**
  = **guest**. El input lleva el slot del emisor y `players` del snapshot es un arreglo por slot.
  El gameplay usa 2 (`COOP_MAX_PLAYERS = 2`), pero el protocolo ya admite más. Toda la mecánica de
  red común vive en `CoopSceneLink`.
- **Cámara:** **independiente por dispositivo** (cada pantalla sigue a su personaje local).
- **Fin compartido:** muerte de cualquiera o tiempo agotado → derrota para ambos; llegar a la
  meta → victoria para ambos.
- **UI:** `CoopLobby.tsx` (parametrizado por modo) abierto desde `ChallengeView`/`ExploreView`.
- **Regla de oro:** el modo red **solo se activa si llega `coop`**; single-player queda idéntico.

## Cómo probarlo (2 clientes)

Las pruebas de navegador las hace el usuario (regla de `AGENTS.md`). Requisito clave:
**ambos clientes deben apuntar al mismo proyecto Supabase** (el deploy de Netlify ya lo comparte;
en local, ambos contra la misma instancia).

1. Dos máquinas o dos pestañas, cada una autenticada.
2. Menú → **Explorar** o **Desafío** → **Cooperativo / Jugar en cooperativo**.
3. Uno pulsa **Crear sala** (muestra un código de 4 caracteres). El otro **Unirse** con ese código.
4. Cuando ambos están presentes, el **host** elige el nivel y pulsa **Comenzar**.
5. Verificar: movimiento independiente, colisiones/objetivos que responden a ambos, y
   derrota/victoria compartida.

## Verificación de código

`npm run check` (lint + tipos + tests + auditorías + build) debe pasar antes de entregar.
