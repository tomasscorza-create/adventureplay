# 📡 Comunicación Phaser ↔ React

Adventure Play usa el patrón de Event Bus tipado para mantener Phaser (Gameplay) y React (UI) completamente desacoplados.

## Archivo Central
`src/game/events/EventBus.ts`

## Lista de Eventos Tipados (GameEvents)

| Nombre del Evento | Payload (`data`) | Dirección | Propósito |
|---|---|---|---|
| `START_GAME` | `{ levelId: string }` | React → Phaser | Inicia un nivel del Modo Explorar. |
| `START_PUZZLE` | `{ levelId: string }` | React → Phaser | Inicia una cámara del Modo Desafío. |
| `GAME_OVER` | `{ won: boolean; stats: RunStats }` | Phaser → React | Fin de partida (victoria/derrota) para mostrar pantalla de resumen. |
| `PAUSE_GAME` | *ninguno* | React → Phaser | Solicita pausar la escena y físicas. |
| `RESUME_GAME` | *ninguno* | React → Phaser | Solicita quitar pausa a la escena. |
| `QUIT_TO_MENU` | *ninguno* | React → Phaser | Forza la destrucción de la escena actual y vuelve al menú. |
| `HUD_UPDATE` | `HudState` | Phaser → React | Se emite frame a frame o al cambiar vida/monedas. Actualiza el HUD. |
| `ACHIEVEMENT_UNLOCKED` | `{ id, name, icon, reward }` | Phaser → React | Dispara el *toast* (tarjeta) de logro en UI. |
| `LEVEL_UP` | `{ level, rewards }` | Phaser → React | Dispara el *toast* (tarjeta) de level up en UI. |
| `SAVE_STATUS` | `{ status: "saving" \| "saved" \| "error" }` | Systems → React | Actualiza el icono de sincronización con la nube (Supabase). |
| `POWER_SHOP_REQUEST` | `{ type: "regen" \| "lethal" }` | Phaser → React | Abre la UI de compra pausando el juego. |
| `POWER_SHOP_RESULT` | `{ purchased: boolean }` | React → Phaser | Notifica a Phaser si el jugador compró la recarga o canceló. |

> **Nota**: Para enviar eventos a React desde Phaser usar:
> `EventBus.emit("EVENTO", payload)`
> Para escuchar eventos de Phaser en React usar:
> `useEffect(() => { EventBus.on("EVENTO", callback); ... return cleanUp }, [])`
