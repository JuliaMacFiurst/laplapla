"use client";

import { useEffect } from "react";
import { useQuest1I18n } from "../../i18n";

import Backpack from "./Backpack";
import FallingThingLane from "./FallingThingLane";
import LoganComment from "./LoganComment";
import { useLabGameState } from "./useLabGameState";

export default function LabGameStage() {
  const { t } = useQuest1I18n();
  const {
  lanes,
  score,
  scoreLog,
  isFinished,
  isBackpackActive,
  loganComment,
  backpackLane,
  moveBackpackLane,
  gameStarted,
  startGame,
  resetGame,
  caughtThings,
} = useLabGameState();

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      event.preventDefault();
      moveBackpackLane(event.key === "ArrowLeft" ? -1 : 1);
    };

    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [moveBackpackLane]);

  return (
    <div className="lab-game-stage">
      <div className="lab-game-board">
        {!gameStarted && (
   <div className="lab-game-overlay lab-game-start-overlay">
            <div className="lab-game-overlay-card">
                  <h2>{t.day5Lab.gameStart.title}</h2>
              <p className="lab-game-start-capture">{t.day5Lab.gameStart.caption}</p>
    <button
      className="lab-game-start-button"
      onClick={startGame}
    >
      {t.day5Lab.gameStart.button}
    </button>
  </div>
        </div>
)}
        {gameStarted && (
          <>
            <div className="lab-game-scoreboard">
              <span>{t.day5Lab.scoreLabel}: {score}</span>
              <div className="lab-game-score-log">
                {scoreLog.map((entry) => (
                  <span
                    key={entry.id}
                    className={
                      entry.score >= 0 ? "score-positive" : "score-negative"
                    }
                  >
                    {entry.label}: {entry.score >= 0 ? `+${entry.score}` : entry.score}
                  </span>
                ))}
              </div>
            </div>

            <div className="lab-game-lanes">
              {lanes.map((lane) => (
                <FallingThingLane key={lane.laneIndex} lane={lane} />
              ))}
            </div>

            <Backpack
              active={isBackpackActive}
              laneIndex={backpackLane}
              onLaneDrag={(nextLane) => {
                const delta = nextLane - backpackLane;
                if (delta !== 0) {
                  moveBackpackLane(delta);
                }
              }}
            />
            <LoganComment comment={loganComment} />
          </>
        )}
        {isFinished && (
          <div className="lab-game-final-overlay">
            <div className="final-content">
              <h2 className="final-score">{t.day5Lab.gameFinal.scoreTitle}: {score}</h2>
              <p className="lab-final-caption">
                {t.day5Lab.gameFinal.backpackCaption}
              </p>

              <div className="final-backpack-area">

                <div className="final-caught-things">
                  {caughtThings.map((item) => (
                    <img
                      key={item.id}
                      src={`/supabase-storage/quests/1_quest/games/lab-game/lab-things/${item.id}.webp`}
                      alt={item.label}
                      className="final-caught-thing"
                    />
                  ))}
                </div>
              </div>

              <button
                className="lab-game-restart-button"
                onClick={resetGame}
              >
                {t.day5Lab.gameFinal.restartButton}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
