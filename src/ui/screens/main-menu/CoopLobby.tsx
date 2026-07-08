import { useEffect, useRef, useState } from "react";
import {
  puzzleLevelDefinitions,
  puzzleLevelOrder,
} from "../../../game/data/puzzleLevels";
import type { SaveData } from "../../../shared/types/game";
import type { CoopSessionInfo } from "../../../game/events/EventBus";
import { coopSession, type CoopConnectionState } from "../../../game/systems/net/CoopSession";
import { isSupabaseConfigured } from "../../../shared/supabase/client";
import {
  normalizeRoomCode,
  ROOM_CODE_LENGTH,
} from "../../../game/systems/net/coopMessages";
import { MenuHeading } from "./MenuPrimitives";

interface CoopLobbyProps {
  save: SaveData;
  onBack: () => void;
  onStartLevel: (levelId: string, coop: CoopSessionInfo) => void;
}

type LobbyStep = "choose" | "host" | "join";

export function CoopLobby({ save, onBack, onStartLevel }: CoopLobbyProps) {
  const [step, setStep] = useState<LobbyStep>("choose");
  const [code, setCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [connection, setConnection] = useState<CoopConnectionState>(coopSession.connectionState);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const startedRef = useRef(false);

  const unlockedChambers = puzzleLevelOrder
    .map((id) => puzzleLevelDefinitions[id])
    .filter((level) => save.unlockedLevels.includes(level.id));
  const [selectedLevelId, setSelectedLevelId] = useState(
    unlockedChambers[0]?.id ?? "trialChamber1",
  );

  // Mantener el estado de conexion sincronizado con la sesion singleton.
  useEffect(() => coopSession.onConnectionState(setConnection), []);

  // El guest arranca la partida cuando el host envia el inicio.
  useEffect(() => {
    return coopSession.onStart(({ levelId }) => {
      startedRef.current = true;
      onStartLevel(levelId, { role: "guest", code: coopSession.code });
    });
  }, [onStartLevel]);

  // Al desmontar sin haber iniciado, abandonamos la sala.
  useEffect(() => {
    return () => {
      if (!startedRef.current) coopSession.leave();
    };
  }, []);

  const peerReady = connection === "ready";

  const handleCreate = async () => {
    setError(null);
    setBusy(true);
    setStep("host");
    try {
      const created = await coopSession.host({ characterId: save.selectedCharacterId });
      setCode(created);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo crear la sala.");
      setStep("choose");
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    const clean = normalizeRoomCode(joinCode);
    if (clean.length !== ROOM_CODE_LENGTH) {
      setError(`El codigo tiene ${ROOM_CODE_LENGTH} caracteres.`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await coopSession.join(clean, { characterId: save.selectedCharacterId });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo unir a la sala.");
    } finally {
      setBusy(false);
    }
  };

  const handleStart = () => {
    if (!peerReady) return;
    startedRef.current = true;
    coopSession.sendStart(selectedLevelId);
    onStartLevel(selectedLevelId, { role: "host", code: coopSession.code });
  };

  const leaveAndBack = () => {
    coopSession.leave();
    setStep("choose");
    setCode("");
    setError(null);
  };

  return (
    <div className="menu-chamber menu-chamber--challenge">
      <MenuHeading
        title="Cooperativo"
        variant="modes"
        onBack={step === "choose" ? onBack : leaveAndBack}
      />

      <section className="coop-lobby" aria-label="Sala cooperativa">
        {!isSupabaseConfigured && (
          <p className="coop-lobby__error">
            El co-op online necesita conexion a Supabase y no esta configurada en este build.
          </p>
        )}

        {step === "choose" && (
          <div className="coop-lobby__choices">
            <article className="challenge-card">
              <h3>Crear sala</h3>
              <p>Genera un codigo y comparteselo a tu companero para que se una.</p>
              <button type="button" disabled={busy || !isSupabaseConfigured} onClick={handleCreate}>
                Crear sala
              </button>
            </article>
            <article className="challenge-card">
              <h3>Unirse por codigo</h3>
              <p>Ingresa el codigo de {ROOM_CODE_LENGTH} caracteres que te paso el anfitrion.</p>
              <input
                className="coop-lobby__code-input"
                value={joinCode}
                maxLength={ROOM_CODE_LENGTH}
                placeholder="XXXX"
                onChange={(event) => setJoinCode(normalizeRoomCode(event.target.value))}
                aria-label="Codigo de sala"
              />
              <button
                type="button"
                disabled={busy || !isSupabaseConfigured}
                onClick={() => {
                  setStep("join");
                  void handleJoin();
                }}
              >
                Unirse
              </button>
            </article>
          </div>
        )}

        {step === "host" && (
          <div className="coop-lobby__panel">
            <p className="coop-lobby__label">Codigo de la sala</p>
            <p className="coop-lobby__code" aria-live="polite">{code || "…"}</p>
            <p className="coop-lobby__status">
              {peerReady ? "Companero conectado. Elige la camara y comienza." : "Esperando a que se una otro jugador…"}
            </p>

            {peerReady && (
              <>
                <div className="coop-lobby__levels">
                  {unlockedChambers.map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      className={`coop-lobby__level${selectedLevelId === level.id ? " is-selected" : ""}`}
                      onClick={() => setSelectedLevelId(level.id)}
                    >
                      <span>{level.stageNumber}</span>
                      {level.name}
                    </button>
                  ))}
                </div>
                <button type="button" className="coop-lobby__start" onClick={handleStart}>
                  Comenzar
                </button>
              </>
            )}
          </div>
        )}

        {step === "join" && (
          <div className="coop-lobby__panel">
            <p className="coop-lobby__label">Sala {normalizeRoomCode(joinCode)}</p>
            <p className="coop-lobby__status" aria-live="polite">
              {connection === "connecting" && "Conectando…"}
              {connection === "waiting" && "Conectado. Esperando al anfitrion…"}
              {peerReady && "Listo. Esperando que el anfitrion inicie la camara…"}
              {connection === "error" && "No se pudo conectar. Revisa el codigo."}
            </p>
          </div>
        )}

        {error && <p className="coop-lobby__error">{error}</p>}
      </section>
    </div>
  );
}
