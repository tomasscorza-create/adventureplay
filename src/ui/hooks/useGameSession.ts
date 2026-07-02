import { useEffect, useState } from "react";
import { gameSaveStore } from "../../game/systems/save/GameSaveStore";
import type { SaveSyncState } from "../../game/systems/save/GameSaveStore";
import { SupabaseSaveAdapter } from "../../game/systems/save/SupabaseSaveAdapter";
import { createDefaultSave } from "../../game/systems/save/SaveDefaults";
import { shouldLoadSessionSave } from "../../shared/supabase/authEvents";
import { isSupabaseConfigured, supabase } from "../../shared/supabase/client";
import type { SaveData } from "../../shared/types/game";

export type AuthStatus = "checking" | "signed-out" | "loading-save" | "signed-in";

export function useGameSession() {
  const [save, setSave] = useState<SaveData>(() => createDefaultSave());
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [authError, setAuthError] = useState<string>();
  const [authNotice, setAuthNotice] = useState<string>();
  const [saveSyncState, setSaveSyncState] = useState<SaveSyncState>(() =>
    gameSaveStore.getSyncState()
  );
  const [saveSyncError, setSaveSyncError] = useState<string>();
  const [playerEmail, setPlayerEmail] = useState<string>();

  useEffect(() => {
    const offSyncState = gameSaveStore.onSyncStateChange((state) => {
      setSaveSyncState(state);
      if (state === "pending" || state === "synced" || state === "disconnected") {
        setSaveSyncError(undefined);
      }
    });
    const offSaveError = gameSaveStore.onError((error) => {
      console.error("Could not persist game save", error);
      setSaveSyncError(
        "No se pudo sincronizar el progreso. Revisa la conexion y vuelve a intentarlo.",
      );
    });

    return () => {
      offSyncState();
      offSaveError();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      gameSaveStore.disconnect();
      setAuthStatus("signed-out");
      setAuthError(
        "Faltan VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY (o VITE_SUPABASE_ANON_KEY).",
      );
      return;
    }

    const activeSupabase = supabase;
    let isActive = true;
    let activeUserId: string | undefined;
    let sessionRequestId = 0;

    const clearSessionSave = () => {
      sessionRequestId += 1;
      activeUserId = undefined;
      gameSaveStore.disconnect();
      if (!isActive) {
        return;
      }

      setPlayerEmail(undefined);
      setSave(createDefaultSave());
      setAuthStatus("signed-out");
    };

    const loadSessionSave = async (sessionUserId: string, email?: string) => {
      const requestId = ++sessionRequestId;
      activeUserId = sessionUserId;
      setAuthStatus("loading-save");
      setAuthError(undefined);
      setAuthNotice(undefined);

      try {
        const nextSave = await gameSaveStore.connect(
          new SupabaseSaveAdapter(activeSupabase, sessionUserId),
          sessionUserId,
        );
        if (!isActive || requestId !== sessionRequestId) {
          return;
        }

        setPlayerEmail(email);
        setSave(nextSave);
        setAuthStatus("signed-in");
      } catch (error) {
        console.error("Could not load remote game save", error);
        if (!isActive || requestId !== sessionRequestId) {
          return;
        }

        activeUserId = undefined;
        gameSaveStore.disconnect();
        setAuthError("No se pudo cargar el progreso remoto. Revisa la conexion con Supabase y reintenta.");
        setAuthStatus("signed-out");
      }
    };

    const { data } = activeSupabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        clearSessionSave();
        return;
      }

      if (activeUserId === session.user.id) {
        setPlayerEmail(session.user.email);
        return;
      }

      if (shouldLoadSessionSave(event)) {
        void loadSessionSave(session.user.id, session.user.email);
      }
    });

    return () => {
      isActive = false;
      sessionRequestId += 1;
      gameSaveStore.disconnect();
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return;
    }

    setAuthStatus("loading-save");
    setAuthError(undefined);
    setAuthNotice(undefined);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (!error) {
      return;
    }

    setAuthError(error.message);
    setAuthStatus("signed-out");
  };

  const signUp = async (email: string, password: string) => {
    if (!supabase) {
      return;
    }

    setAuthStatus("loading-save");
    setAuthError(undefined);
    setAuthNotice(undefined);
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setAuthError(error.message);
      setAuthStatus("signed-out");
      return;
    }

    if (!data.session) {
      setAuthNotice("Cuenta creada. Revisa tu email para confirmarla y luego inicia sesion.");
      setAuthStatus("signed-out");
    }
  };

  const signOut = async (): Promise<boolean> => {
    try {
      await gameSaveStore.flush();
    } catch (error) {
      console.error("Could not flush game save before sign-out", error);
      setSaveSyncError("No se pudo guardar el progreso. Reintenta antes de cerrar la sesion.");
      return false;
    }

    const { error } = await supabase?.auth.signOut() ?? {};
    if (error) {
      setAuthError(error.message);
      return false;
    }

    return true;
  };

  const resetProgress = async (): Promise<SaveData | undefined> => {
    const freshSave = gameSaveStore.reset();
    try {
      await gameSaveStore.flush();
    } catch (error) {
      console.error("Could not reset remote game save", error);
      setSaveSyncError("No se pudo reiniciar el progreso porque fallo la sincronizacion.");
      return undefined;
    }

    setSave(freshSave);
    return freshSave;
  };

  const retrySaveSync = async () => {
    setSaveSyncError(undefined);
    try {
      await gameSaveStore.retry();
    } catch (error) {
      console.error("Could not retry game save synchronization", error);
      setSaveSyncError("El progreso sigue pendiente. Comprueba la conexion y reintenta.");
    }
  };

  return {
    authError,
    authNotice,
    authStatus,
    isSupabaseConfigured,
    playerEmail,
    resetProgress,
    retrySaveSync,
    save,
    saveSyncError,
    saveSyncState,
    setSave,
    signIn,
    signOut,
    signUp,
  };
}
