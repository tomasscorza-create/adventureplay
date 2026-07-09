# 🎮 Sistema de Input y Controles

Esta es la fuente de la verdad para el manejo de controles de usuario en *Adventure Play*.

## 1. Regla de Input Unificado
**Toda entrada jugable debe agregarse primero al input unificado, nunca como acceso directo a DOM, teclado o pointer desde la escena o entidades.** Phaser (y entidades como `Player` o `MovementSystem`) no deben leer eventos crudos del teclado.

## 2. Sistemas Centrales
- `src/shared/types/input.ts`: Define `GameplayInputState` y `GameplayInputFrame`.
- `src/game/systems/input/TouchInputStore.ts`: Maneja el estado táctil global y la cola de pulsaciones (taps rápidos).
- `src/game/systems/input/GameplayInputSystem.ts`: Combina y procesa teclado + táctil en un frame de input unificado.
- `src/game/systems/movement/MovementSystem.ts`: Consume el `GameplayInputFrame`.
  - **Tolerancias vitales:** Conserva pulsaciones de salto durante 120 ms (coyote time/buffer de pre-salto) y permite 100 ms de gracia al abandonar una superficie para facilitar saltos al borde.

## 3. Controles Desktop (Teclado)
- **Movimiento:** Flecha izquierda/A, Flecha derecha/D.
- **Salto:** Flecha arriba, W o Espacio.
- **Ataque cuerpo a cuerpo:** J.
- **Ataque giratorio:** K.
- **Regenerar vida:** Q.
- **Poder letal:** E.
- **Pausa:** P o Esc.
- En desktop, los controles mágicos (`AbilityControls`) muestran badges clicables en la esquina inferior derecha. 

## 4. Controles Mobile (Táctiles)
El juego monta `MobileControls` cuando detecta viewport táctil/móvil usando la constante global `MOBILE_GAMEPLAY_QUERY` (no duplicar en CSS y Phaser).

### Comandos y Disposición
- Los controles deben ocupar los bordes inferiores y nunca tapar el centro de la acción.
- Existen dos perfiles: **Comando 1** y **Comando 2**. Se personalizan (tamaño, separación, opacidad) en Opciones. 
- **Comando 1:** Botones translúcidos de movimiento a la izquierda y una fila compacta de ataques a la derecha.
- **Comando 2:** Joystick exclusivamente horizontal en la izquierda. Botones de ataque organizados en órbita alrededor del botón principal de Espada (J).
- **Modo Zurdo:** Intercambia completamente los bloques (movimiento a la derecha, acción a la izquierda).

### Reglas de Salto Libre y Zonas Extendidas
- **Salto Libre Táctil:** Cualquier toque (`pointerdown`) sobre un área libre de la pantalla encola un salto. ¡Ningún botón, joystick ni halo de protección debe activar el salto por propagación!
- **Zonas Extendidas:** Los botones (especialmente movimiento y espada) tienen hitboxes invisibles ampliados.
- **Halos de Bloqueo:** Existe un halo invisible alrededor de los botones táctiles y joystick (32px en Comando 2) para interceptar toques fallidos e impedir que disparen accidentalmente el "salto libre".

### Buffer y Haptics Mobile
- `MobileActionBuffer`: Conserva comandos táctiles de ataque (J/K) durante 120 ms.
- `GameHaptics`: Usa `navigator.vibrate` (mejora progresiva) para saltos ejecutados, golpes y curaciones. Un joystick da una vibración muy sutil solo al iniciar el toque, no de forma continua.
