# 📈 Progresión y Niveles

Información extraída de `progression.ts`, `levels.ts` y helpers.

## 1. Nivel del Jugador (XP)
- Rango: 1 al 80.
- Fórmula de XP necesaria: `XP(nivel) = Math.round(350 * Math.pow(nivel, 1.42))`
- Total XP nivel 80: 2,366,225
- **Desbloqueos por Nivel**:
  - Nivel 3: Región "Bosque Encantado"
  - Nivel 4: Héroe "Amy"
  - Nivel 6: Región "Volcán Activo"
  - Nivel 8: Héroe "Faust"
- Bono ORO por subida de nivel: `50 + (nivel * 10)`

## 2. Regiones de Exploración (30 Niveles)
Cada región tiene 10 niveles y sus propias características, instanciadas en `src/game/data/levels/`.

| Región | ID Interno | Temática | Aparición de Enemigos Élite (M3) |
|---|---|---|---|
| Frontera Verde | `verdantFrontier` | Pradera / Bosque verde | M3 desde LV6. M3 es jefe principal LV7-LV10. |
| Bosque Encantado | `enchantedForest` | Púrpura / Peligros | Usa `E2M3` (variante temática). Enemigos agresivos. |
| Volcán Activo | `activeVolcano` | Lava / Rocas | Usa `E3M3` desde LV4. M2 vuela sobre la lava. |

## 3. Escalado de Dificultad (Level Helpers)
Los niveles de exploración se construyen usando `levelHelpers.ts`. 
La función `scaleDifficulty(base, stage)`:
- Incrementa recuento de enemigos
- Disminuye tiempo límite
- Aumenta oro disponible
- Incrementa la agresividad general (IA params)
