"use client";

import { useEffect } from "react";

import Backpack from "./Backpack";
import FallingThingLane from "./FallingThingLane";
import LoganComment from "./LoganComment";
import { useLabGameState } from "./useLabGameState";

export default function LabGameStage() {
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
                  <h2>Лабораторная мини-игра</h2>
              <p className="lab-game-start-capture">Соберите только предметы, полезные в полярной экспедиции!</p>
    <button
      className="lab-game-start-button"
      onClick={startGame}
    >
      Начать игру
    </button>
  </div>
        </div>
)}
        {gameStarted && (
          <>
            <div className="lab-game-scoreboard">
              <span>Счёт: {score}</span>
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
              <h2 className="final-score">Итоговый счёт: {score}</h2>
              <p className="lab-final-caption">
                Ты берёшь с собой в полярную экспедицию:
              </p>

              <div className="final-backpack-area">

                <div className="final-caught-things">
                  {caughtThings.map((item) => (
                    <img
                      key={item.id}
                      src={`https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/lab-game/lab-things/${item.id}.webp`}
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
                Играть заново
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
