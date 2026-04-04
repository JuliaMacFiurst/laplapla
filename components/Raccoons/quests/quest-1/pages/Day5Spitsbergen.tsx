"use client";

import type { PageId } from "../QuestEngine";
import { useState } from "react";
import { useQuest1I18n } from "../i18n";
import QuestTextBlocks from "../QuestTextBlocks";

type DoorId = "heat" | "lab" | "garage";

export default function Day5Spitsbergen({ go }: { go: (id: PageId) => void }) {
  const { t } = useQuest1I18n();
  const [openingDoor, setOpeningDoor] = useState<DoorId | null>(null);

  const handleDoorClick = (door: DoorId) => {
    setOpeningDoor(door);

    // маленькая задержка, чтобы анимация "открытия" проигралась
    setTimeout(() => {
      if (door === "heat") {
        go("day5_heat");
      }
      if (door === "lab") {
        go("day5_lab");
      }
      if (door === "garage") {
        go("day5_garage");
      }
    }, 400);
  };

return (
    <div className="quest-page-bg">
            <div className="polar-scenery" aria-hidden />
      <div className="quest-title-wrapper">
        <img
          src="/quests/assets/banners/ribbon.webp"
          alt=""
          className="quest-title-banner"
        />
        <h1 className="quest-title-text">{t.day5Spitsbergen.title}</h1>
      </div>

      <QuestTextBlocks blocks={t.day5Spitsbergen.blocks} style={{ marginTop: "20px" }} />

      <div className="spitsbergen-station">
        {/* фон станции */}
        <img
          className="station-bg"
          src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/Spitzbergen-station.webp"
          alt={t.day5Spitsbergen.stationImageAlt}
        />

        {/* центральное видео со снегом / туристами */}
        <div className="station-center-video">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="station-video-element"
            src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/tourists-group.webm"
          />
        </div>

        <div className="station-label station-label--heat">{t.day5Spitsbergen.labels.heat}</div>
        {/* дверь 1 — Тепловой модуль */}
        <button
          className={
            "station-door station-door--heat" +
            (openingDoor === "heat" ? " station-door--opening" : "")
          }
          onClick={() => handleDoorClick("heat")}
          aria-label={t.day5Spitsbergen.labels.heat}
        >
          <div className="station-door-inner"></div>
        </button>

        <div className="station-label station-label--lab">{t.day5Spitsbergen.labels.lab}</div>
        {/* дверь 2 — Лаборатория оборудования */}
        <button
          className={
            "station-door station-door--lab" +
            (openingDoor === "lab" ? " station-door--opening" : "")
          }
          onClick={() => handleDoorClick("lab")}
          aria-label={t.day5Spitsbergen.labels.labAria}
        >
          <div className="station-door-inner"></div>
        </button>

        <div className="station-label station-label--garage">{t.day5Spitsbergen.labels.garage}</div>
        {/* дверь 3 — Гараж */}
        <button
          className={
            "station-door station-door--garage" +
            (openingDoor === "garage" ? " station-door--opening" : "")
          }
          onClick={() => handleDoorClick("garage")}
          aria-label={t.day5Spitsbergen.labels.garage}
        >
          <div className="station-door-inner"></div>
        </button>
      </div>
      <footer className="quest-footer">
        <div
          className="quest-center ice-button-wrapper"
          style={{ marginTop: "60px" }}
        >
          <div className="ice-button" onClick={() => go("day6_expedition")}>
            {/* льдина */}
            <img
              className="ice"
              src="/quests/assets/buttons/ice-button-bg.svg"
              alt="ice-btn"
            />

            {/* текст */}
            <div className="ice-text">{t.day5Spitsbergen.nextButton}</div>

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
