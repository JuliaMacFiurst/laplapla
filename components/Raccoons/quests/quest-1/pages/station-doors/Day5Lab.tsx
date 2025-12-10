"use client";

import type { PageId } from "../../QuestEngine";

export default function Day5Lab({ go }: { go: (id: PageId) => void }) {
  return (
    <div className="quest-page-bg">
      <h1 className="quest-title-text">Лаборатория оборудования</h1>

      <p className="quest-p" style={{ marginTop: "20px" }}>
        Здесь мы будем тестировать инструменты и готовить набор исследователя.
      </p>

      <button className="quest-next-btn" onClick={() => go("day5_spitsbergen")}>
        ← Вернуться на станцию
      </button>
    </div>
  );
}