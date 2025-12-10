"use client";

import type { PageId } from "../../QuestEngine";

export default function Day5Garage({ go }: { go: (id: PageId) => void }) {
  return (
    <div className="quest-page-bg">
      <h1 className="quest-title-text">Гараж</h1>

      <p className="quest-p" style={{ marginTop: "20px" }}>
        Здесь мы будем чинить и тестировать снегоход, чтобы отправиться 
        в ледяную экспедицию.
      </p>

      <button className="quest-next-btn" onClick={() => go("day5_spitsbergen")}>
        ← Вернуться на станцию
      </button>
    </div>
  );
}