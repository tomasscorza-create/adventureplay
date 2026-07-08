# 💾 Guardado y Supabase

Información crítica de cómo persiste la información (`SaveDefaults.ts`, `GameSaveStore.ts`).

## 1. Esquema de Guardado (Versión 17)
- **`SAVE_SCHEMA_VERSION = 17`**
- El esquema se guarda en el local state/Supabase de la siguiente manera:

```typescript
{
  schemaVersion: 17,
  userId: string,
  player: {
    name: string, // 2-20 chars
    profileIcon: string, // ej: "profile-1"
    coins: number, // ORO
    xp: number,
    level: number,
    activeCharacterId: string,
    unlockedCharacters: string[], // e.g. ["dunel", "ruder", "sarix"]
    characterCharges: { 
      [charId]: { regen: number, lethal: number } 
    },
    stats: {
      totalTimePlayed: number,
      totalActions: number,
      totalAttempts: number,
      totalGoals: number,
      totalDefeats: number,
      totalEnemiesDefeated: number,
      totalGoldCollected: number,
    }
  },
  levels: {
    completed: string[],
    claimedRewards: string[],
    puzzleCompleted: string[], // Challenge mode completion
  },
  achievements: {
    unlocked: string[],
    progress: { /* Counters for achievement goals */ }
  }
}
```

## 2. Reglas Arquitectónicas de Guardado
- **¡NUNCA!** llames a `localStorage` directamente.
- **¡NUNCA!** inyectes llamadas a `supabase` dentro de los archivos de lógica de Phaser (Escenas, Entidades).
- **Única vía de guardado**: Muta o lee el objeto usando el Singleton `gameSaveStore` (vía `gameSaveStore.save(data)`).
- `GameSaveStore` tiene una **cola asíncrona** que delega las operaciones a `SupabaseSaveAdapter`.

## 3. Supabase Auth
- `client.ts` configura Supabase usando `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Tabla remota: `public.game_saves`.
- El esquema contiene 2 migraciones en `supabase/migrations/` (creación de tabla y owner checks).
