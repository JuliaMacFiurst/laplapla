

"use client";

import type { PageId } from "../QuestEngine";

export default function Day4Takeoff({ go }: { go: (id: PageId) => void }) {
  return (
    <div className="quest-page-bg">
      <div className="polar-scenery" aria-hidden />

      <div className="quest-title-wrapper">
        <img
          src="/quests/assets/banners/ribbon.webp"
          alt=""
          className="quest-title-banner"
        />
        <h1 className="quest-title-text">Взлёт!</h1>
      </div>

      <div className="quest-story-text" style={{ marginTop: "20px" }}>
        <div className="quest-text-paper">
          <div className="quest-text-inner">
            <p className="quest-p">
              Енот подмигивает: «Готовы? Это будет наш самый красивый взлёт!»
            </p>
          </div>
        </div>
      </div>

      <div className="quest-center-btn">
        <button
          className="dialog-next-btn"
          onClick={() => go("day1")}
        >
          ⏭️ Вперёд!
        </button>
      </div>
    </div>
  );
}