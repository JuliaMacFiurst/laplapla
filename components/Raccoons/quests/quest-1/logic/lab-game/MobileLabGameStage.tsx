"use client";

import { useRef, type CSSProperties } from "react";
import { useQuest1I18n } from "../../i18n";
import {
  BACKPACK_IMAGE_URL,
  BACKPACK_VIDEO_URL,
  BASE_URL,
  FALLING_LANE_COUNT,
  LOGAN_VIDEO_URL,
} from "./types";
import { useLabGameState } from "./useLabGameState";

export default function MobileLabGameStage() {
  const { t } = useQuest1I18n();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
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
  } = useLabGameState({
    finishOnQueueComplete: true,
    gameDurationMs: 30_000,
    finishDelayMs: 600,
  });

  const moveToLane = (nextLane: number) => {
    const clampedLane = Math.max(0, Math.min(nextLane, FALLING_LANE_COUNT - 1));
    const delta = clampedLane - backpackLane;
    if (delta !== 0) {
      moveBackpackLane(delta);
    }
  };

  const moveFromClientX = (clientX: number) => {
    const board = boardRef.current;
    if (!board) return;

    const rect = board.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const lane = Math.min(
      FALLING_LANE_COUNT - 1,
      Math.floor((x / rect.width) * FALLING_LANE_COUNT),
    );

    moveToLane(lane);
  };

  const backpackLeft = `${(backpackLane + 0.5) * (100 / FALLING_LANE_COUNT)}%`;

  return (
    <div className="quest-mobile-lab-game">
      <div className="quest-mobile-lab-hud">
        <span>{t.day5Lab.scoreLabel}: {score}</span>
        <div>
          {scoreLog.slice(0, 2).map((entry) => (
            <small
              key={entry.id}
              className={entry.score >= 0 ? "is-positive" : "is-negative"}
            >
              {entry.score >= 0 ? `+${entry.score}` : entry.score}
            </small>
          ))}
        </div>
      </div>

      <div
        ref={boardRef}
        className="quest-mobile-lab-board"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          draggingRef.current = true;
          moveFromClientX(event.clientX);
        }}
        onPointerMove={(event) => {
          if (!draggingRef.current) return;
          moveFromClientX(event.clientX);
        }}
        onPointerUp={(event) => {
          draggingRef.current = false;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
        }}
      >
        {!gameStarted ? (
          <div
            className="quest-mobile-lab-overlay"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <h2>{t.day5Lab.gameStart.title}</h2>
            <p>{t.day5Lab.gameStart.caption}</p>
            <button type="button" onClick={startGame}>
              {t.day5Lab.gameStart.button}
            </button>
          </div>
        ) : null}

        <div className="quest-mobile-lab-lanes" aria-hidden={!gameStarted}>
          {lanes.map((lane) => (
            <button
              key={lane.laneIndex}
              type="button"
              className={`quest-mobile-lab-lane ${backpackLane === lane.laneIndex ? "is-selected" : ""}`}
              onClick={() => moveToLane(lane.laneIndex)}
              disabled={!gameStarted}
              aria-label={`Lane ${lane.laneIndex + 1}`}
            >
              {lane.item ? (
                <img
                  src={`${BASE_URL}/${lane.item.id}.webp`}
                  alt={lane.item.label}
                  className={`quest-mobile-lab-item ${lane.status ? `is-${lane.status}` : ""}`}
                  style={{ "--lab-item-y": `${lane.y}px` } as CSSProperties}
                />
              ) : null}
            </button>
          ))}
        </div>

        <div
          className={`quest-mobile-lab-backpack ${isBackpackActive ? "is-active" : ""}`}
          style={{ left: backpackLeft }}
        >
          {isBackpackActive ? (
            <video src={BACKPACK_VIDEO_URL} autoPlay muted playsInline loop />
          ) : (
            <img src={BACKPACK_IMAGE_URL} alt="" />
          )}
        </div>

        {gameStarted ? (
          <video
            className="quest-mobile-lab-logan"
            src={LOGAN_VIDEO_URL}
            autoPlay
            muted
            playsInline
            loop
            aria-hidden
          />
        ) : null}

        {loganComment ? (
          <div className="quest-mobile-lab-comment">
            {loganComment}
          </div>
        ) : null}

        {isFinished ? (
          <div
            className="quest-mobile-lab-final"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <h2>{t.day5Lab.gameFinal.scoreTitle}: {score}</h2>
            <p>{t.day5Lab.gameFinal.backpackCaption}</p>
            <div className="quest-mobile-lab-caught">
              {caughtThings.map((item) => (
                <img
                  key={item.id}
                  src={`${BASE_URL}/${item.id}.webp`}
                  alt={item.label}
                />
              ))}
            </div>
            <button type="button" onClick={resetGame}>
              {t.day5Lab.gameFinal.restartButton}
            </button>
          </div>
        ) : null}
      </div>

      <div className="quest-mobile-lab-controls" aria-label="Backpack controls">
        <button type="button" onClick={() => moveToLane(backpackLane - 1)} disabled={backpackLane <= 0}>
          ←
        </button>
        <span>{backpackLane + 1} / {FALLING_LANE_COUNT}</span>
        <button
          type="button"
          onClick={() => moveToLane(backpackLane + 1)}
          disabled={backpackLane >= FALLING_LANE_COUNT - 1}
        >
          →
        </button>
      </div>
    </div>
  );
}
