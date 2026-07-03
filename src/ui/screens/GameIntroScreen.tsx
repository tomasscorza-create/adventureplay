import { useEffect, useRef, useState } from "react";

interface GameIntroScreenProps {
  canExit: boolean;
  onComplete: () => void;
}

const INTRO_FALLBACK_DURATION_MS = 8_000;
const INTRO_EXIT_DURATION_MS = 900;

export function GameIntroScreen({ canExit, onComplete }: GameIntroScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackFinished, setPlaybackFinished] = useState(false);
  const [playbackStarted, setPlaybackStarted] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const isClosing = playbackFinished && canExit;

  useEffect(() => {
    if (!playbackStarted) {
      return;
    }

    const fallbackId = window.setTimeout(() => {
      setPlaybackFinished(true);
    }, INTRO_FALLBACK_DURATION_MS);

    return () => window.clearTimeout(fallbackId);
  }, [playbackStarted]);

  useEffect(() => {
    if (!isClosing) {
      return;
    }

    const exitId = window.setTimeout(onComplete, INTRO_EXIT_DURATION_MS);
    return () => window.clearTimeout(exitId);
  }, [isClosing, onComplete]);

  const playWithSound = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    void video.play()
      .then(() => setNeedsInteraction(false))
      .catch(() => setNeedsInteraction(true));
  };

  return (
    <section
      className={`game-intro${isClosing ? " game-intro--closing" : ""}`}
      aria-label="Introduccion de Adventure Play"
    >
      <video
        ref={videoRef}
        className="game-intro__video"
        autoPlay
        playsInline
        preload="auto"
        onCanPlay={playWithSound}
        onPlaying={() => {
          setPlaybackStarted(true);
          setNeedsInteraction(false);
        }}
        onEnded={() => setPlaybackFinished(true)}
        onError={() => setPlaybackFinished(true)}
      >
        <source src="/media/adventure-play-intro.mp4" type="video/mp4" />
      </video>
      {needsInteraction && !playbackFinished && (
        <button className="game-intro__start" type="button" onClick={playWithSound}>
          <span className="game-intro__start-icon" aria-hidden="true">▶</span>
          Tocar para comenzar
        </button>
      )}
      {playbackFinished && !canExit && (
        <div className="game-intro__loading" role="status">
          <span className="game-intro__loading-dot" aria-hidden="true" />
          Preparando aventura
        </div>
      )}
    </section>
  );
}
