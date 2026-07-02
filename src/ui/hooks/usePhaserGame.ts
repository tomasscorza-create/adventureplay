import { useEffect, useState } from "react";

type PhaserGameStatus = "idle" | "loading" | "ready" | "error";

interface DestroyableGame {
  destroy: (removeCanvas: boolean) => void;
}

export function usePhaserGame(enabled: boolean, parentId: string) {
  const [status, setStatus] = useState<PhaserGameStatus>("idle");
  const [retrySequence, setRetrySequence] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    let game: DestroyableGame | undefined;
    setStatus("loading");

    void import("../../game/main")
      .then(({ createGame }) => {
        if (cancelled) {
          return;
        }
        game = createGame(parentId);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
      game?.destroy(true);
    };
  }, [enabled, parentId, retrySequence]);

  return {
    status,
    retry: () => setRetrySequence((current) => current + 1),
  };
}
