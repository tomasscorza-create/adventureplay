# ⚔️ Modos de Juego: Modo Explorar

Es el modo principal de acción de Adventure Play. Controlado íntegramente por `LevelScene.ts` (60KB).

## 1. Objetivo y Bucle
- Desplazamiento lateral rápido, plataformas y combate.
- **Auto-scroll punitivo**: Una línea de presión roja avanza; si atrapa al jugador, causa daño periódico.
- **Victoria**: Alcanzar la meta final (`Goal`).
- **Derrota**: HP llega a 0 (caída a precipicios/magma, o daño excesivo de enemigos).

## 2. Diferencias con Modo Desafío
- **SÍ hay enemigos**: M0, M1, M2 y M3.
- **Mecánicas de combate activas**: Uso de ataques cuerpo a cuerpo (melee), ataques giratorios (spin) y ataques letales (proyectiles)
- **Aceleración y Ritmo**: Los niveles recompensan la velocidad y evitan la exploración estática profunda.

## 3. Elementos Físicos del Modo
- **Plataformas Móviles**: Definidas en data (`platformPath`). Pueden transportar al jugador y a enemigos.
- **Cajas Recompensas**: Destructibles. Contienen ORO, Corazones, ítems.
- **Checkpoints**: Un punto fijo por nivel donde el jugador reaparecerá al morir, conservando su progreso de esa "run".

## 4. Recompensas e Impacto
- Las estadísticas de cada intento son enviadas a React mediante `GAME_OVER`.
- ORO y XP acumulado persisten si el jugador termina exitosamente o pierde, no se reinicia a 0.
