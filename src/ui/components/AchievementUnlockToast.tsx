interface AchievementUnlockToastProps {
  icon: string;
  title: string;
}

export function AchievementUnlockToast({ icon, title }: AchievementUnlockToastProps) {
  return (
    <section className="achievement-unlock" role="status" aria-live="polite" aria-atomic="true">
      <div className="achievement-unlock__icon" aria-hidden="true">
        <svg viewBox="0 0 64 64" focusable="false">
          <path d="M21 8h22v8h9v7c0 8-5 14-13 16-1 4-3 7-5 9h9v8H21v-8h9c-3-2-5-5-5-9-8-2-13-8-13-16v-7h9V8Zm-3 14v1c0 4 2 7 6 9V22h-6Zm22 10c4-2 6-5 6-9v-1h-6v10Z" />
        </svg>
        <span>{icon}</span>
      </div>
      <div className="achievement-unlock__copy">
        <span className="achievement-unlock__eyebrow">Logro desbloqueado</span>
        <strong>{title}</strong>
      </div>
      <span className="achievement-unlock__shine" aria-hidden="true" />
      <span className="achievement-unlock__timer" aria-hidden="true" />
    </section>
  );
}
