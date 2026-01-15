"use client";

import LabGameStage from "../../logic/lab-game/LabGameStage";
import type { PageId } from "../../QuestEngine";

export default function Day5Lab({ go }: { go: (id: PageId) => void }) {
  return (
    <div className="quest-page-bg">
      {/* Заголовок страницы */}
      <div className="quest-title-wrapper">
        <img
          src="/quests/assets/banners/ribbon.webp"
          alt=""
          className="quest-title-banner"
        />
        <h1 className="quest-title-text">Тепловой модуль</h1>
      </div>

      <p className="page-subtitle" style={{ marginTop: "20px" }}>
        Здесь мы будем тестировать инструменты и готовить набор исследователя.
      </p>

      <div className="lab-game-stage-wrapper">
        <LabGameStage />
      </div>

      <footer className="quest-footer">
        <div
          className="quest-center ice-button-wrapper"
          style={{ marginTop: "60px" }}
        >
          <div className="ice-button" onClick={() => go("day5_spitsbergen")}>
            {/* льдина */}
            <img
              className="ice"
              src="/quests/assets/buttons/ice-button-bg.svg"
              alt="ice-btn"
            />

            {/* текст */}
            <div className="ice-text">Назад на научную станцию</div>

            {/* пингвин */}
            <img
              className="penguin"
              src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/characters/other/penguin.gif"
              alt="penguin"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
