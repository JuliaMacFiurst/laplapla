"use client";

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
  } = useLabGameState();

  return (
    <div className="lab-game-stage">
      <div className="lab-game-board">
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

        <Backpack active={isBackpackActive} />
        <LoganComment comment={loganComment} />

        {isFinished && (
          <div className="lab-game-final-overlay">
            <div className="final-content">Игра готова!</div>
          </div>
        )}
      </div>
    </div>
  );
}
