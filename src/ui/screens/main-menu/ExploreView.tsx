import { useMemo } from "react";
import exploreMapUrl from "../../../assets/menu/explore-map/complete.webp";
import activeVolcanoMapUrl from "../../../assets/menu/explore-map/active-volcano.webp";
import enchantedForestMapUrl from "../../../assets/menu/explore-map/enchanted-forest.webp";
import iceMountainsMapUrl from "../../../assets/menu/explore-map/ice-mountains.webp";
import modernJungleMapUrl from "../../../assets/menu/explore-map/modern-jungle.webp";
import mysteriousPyramidsMapUrl from "../../../assets/menu/explore-map/mysterious-pyramids.webp";
import treasureMineMapUrl from "../../../assets/menu/explore-map/treasure-mine.webp";
import verdantFrontierMapUrl from "../../../assets/menu/explore-map/verdant-frontier.webp";
import { levelDefinitions } from "../../../game/data/levels";
import type { SaveData } from "../../../shared/types/game";
import { MenuHeading } from "./MenuPrimitives";
import { getLevelStatus } from "./menuUtils";

interface LevelSlot {
  number: number;
  levelId?: string;
  name: string;
}

interface RegionDefinition {
  id: string;
  name: string;
  status: string;
  mapImageUrl: string;
  levels: LevelSlot[];
}

const regions: RegionDefinition[] = [
  {
    id: "verdant-frontier",
    name: "Frontera Verde",
    status: "10 niveles",
    mapImageUrl: verdantFrontierMapUrl,
    levels: [
      { number: 1, levelId: "meadowOutpost", name: "Sendero I" },
      { number: 2, levelId: "meadowOutpost2", name: "Sendero II" },
      { number: 3, levelId: "meadowOutpost3", name: "Sendero III" },
      { number: 4, levelId: "meadowOutpost4", name: "Piedras Errantes I" },
      { number: 5, levelId: "meadowOutpost5", name: "Piedras Errantes II" },
      { number: 6, levelId: "meadowOutpost6", name: "Piedras Errantes III" },
      { number: 7, levelId: "meadowOutpost7", name: "Caceria del Coloso I" },
      { number: 8, levelId: "meadowOutpost8", name: "Caceria del Coloso II" },
      { number: 9, levelId: "meadowOutpost9", name: "Caceria del Coloso III" },
      { number: 10, levelId: "meadowOutpost10", name: "Caceria del Coloso IV" },
    ],
  },
  {
    id: "enchanted-forest",
    name: "Bosque Encantado",
    status: "10 niveles",
    mapImageUrl: enchantedForestMapUrl,
    levels: [
      { number: 1, levelId: "enchantedGrove1", name: "Umbral encantado" },
      { number: 2, levelId: "enchantedGrove2", name: "Raices despiertas" },
      { number: 3, levelId: "enchantedGrove3", name: "Dosel vigilante" },
      { number: 4, levelId: "enchantedGrove4", name: "Senderos cambiantes" },
      { number: 5, levelId: "enchantedGrove5", name: "Corazon del bosque" },
      { number: 6, levelId: "enchantedGrove6", name: "Santuario quebrado" },
      { number: 7, levelId: "enchantedGrove7", name: "Caceria esmeralda I" },
      { number: 8, levelId: "enchantedGrove8", name: "Caceria esmeralda II" },
      { number: 9, levelId: "enchantedGrove9", name: "Caceria esmeralda III" },
      { number: 10, levelId: "enchantedGrove10", name: "Corazon ancestral" },
    ],
  },
  { id: "modern-jungle", name: "La Jungla Moderna", status: "Próximamente", mapImageUrl: modernJungleMapUrl, levels: [] },
  { id: "treasure-mine", name: "Mina del Tesoro", status: "Próximamente", mapImageUrl: treasureMineMapUrl, levels: [] },
  { id: "ice-mountains", name: "Montañas de Hielo", status: "Próximamente", mapImageUrl: iceMountainsMapUrl, levels: [] },
  { id: "mysterious-pyramids", name: "Pirámides Misteriosas", status: "Próximamente", mapImageUrl: mysteriousPyramidsMapUrl, levels: [] },
  {
    id: "active-volcano",
    name: "Volcán Activo",
    status: "3 niveles",
    mapImageUrl: activeVolcanoMapUrl,
    levels: [
      { number: 1, levelId: "activeVolcano1", name: "Umbral de ceniza" },
      { number: 2, levelId: "activeVolcano2", name: "Ríos de magma" },
      { number: 3, levelId: "activeVolcano3", name: "Furia del cráter" },
    ],
  },
];

