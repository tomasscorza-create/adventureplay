# 👥 Entidades y Stats

Esta es la fuente de verdad de stats base. Valores actualizados del código (`characters.ts`, `enemies.ts`, `items.ts`).

## 1. Héroes Jugables (Player)
| ID | Nombre | Desbloqueo | Vida (HP) | Vel. Movimiento | Salto (Y) | Daño Melee | Daño Giro (Spin) | CD Giro (ms) |
|---|---|---|---|---|---|---|---|---|
| `dunel` | Dunel | Inicial | 4 | 260 | -520 | 25 | 18 | 800 |
| `ruder` | Ruder | Inicial | 5 | 200 | -480 | 40 | 30 | 1000 |
| `sarix` | Sarix | Inicial | 3 | 320 | -600 | 20 | 14 | 600 |
| `amy` | Amy | Nivel Jugador 4 | 6 | 180 | -440 | 45 | 35 | 1200 |
| `faust` | Faust | Nivel Jugador 8 | 4 | 280 | -540 | 30 | 22 | 700 |

## 2. Enemigos
| ID | Nombre interno | HP | Daño a jugador | Velocidad | Pisable (Stomp) | ORO (rango) | XP |
|---|---|---|---|---|---|---|---|
| `m0` | Slime / M0 | 1 | 10 | 60 | Sí | 2-4 | 8 |
| `m1` | Goblin / M1 | 1 | 15 | 100 | Sí | 4-7 | 15 |
| `m2` | Hawk / M2 | 2 | 20 | 130 | No (Volador) | 7-12 | 25 |
| `m3` | Guardian / M3 | 2 | 30 | 150 | No (Élite) | 12-18 | 40 |

> **Nota IA de M3**: Máquina de estados (idle, alert, chase, jump, attack, recover, hurt, defeated). Detecta precipicios y no cae.

## 3. Ítems
| ID | Tipo | Valor / Uso |
|---|---|---|
| `bronzeCoin` | Moneda | +1 ORO |
| `silverCoin` | Moneda | +5 ORO |
| `goldCoin` | Moneda | +20 ORO |
| `healthPotion` | Consumible | Cura 1 HP (Inventario) |
| `heartPickup` | Pickup | Cura 1 HP inmediato |
| `inventoryPiece` | Coleccionable | Usado para logros / progresión futura |
