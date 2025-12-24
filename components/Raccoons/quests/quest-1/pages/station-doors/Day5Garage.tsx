"use client";

import type { PageId } from "../../QuestEngine";
import { useState } from "react";
import  DogsSledSVG  from "../../logic/dog-sled-game/DogsSledSVG";
import PreparationPopup from "../../logic/dog-sled-game/PreparationPopup";

export type SledPart =
  | "reins"
  | "harness"
  | "water"
  | "food"
  | "brake"
  | "skids"
  | "cargo"
  | "dogs";

type GamePhase = "inspect" | "ride" | "result";

type PreparationResult = {
  speedModifier: number;
  stability: number;
  stamina: number;
  risk: number;
};

export default function Day5Garage({ go }: { go: (id: PageId) => void }) {

  const [phase, setPhase] = useState<GamePhase>("inspect");
  const [activePart, setActivePart] = useState<SledPart | null>(null);

  const [prep, setPrep] = useState<PreparationResult>({
    speedModifier: 1,
    stability: 1,
    stamina: 1,
    risk: 0,
  });

  return (
    <div className="quest-page-bg">
      <div className="quest-title-wrapper">
      <img
          src="/quests/assets/banners/ribbon.webp"
          alt=""
          className="quest-title-banner"
        />
        <h1 className="quest-title-text">Гараж</h1>
      </div>

      <p className="page-subtitle" style={{ marginTop: "20px" }}>
        Внимательно изучи упряжь.
В снегах очень важно доверять своему транспорту и знать, в каком он состоянии.
      </p>
     <div className="quest-centered-container">
      
      {phase === "inspect" && (
        <div className="garage-stage">
          <div className="garage-scene">
            <DogsSledSVG
              activePart={activePart}
              onSelect={(part: SledPart) => {
                setActivePart(part);
              }}
            />
          </div>

          {activePart && (
            <PreparationPopup
              activePart={activePart}
              prep={prep}
              onApply={(patch) =>
                setPrep((prev) => ({
                  ...prev,
                  ...patch,
                }))
              }
              onClose={() => setActivePart(null)}
            />
          )}
        </div>
      )}
</div>
      {/* TODO:
          Добавить шкалы состояния и переход в phase="ride" после подготовки.
      */}

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
                alt="ice-btn"
              />

              {/* текст */}
              <div className="ice-text">Назад на научную станцию</div>

              {/* пингвин */}
              <img
                className="penguin"
                src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/characters/other/penguin.gif"
                alt="penguin"
              />
            </div>
          </div>
        </footer>
    </div>
  );
}