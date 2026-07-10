import { useEffect, useMemo, useRef, useState } from "react";
import {
  puzzleLevelDefinitions,
  puzzleLevelOrder,
} from "../../../game/data/puzzleLevels";
import { levelDefinitions } from "../../../game/data/levels";
import type { LevelTheme, SaveData } from "../../../shared/types/game";
import type { CoopSessionInfo } from "../../../game/events/EventBus";
import { coopSession, type CoopConnectionState } from "../../../game/systems/net/CoopSession";
import { isSupabaseConfigured } from "../../../shared/supabase/client";
import {
  COOP_MAX_PLAYERS,
  normalizeRoomCode,
  ROOM_CODE_LENGTH,
  type CoopParticipant,
} from "../../../game/systems/net/coopMessages";
import { getCharacterDefinition } from "../../../game/data/characters";
import type { CharacterId } from "../../../shared/types/game";
import { MenuHeading } from "./MenuPrimitives";

export type CoopLobbyMode = "challenge" | "explore";

interface CoopLobbyProps {
  save: SaveData;
  mode: CoopLobbyMode;
  onBack: () => void;
  onStartLevel: (levelId: string, coop: CoopSessionInfo) => void;
}

interface SelectableLevel {
  id: string;
  label: string;
}

type LobbyStep = "choose" | "host" | "join";

// Tiempo maximo esperando al anfitrion tras unirse: si nadie aparece, el codigo
// es incorrecto o la sala ya no existe, y quedarse cargando no informa nada.
const JOIN_TIMEOUT_MS = 8000;

const EXPLORE_THEME_RANK: Record<string, number> = {
  forest: 0,
  "enchanted-forest": 1,
  "active-volcano": 2,
};

function getSelectableLevels(mode: CoopLobbyMode, unlockedLevels: string[]): SelectableLevel[] {
  const unlocked = new Set(unlockedLevels);
  if (mode === "challenge") {
    return puzzleLevelOrder
      .map((id) => puzzleLevelDefinitions[id])
      .filter((level) => unlocked.has(level.id))
      .map((level) => ({ id: level.id, label: `${level.stageNumber}. ${level.name}` }));
  }
  return Object.values(levelDefinitions)
    .filter((level) => unlocked.has(level.id))
    .sort((a, b) => {
      const rankDiff = (EXPLORE_THEME_RANK[a.theme as LevelTheme] ?? 0)
        - (EXPLORE_THEME_RANK[b.theme as LevelTheme] ?? 0);
      return rankDiff !== 0 ? rankDiff : a.stageNumber - b.stageNumber;
    })
    .map((level) => ({ id: level.id, label: level.name }));
}

