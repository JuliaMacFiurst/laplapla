"use client";

import { useEffect, useRef, useState } from "react";
import type { PageId } from "../QuestEngine";

export default function Day3Sail({ go }: { go: (id: PageId) => void }) {
  return (
    <div className="quest-page-bg">
      <div className="quest-title-wrapper">
        <h1 className="quest-title-text">Морской маршрут</h1>
      </div>

      <div className="quest-story-text" style={{ marginTop: "20px" }}>
        <div className="quest-text-paper">
          <div className="quest-text-inner">
            <p className="quest-p">
              Эта страница пока в разработке, но енот машет лапкой и обещает вернуться! 🦝🌊
            </p>
          </div>
        </div>
      </div>

      <div className="quest-center-btn">
        <button className="dialog-next-btn" onClick={() => go("day1")}>
          ⏭️ Назад
        </button>
      </div>
    </div>
  );
}