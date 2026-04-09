"use client";

import type { PageId } from "../../QuestEngine";
import { useState } from "react";
import  DogsSledSVG  from "../../logic/dog-sled-game/DogsSledSVG";
import PreparationPopup from "../../logic/dog-sled-game/PreparationPopup";
import StatBar from "../../logic/dog-sled-game/StatBar";
import SledAnimationOverlay from "../../logic/dog-sled-game/SledAnimationOverlay";
import DogSledRunStage from "../../logic/dog-sled-game/DogSledRunStage";
import { useQuest1I18n } from "../../i18n";
import { devLog } from "@/utils/devLog";

export type SledPart =
  | "reins"
  | "harness"
  | "water"
  | "food"
  | "brake"
  | "skids"
  | "loads" 
  | "dogs";

type GamePhase = "inspect" | "ride" | "result";

type PreparationResult = {
  speedModifier: number;
  stability: number;
  stamina: number;
  risk: number;
};

type SledAnimation =
  | null
  | "loads"
  | "water"
  | "food"
  | "dogs"
  | "skids";

export default function Day5Garage({ go }: { go: (id: PageId) => void }) {
  const { t } = useQuest1I18n();

  const [phase, setPhase] = useState<GamePhase>("inspect");
  const [activePart, setActivePart] = useState<SledPart | null>(null);
  const [showRideWarning, setShowRideWarning] = useState(false);

  const [prep, setPrep] = useState<PreparationResult>({
    speedModifier: 0.1,
    stability: 0.1,
    stamina: 0.5,
    risk: 1,
  });

  const [activeAnimation, setActiveAnimation] = useState<SledAnimation>(null);

  function statLevel(value: number) {
     if (value >= 0.9) return "is-max"; 
    if (value < 0.3) return "is-danger";
    if (value < 0.6) return "is-warning";
    return "is-ok";
  }

  function mapPartToAnimation(part: SledPart): SledAnimation {
    switch (part) {
      case "loads":
      case "water":
      case "food":
      case "dogs":
      case "skids":
        return part;
      default:
        return null;
    }
  }

  function applyPatchWithLogs(patch: Partial<PreparationResult>) {
    setPrep((prev) => {
      const keys: (keyof PreparationResult)[] = ["speedModifier", "stability", "stamina", "risk"];
      const newValues: PreparationResult = { ...prev };

      keys.forEach((key) => {
        const patchValue = patch[key] ?? 0;
        if (patchValue === 0) {
          devLog(`${key}: unchanged`);
        } else if (patchValue > 0) {
          devLog(`${key}: increased by ${patchValue}`);
        } else {
          devLog(`${key}: decreased by ${-patchValue}`);
        }
        newValues[key] = Math.min(1, Math.max(0, prev[key] + patchValue));
      });

      return newValues;
    });
  }

  function isDangerous(prep: PreparationResult) {
  return (
    prep.risk > 0.7 ||
    prep.stability < 0.3 ||
    prep.stamina < 0.3
  );
}

  return (
    <div className="quest-page-bg">
      <div className="quest-title-wrapper">
      <img
          src="/quests/assets/banners/ribbon.webp"
          alt=""
          className="quest-title-banner"
        />
        <h1 className="quest-title-text">{t.day5Garage.title}</h1>
      </div>

      <p className="page-subtitle" style={{ marginTop: "20px" }}>
        {t.day5Garage.subtitle}
      </p>
     <div className="quest-centered-container">

  {phase === "inspect" && (
    <>
      <div className="garage-scene">
        <DogsSledSVG
          activePart={activePart}
          onSelect={(part) => setActivePart(part)}
        />

        <SledAnimationOverlay
          animation={activeAnimation}
          onFinished={() => setActiveAnimation(null)}
        />
      </div>

      {/* ⬇️ ВНЕ сцены */}
      <div className="garage-stats-panel">
        <StatBar
          values={{
            stability: prep.stability,
            stamina: prep.stamina,
            speed: prep.speedModifier,
            risk: prep.risk,
          }}
          levels={{
            stability: statLevel(prep.stability),
            stamina: statLevel(prep.stamina),
            speed: statLevel(prep.speedModifier),
            risk: statLevel(prep.risk),
          }}
        />
      </div>

      {activePart && (
        <PreparationPopup
          activePart={activePart}
          prep={prep}
          onApply={(patch) => applyPatchWithLogs(patch)}
          onClose={() => setActivePart(null)}
          onPlayAnimation={(part) => {
             devLog("[ANIMATION REQUEST]", part);
            const animation = mapPartToAnimation(part);
            devLog("[ANIMATION MAPPED]", animation);

            if (animation) {
              setActiveAnimation(animation);
            }
          }}
        />
      )}
    </>
  )}

  {phase === "ride" && (    
    <DogSledRunStage
      prep={prep}
      onExit={() => setPhase("inspect")}
    />
  )}

  {phase === "inspect" && (
    <>
      <button
        className="garage-start-ride-btn"
        onClick={() => {
          if (isDangerous(prep)) {
            setShowRideWarning(true);
          } else {
            setPhase("ride");
          }
        }}
      >
        {t.day5Garage.startRide}
      </button>

      {showRideWarning && (
        <div className="garage-warning-overlay">
          <div className="garage-warning-popup">
            <h2>{t.day5Garage.warningTitle}</h2>

            <p>
              {t.day5Garage.warningText}
            </p>

            <div className="garage-warning-actions">
              <button
                onClick={() => setShowRideWarning(false)}
              >
                {t.day5Garage.warningBack}
              </button>

              <button
                className="danger"
                onClick={() => {
                  setShowRideWarning(false);
                  setPhase("ride");
                }}
              >
                {t.day5Garage.warningRisk}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )}

</div>

    

      {/* Нижняя навигация */}
     <footer className="quest-footer">
          <div
            className="quest-center ice-button-wrapper"
            style={{ marginTop: "60px" }}
          >
            <div className="ice-button" onClick={() => go("day5_spitsbergen")}>
              {/* льдина */}
              <img
                className="ice"
                src="/quests/assets/buttons/ice-button-bg.svg"
                alt=""
              />

              {/* текст */}
              <div className="ice-text">{t.day5Garage.backButton}</div>

              {/* пингвин */}
              <img
                className="penguin"
                src="/supabase-storage/characters/other/penguin.gif"
                alt=""
              />
            </div>
          </div>
        </footer>
    </div>
  );
}
