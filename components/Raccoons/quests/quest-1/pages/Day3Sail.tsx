"use client";

import { useEffect, useRef, useState } from "react";
import type { PageId } from "../QuestEngine";
import SeaMap from "../sail/SeaMap";

export default function Day3Sail({ go }: { go: (id: PageId) => void }) {
  const racTextRef = useRef<HTMLDivElement | null>(null);
  return (
    <div className="quest-page-bg">
      <div className="polar-scenery" aria-hidden />
      {/*ЗАГОЛОВОК */}
      <div className="quest-title-wrapper">
        <img
          src="/quests/assets/banners/ribbon.webp"
          alt=""
          className="quest-title-banner"
        />

        <h1 className="quest-title-text">Прокладываем маршрут</h1>
      </div>

      <div className="quest-story-text" style={{ marginTop: "20px" }}>
        <div className="quest-text-paper">
          <div className="quest-text-inner">
            <p className="quest-p">
              Енот надевает капитанскую фуражку и говорит:🦝🌊
            </p>
            <p className="quest-p">«Роланд, ставь синюю кнопку на ближайший порт!»</p>
          </div>
        </div>
      </div>

      <div className="quest-row-story">
        <div className="quest-story-text" style={{ marginTop: "20px" }}>
          <div className="quest-text-paper">
            <div className="quest-tips">
              <p className="quest-hint-blue">Синяя точка — ближайший к дому порт с выходом в море.</p>
              <p className="quest-hint-red">Красная точка — Шпицберген.</p>
              <p className="quest-hint-green">
                Когда выберешь маршрут — енот
                покажет, по каким морям вы поплывёте. И поможет найти
                лучший маршрут.</p>
              <p className="quest-hint-red">Внимательно изучи обсуждения Логана и Роланда под картой и ответь на вопросы внизу страницы.</p>
            </div>
          </div>
        </div>
        </div>

      <div style={{ marginTop: "40px" }}>
        <SeaMap racTextRef={racTextRef} />
        <div ref={racTextRef} className="quest-speech"></div>
      </div>

      <div className="quest-center-btn">
        <button className="dialog-next-btn" onClick={() => go("day1")}>
          ⏭️ Назад
        </button>
      </div>
    </div>
  );
}