interface ExploreViewProps {
  save: SaveData;
  activeRegionId: string;
  previewRegionId?: string;
  onActiveRegionChange: (regionId: string) => void;
  onPreviewRegionChange: (regionId?: string) => void;
  onBack: () => void;
  onStartLevel: (levelId: string) => void;
}

export function ExploreView({
  save,
  activeRegionId,
  previewRegionId,
  onActiveRegionChange,
  onPreviewRegionChange,
  onBack,
  onStartLevel,
}: ExploreViewProps) {
  const selectedRegion = regions.find((region) => region.id === activeRegionId) ?? regions[0];
  const activeRegion = regions.find((region) => region.id === previewRegionId) ?? selectedRegion;
  const activeLevelSlots = activeRegion.levels;
  const nextPlayableLevelId = useMemo(() => activeLevelSlots.find((slot) => {
    if (!slot.levelId) {
      return false;
    }
    return save.unlockedLevels.includes(slot.levelId) && !save.completedLevels.includes(slot.levelId);
  })?.levelId, [activeLevelSlots, save.completedLevels, save.unlockedLevels]);

  return (
    <div className="menu-chamber menu-chamber--map">
      <MenuHeading title="Explorar" variant="explore" onBack={onBack} backLabel="Modos" />
      <div className="explore-layout">
        <section className="map-column" aria-label="Regiones del continente">
          <div className="map-column__header"><span>Mapa de regiones</span><strong>{regions.length} regiones</strong></div>
          <div className="map-scroll" role="region" aria-label="Mapa completo de regiones">
            <div className="continent-map explore-map" onPointerLeave={() => onPreviewRegionChange()}>
              <img className="explore-map__base" src={exploreMapUrl} alt="" aria-hidden="true" />
              <img
                className="explore-map__highlight"
                src={activeRegion.mapImageUrl}
                alt=""
                aria-hidden="true"
                key={activeRegion.id}
              />
              {regions.map((region) => (
                <button
                  className={`explore-map__region explore-map__region--${region.id}${region.id === activeRegion.id ? " explore-map__region--active" : ""}`}
                  type="button"
                  key={region.id}
                  onClick={() => onActiveRegionChange(region.id)}
                  onPointerEnter={() => onPreviewRegionChange(region.id)}
                  onPointerLeave={() => onPreviewRegionChange()}
                  onFocus={() => onPreviewRegionChange(region.id)}
                  onBlur={() => onPreviewRegionChange()}
                  aria-label={`${region.name}. ${region.status}`}
                  aria-pressed={region.id === selectedRegion.id}
                />
              ))}
            </div>
          </div>
        </section>
        <section className={`level-column level-column--${activeRegion.id}`} aria-label={`Niveles de ${activeRegion.name}`}>
          <div className="level-column__header">
            <span>{activeRegion.name}</span>
            <strong>{activeLevelSlots.length > 0 ? `${activeLevelSlots.length} ${activeLevelSlots.length === 1 ? "nivel" : "niveles"}` : activeRegion.status}</strong>
          </div>
          <div className="level-list" role="region" aria-label={`Desplazar niveles de ${activeRegion.name}`} tabIndex={0}>
            {activeLevelSlots.length === 0 && <div className="level-list__empty"><strong>Próximamente</strong><span>Esta región será un escenario jugable en una próxima expansión.</span></div>}
            {activeLevelSlots.map((slot) => {
              const levelExists = Boolean(slot.levelId && levelDefinitions[slot.levelId]);
              const isUnlocked = Boolean(slot.levelId && save.unlockedLevels.includes(slot.levelId));
              const isCompleted = Boolean(slot.levelId && save.completedLevels.includes(slot.levelId));
              const canPlay = levelExists && isUnlocked;
              const status = getLevelStatus({ levelExists, isCompleted, isCurrent: slot.levelId === nextPlayableLevelId, isUnlocked });
              return (
                <button
                  className={`level-card level-card--${status.kind}`}
                  type="button"
                  key={slot.number}
                  disabled={!canPlay}
                  onClick={() => { if (slot.levelId) onStartLevel(slot.levelId); }}
                >
                  <span className="level-card__number">LV {slot.number}</span>
                  <span className="level-card__name">{slot.name}</span>
                  <span className="level-card__status">{status.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
