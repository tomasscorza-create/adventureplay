import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
  userAgentData?: {
    mobile?: boolean;
  };
}

interface PwaInstallPromptProps {
  visible: boolean;
}

function isInstalled() {
  const navigatorWithStandalone = navigator as NavigatorWithStandalone;
  return (
    navigatorWithStandalone.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches
  );
}

function isMobilePhone() {
  const navigatorWithUserAgentData = navigator as NavigatorWithStandalone;
  if (typeof navigatorWithUserAgentData.userAgentData?.mobile === "boolean") {
    return navigatorWithUserAgentData.userAgentData.mobile;
  }

  return /Android.+Mobile|iPhone|iPod|Windows Phone|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

function isApplePhone() {
  return /iPhone|iPod/i.test(navigator.userAgent);
}

export function PwaInstallPrompt({ visible }: PwaInstallPromptProps) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [canOfferInstall, setCanOfferInstall] = useState(
    () => isMobilePhone() && !isInstalled(),
  );
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const displayModeQuery = window.matchMedia("(display-mode: standalone)");
    const syncInstalledState = () => {
      if (isInstalled()) {
        setCanOfferInstall(false);
        setInstallEvent(null);
        setShowInstructions(false);
      }
    };
    const captureInstallEvent = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setCanOfferInstall(isMobilePhone() && !isInstalled());
    };
    const markInstalled = () => {
      setCanOfferInstall(false);
      setInstallEvent(null);
      setShowInstructions(false);
    };

    window.addEventListener("beforeinstallprompt", captureInstallEvent);
    window.addEventListener("appinstalled", markInstalled);
    displayModeQuery.addEventListener("change", syncInstalledState);

    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallEvent);
      window.removeEventListener("appinstalled", markInstalled);
      displayModeQuery.removeEventListener("change", syncInstalledState);
    };
  }, []);

  const requestInstall = async () => {
    if (!installEvent) {
      setShowInstructions(true);
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstallEvent(null);
    if (choice.outcome === "accepted") {
      setCanOfferInstall(false);
    }
  };

  if (!visible || !canOfferInstall) {
    return null;
  }

  const instructions = isApplePhone()
    ? "En Safari, toca Compartir y luego Agregar a inicio."
    : "Abre el menu del navegador y toca Instalar app o Agregar a pantalla principal.";

  return (
    <aside className="pwa-install" aria-label="Instalar Adventure Play">
      <button
        type="button"
        className="pwa-install__button"
        onClick={() => void requestInstall()}
        aria-expanded={showInstructions}
      >
        <span className="pwa-install__icon" aria-hidden="true">↓</span>
        Instalar app
      </button>
      {showInstructions && (
        <div className="pwa-install__help" role="status" aria-live="polite">
          <span>{instructions}</span>
          <button
            type="button"
            aria-label="Cerrar instrucciones"
            onClick={() => setShowInstructions(false)}
          >
            ×
          </button>
        </div>
      )}
    </aside>
  );
}
