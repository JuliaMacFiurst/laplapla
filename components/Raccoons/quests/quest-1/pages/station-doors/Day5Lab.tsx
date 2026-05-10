"use client";

import Image from "next/image";
import LabGameStage from "../../logic/lab-game/LabGameStage";
import type { PageId } from "../../QuestEngine";
import { useQuest1I18n } from "../../i18n";

export default function Day5Lab({ go }: { go: (id: PageId) => void }) {
  const { t } = useQuest1I18n();
  return (
    <div className="quest-page-bg">
      {/* Заголовок страницы */}
      <div className="quest-title-wrapper">
        <Image
          src="/quests/assets/banners/ribbon.webp"
          alt=""
          className="quest-title-banner"
          width={650}
          height={160}
          unoptimized
        />
        <h1 className="quest-title-text">{t.day5Lab.title}</h1>
      </div>

      <p className="page-subtitle" style={{ marginTop: "20px" }}>
        {t.day5Lab.subtitle}
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
            <Image
              className="ice"
              src="/quests/assets/buttons/ice-button-bg.svg"
              alt=""
              width={720}
              height={180}
              unoptimized
            />

            {/* текст */}
            <div className="ice-text">{t.day5Lab.backButton}</div>

            {/* пингвин */}
            <Image
              className="penguin"
              src="/supabase-storage/characters/other/penguin.gif"
              alt=""
              width={92}
              height={92}
              unoptimized
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