export function CoopLobby({ save, mode, onBack, onStartLevel }: CoopLobbyProps) {
  const [step, setStep] = useState<LobbyStep>("choose");
  const [code, setCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [connection, setConnection] = useState<CoopConnectionState>(coopSession.connectionState);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [roster, setRoster] = useState<CoopParticipant[]>([]);
  const startedRef = useRef(false);

  const selectableLevels = useMemo(
    () => getSelectableLevels(mode, save.unlockedLevels),
    [mode, save.unlockedLevels],
  );
  const [selectedLevelId, setSelectedLevelId] = useState(
    selectableLevels[0]?.id ?? (mode === "challenge" ? "trialChamber1" : "meadowOutpost"),
  );

  // Mantener el estado de conexion sincronizado con la sesion singleton.
  useEffect(() => coopSession.onConnectionState(setConnection), []);

  // Lista de participantes de la sala (host + guests), para mostrar quien esta.
  useEffect(() => coopSession.onRoster(setRoster), []);

  // Errores fatales de la sala (por ejemplo versiones distintas del juego).
  useEffect(() => {
    return coopSession.onSessionError((message) => {
      coopSession.leave();
      setStep("choose");
      setCode("");
      setError(message);
    });
  }, []);

  // Unirse a una sala donde nadie espera no debe quedar cargando para siempre.
  useEffect(() => {
    if (step !== "join" || connection !== "waiting") return;
    const timer = window.setTimeout(() => {
      coopSession.leave();
      setStep("choose");
      setError("Nadie respondio en esa sala. Revisa el codigo con el anfitrion e intentalo de nuevo.");
    }, JOIN_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [step, connection]);

  // El guest arranca la partida cuando el host envia el inicio, usando el roster
  // autoritativo que viene en el mensaje (no su vista local de presence).
  useEffect(() => {
    return coopSession.onStart(({ levelId, roster: startRoster }) => {
      startedRef.current = true;
      onStartLevel(levelId, {
        role: "guest",
        code: coopSession.code,
        localSlot: coopSession.localSlot,
        roster: startRoster,
      });
    });
  }, [onStartLevel]);

  // Al desmontar sin haber iniciado, abandonamos la sala.
  useEffect(() => {
    return () => {
      if (!startedRef.current) coopSession.leave();
    };
  }, []);

  const peerReady = connection === "ready";

  // Cada jugador reporta sus cargas reales al entrar a la sala: el host las usa
  // para sembrar los contadores vivos de cada slot (no inventa las suyas).
  const buildHello = () => {
    const charges = save.characterPowerCharges[save.selectedCharacterId];
    return {
      characterId: save.selectedCharacterId,
      healingCharges: charges?.healingCharges ?? 0,
      powerCharges: charges?.powerCharges ?? 0,
    };
  };

  const handleCreate = async () => {
    setError(null);
    setBusy(true);
    setStep("host");
    try {
      const created = await coopSession.host(buildHello());
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
      await coopSession.join(clean, buildHello());
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
    onStartLevel(selectedLevelId, {
      role: "host",
      code: coopSession.code,
      localSlot: coopSession.localSlot,
      roster: coopSession.participants.map((entry) => ({
        slot: entry.slot,
        characterId: entry.characterId,
      })),
    });
  };

  const leaveAndBack = () => {
    coopSession.leave();
    setStep("choose");
    setCode("");
    setRoster([]);
    setError(null);
  };

  // Lista de jugadores presentes con su heroe, para el panel del anfitrion/guest.
  const rosterList = roster.length > 0 && (
    <ul className="coop-lobby__roster" aria-label="Jugadores en la sala">
      {roster.map((participant) => (
        <li key={participant.slot} className="coop-lobby__roster-item">
          <span className="coop-lobby__roster-slot">
            {participant.slot === 0 ? "Anfitrion" : `Jugador ${participant.slot + 1}`}
          </span>
          <span className="coop-lobby__roster-hero">
            {getCharacterDefinition(participant.characterId as CharacterId).name}
          </span>
        </li>
      ))}
      <li className="coop-lobby__roster-count">{roster.length}/{COOP_MAX_PLAYERS} jugadores</li>
    </ul>
  );

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
              {peerReady
                ? `Pueden unirse hasta ${COOP_MAX_PLAYERS} jugadores. Elige el nivel y comienza cuando esten listos.`
                : "Esperando a que se una otro jugador…"}
            </p>

            {rosterList}

            {peerReady && (
              <>
                <div className="coop-lobby__levels">
                  {selectableLevels.map((level, index) => (
                    <button
                      key={level.id}
                      type="button"
                      className={`coop-lobby__level${selectedLevelId === level.id ? " is-selected" : ""}`}
                      onClick={() => setSelectedLevelId(level.id)}
                    >
                      <span>{index + 1}</span>
                      {level.label}
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
              {peerReady && "Listo. Esperando que el anfitrion inicie el nivel…"}
              {connection === "error" && "No se pudo conectar. Revisa el codigo."}
            </p>
            {rosterList}
          </div>
        )}

        {error && <p className="coop-lobby__error">{error}</p>}
      </section>
    </div>
  );
}
