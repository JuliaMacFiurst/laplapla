"use client";

import type { PageId } from "../../QuestEngine";

export default function Day5Heat({ go }: { go: (id: PageId) => void }) {
  return (
    <div className="quest-page-bg">
      <h1 className="quest-title-text">Тепловой модуль</h1>

      <p className="quest-p" style={{ marginTop: "20px" }}>
        Здесь Логан помогает тебе правильно экипироваться перед полярной 
        экспедицией. Скоро добавим мини-игру с надеванием одежды!
      </p>

      <button className="quest-next-btn" onClick={() => go("day5_spitsbergen")}>
        ← Вернуться на станцию
      </button>
    </div>
  );
}