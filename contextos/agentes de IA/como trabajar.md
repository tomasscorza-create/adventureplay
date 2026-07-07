# Protocolo de Colaboración para Agentes de IA
**Proyecto**: Adventure Play
**Objetivo**: Garantizar el trabajo continuo, seguro y sin colisiones entre múltiples agentes de Inteligencia Artificial que intervengan en este repositorio.

---

## 1. Fase de Reconocimiento (Antes de tocar código)
Todo agente que despierte en este repositorio **debe** seguir estos pasos obligatorios:
- **Leer la Biblia del Proyecto (`AGENTS.md`)**: Es la fuente de la verdad para invariantes, reglas de arquitectura y estado del proyecto. Nunca asumas la estructura del stack.
- **Revisar el estado del árbol de trabajo**: Ejecuta `git status --short`. Si hay cambios sin confirmar de otro agente o del usuario, respétalos. No sobrescribas trabajo ajeno a menos que se solicite explícitamente.
- **Consultar contextos previos**: Revisa los resúmenes en la carpeta `/contextos/` y en `/modo de juegos/` para entender las mecánicas ya exploradas por otros agentes.

## 2. Respeto Arquitectónico (Invariantes Intocables)
Para no romper implementaciones anteriores, todo agente debe interiorizar las siguientes barreras:
- **Separación UI / Gameplay**: `React` renderiza la UI (HUD, menús, tiendas), `Phaser` renderiza el gameplay y procesa físicas. **No se acoplan directamente**. Se comunican exclusivamente por `EventBus.ts`.
- **Diseño Orientado a Datos**: Si necesitas agregar un enemigo, nivel o cámara de puzzle, **no crees lógica nueva** de forma inicial. Agrega la configuración a `levels.ts`, `enemies.ts`, `puzzleLevels.ts` o `achievements.ts`.
- **Single Source of Truth para Guardado**: El progreso solo se muta a través de `GameSaveStore`. Las escenas y las entidades no llaman directamente a `Supabase` ni a `localStorage`.

## 3. Trabajo de Múltiples Agentes y Subagentes
Si un agente principal (como Antigravity) lanza subagentes para realizar tareas:
- **Aislamiento de tareas**: A un subagente se le debe asignar un área de investigación o modificación completamente distinta a la de otro (ej. "Tú investiga la UI en React, tú investiga el puzzle en Phaser").
- **Evitar colisión de escritura**: Los agentes nunca deben sobreescribir el mismo archivo en paralelo.
- **Workspaces clonados (Opcional)**: Si una tarea es altamente experimental o destructiva, el agente debe usar un workspace aislado o rama independiente para no afectar el repo base hasta que se valide el código.

## 4. Validación Obligatoria (Control de Calidad)
Ningún agente puede declarar una tarea de programación como terminada sin antes verificar que no ha roto nada:
- Es imperativo ejecutar `npm run check`.
- Esto ejecutará el linter, el typechecker (TypeScript), los tests (Vitest) y las auditorías de datos personalizadas (`audit:levels`, `audit:achievements`, `audit:progression`).
- Si `npm run check` falla, el agente debe corregir el código antes de finalizar su turno.

## 5. Dejar Huella para el Siguiente Agente
El trabajo de un agente no termina con el código fuente.
- **Documentación de continuidad**: Si un agente toma una decisión arquitectónica nueva o resuelve un bug crítico, debe actualizar `AGENTS.md` o crear un archivo de contexto explicando el porqué de la solución.
- El código es la fuente del comportamiento; la documentación es la fuente de las *decisiones*. Si ambos difieren, el agente posterior debe alertar de ello.

---
*Propuesta creada y optimizada por la IA para asegurar la máxima durabilidad, estabilidad y sinergia del ecosistema colaborativo.*
