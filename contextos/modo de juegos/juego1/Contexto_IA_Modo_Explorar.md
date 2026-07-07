# Contexto para Agentes de IA: Adventure Play - Modo Explorar (Explore)

**Archivo Principal**: `src/game/scenes/LevelScene.ts`
**Tipo**: Plataformero 2D side-scrolling de acción con físicas Arcade (Phaser 3).

## 1. Bucle Principal (Core Loop)
- **Objetivo**: Atravesar el nivel de izquierda a derecha, superar obstáculos, combatir enemigos y llegar a la meta.
- **Condiciones de Derrota**: Vida llega a 0 (por enemigos, trampas, caídas) o se acaba el tiempo.
- **Presión Constante**: Una "línea de presión" roja avanza desde la izquierda (auto-scroll). Si atrapa al jugador, hace 1 de daño por segundo.
- **Recompensas**: XP para subir el nivel del jugador y ORO (monedas) para comprar cargas de poder.

## 2. Estructura de Mundo (30 niveles)
Se divide en 3 regiones temáticas (10 niveles cada una), definidas en `src/game/data/levels/`:
1. **Frontera Verde (Verdant Frontier)**: Introductoria. Niveles largos. Plataformas móviles desde nivel 4.
2. **Bosque Encantado (Enchanted Forest)**: Niveles compactos y rápidos. Peligros: espinas, sierras. Enemigos agresivos.
3. **Volcán Activo (Active Volcano)**: Pozos de magma, límites de tiempo muy ajustados. Scroll rojo muy rápido.

## 3. Entidades y Combate
- **Jugador (5 Héroes)**: Stats variables (velocidad, salto, vida). Combate: ataque melee, ataque giratorio, pisotón (stomp) desde arriba y proyectil letal (consume cargas).
- **Enemigos** (`src/game/entities/enemies/`):
  - **M0**: Estático, pisable.
  - **M1**: Patrulla y persigue por el suelo.
  - **M2**: Volador con patrones de picado.
  - **M3 (Élite)**: IA compleja (máquina de estados: alerta, persecución, salto sobre vacíos, ataque, recuperación). Escala su inteligencia según el nivel.
  *(Cada región aplica sus propias texturas/skins a estos mismos arquetipos).*

## 4. Sistemas Transversales
- **Progresión**: Manejada por `ProgressionSystem`. La XP sube el nivel global del jugador, desbloqueando mejoras.
- **Tienda de Poder**: Se accede pausando. Usa ORO para comprar cargas de curación (regen) o ataque instantáneo (lethal).
- **Checkpoints**: Un punto intermedio por nivel. Salva la posición para reapariciones.
- **Guardado**: `GameSaveStore` persiste el estado en Supabase (héroe activo, ORO, cargas, niveles completados, estadísticas).
- **Logros**: 20 logros de Explorar (Aventura, Combate, Descubrimiento) gestionados por `AchievementSystem`.
