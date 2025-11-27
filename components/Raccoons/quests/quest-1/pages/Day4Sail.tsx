"use client";

import type { PageId } from "../QuestEngine";

export default function Day4Sail({ go }: { go: (id: PageId) => void }) {
  return (
    <div className="quest-page-bg">
      <div className="quest-title-wrapper">
        <h1 className="quest-title-text">День 4 — Морское приключение</h1>
      </div>

      <div className="quest-story-text">
        <div className="quest-text-paper">
          <div className="quest-text-inner">
            <p className="quest-p">
              Здесь будет контент следующего дня. Временно заглушка.
            </p>
          </div>
        </div>
      </div>

      <div className="quest-center-btn">
        
      </div>
    </div>
  );
}