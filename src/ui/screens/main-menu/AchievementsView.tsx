import { useState } from "react";
import {
  achievementCategories,
  achievementDefinitions,
  getAchievementRewardLabels,
  type AchievementCategoryId,
} from "../../../game/data/achievements";
import { gameAudio } from "../../../shared/audio/GameAudio";
import type { SaveData } from "../../../shared/types/game";
import { AchievementIcon } from "../../components/AchievementIcon";
import { MenuHeading } from "./MenuPrimitives";

interface AchievementsViewProps {
  save: SaveData;
  onBack: () => void;
}

export function AchievementsView({ save, onBack }: AchievementsViewProps) {
  const [activeAchievementCategoryId, setActiveAchievementCategoryId] = useState<AchievementCategoryId>("adventure");
  const unlockedAchievementCount = achievementDefinitions.filter((achievement) =>
    save.achievements.unlockedIds.includes(achievement.id),
  ).length;
  const achievementGroups = achievementCategories.map((category) => {
    const achievements = achievementDefinitions.filter((achievement) => achievement.category === category.id);
    const completedCount = achievements.filter((achievement) =>
      save.achievements.unlockedIds.includes(achievement.id),
    ).length;
    return { ...category, achievements, completedCount };
  });
  const runMenuAction = (action: () => void) => {
    gameAudio.playUiSelect();
    action();
  };

  return (
<div className="menu-chamber menu-chamber--achievements">
  <MenuHeading eyebrow="Progreso" title="Logros" onBack={onBack} />

  <div className="achievement-screen" aria-label="Logros del jugador">
    <div className="achievement-summary">
      <span className="achievement-summary__icon" aria-hidden="true">
        <AchievementIcon icon="trophy" />
      </span>
      <div className="achievement-summary__count">
        <strong>{unlockedAchievementCount}/{achievementDefinitions.length}</strong>
        <span>Completados</span>
      </div>
      <span className="achievement-summary__track" aria-hidden="true">
        <span style={{ width: `${Math.round((unlockedAchievementCount / achievementDefinitions.length) * 100)}%` }} />
      </span>
    </div>

    <div className="achievement-tabs" role="tablist" aria-label="Categorias de logros">
      {achievementGroups.map((category) => {
        const isActive = category.id === activeAchievementCategoryId;
        return (
          <button
            className={`achievement-tab${isActive ? " achievement-tab--active" : ""}`}
            id={`achievement-tab-${category.id}`}
            type="button"
            role="tab"
            aria-controls={`achievement-page-${category.id}`}
            aria-selected={isActive}
            key={category.id}
            onClick={() => runMenuAction(() => setActiveAchievementCategoryId(category.id))}
          >
            <span className="achievement-tab__seal" aria-hidden="true">
              <AchievementIcon icon={category.icon} />
            </span>
            <span>{category.name}</span>
            <strong>{category.completedCount}/{category.achievements.length}</strong>
          </button>
        );
      })}
    </div>

    <div className="achievement-pages">
      {achievementGroups.map((category) => (
        <section
          className={`achievement-category achievement-page${
            category.id === activeAchievementCategoryId ? " achievement-page--active" : ""
          }`}
          id={`achievement-page-${category.id}`}
          role="tabpanel"
          aria-labelledby={`achievement-tab-${category.id}`}
          key={category.id}
          hidden={category.id !== activeAchievementCategoryId}
        >
          <header className="achievement-category__header">
            <span aria-hidden="true"><AchievementIcon icon={category.icon} /></span>
            <h2>{category.name}</h2>
            <strong>{category.completedCount}/{category.achievements.length}</strong>
          </header>
          <div className="achievement-grid">
            {category.achievements.map((achievement) => {
                const isUnlocked = save.achievements.unlockedIds.includes(achievement.id);
                const progress = achievement.getProgress(save);
                const progressPercent = Math.round((progress / achievement.target) * 100);
                return (
                  <article
                    className={`achievement-card${isUnlocked ? " achievement-card--completed" : ""}`}
                    key={achievement.id}
                  >
                    <div className="achievement-card__emblem" aria-hidden="true">
                      <span className="achievement-card__seal">
                        <AchievementIcon icon={achievement.icon} />
                      </span>
                      <span className="achievement-card__difficulty">
                        {Array.from(
                          { length: achievement.difficulty === "medium" ? 2 : 1 },
                          (_bolt, index) => (
                            <span className="achievement-card__bolt" key={index}>
                              <svg viewBox="0 0 24 24" focusable="false">
                                <path d="M13.8 2 5.5 13h5.8L10.2 22l8.3-11h-5.8L13.8 2Z" />
                              </svg>
                            </span>
                          ),
                        )}
                      </span>
                    </div>
                    <span
                      className="achievement-card__status"
                      aria-label={isUnlocked ? "Completado" : "Bloqueado"}
                      title={isUnlocked ? "Completado" : "Bloqueado"}
                    >
                      <AchievementIcon icon={isUnlocked ? "check" : "lock"} />
                    </span>
                    <div className="achievement-card__copy">
                      <h3>{achievement.title}</h3>
                      <p>{achievement.description}</p>
                      <span className="achievement-card__reward">
                        Recompensa: {getAchievementRewardLabels(achievement.reward).join(" + ")}
                      </span>
                    </div>
                    <div className="achievement-card__footer">
                      <span className="achievement-card__progress" aria-label={`${progress} de ${achievement.target}`}>
                        <span style={{ width: `${progressPercent}%` }} />
                      </span>
                      <small>{progress}/{achievement.target}</small>
                    </div>
                  </article>
                );
            })}
          </div>
        </section>
      ))}
    </div>
  </div>
</div>
  );
}
