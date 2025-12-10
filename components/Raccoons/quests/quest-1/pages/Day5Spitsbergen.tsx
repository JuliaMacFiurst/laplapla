"use client";

import type { PageId } from "../QuestEngine";
import { useState } from "react";

type DoorId = "heat" | "lab" | "garage";

export default function Day5Spitsbergen({ go }: { go: (id: PageId) => void }) {
  const [openingDoor, setOpeningDoor] = useState<DoorId | null>(null);
  const [completed, setCompleted] = useState<{heat:boolean; lab:boolean; garage:boolean}>({
    heat:false, lab:false, garage:false
  });

  const handleDoorClick = (door: DoorId) => {
    setOpeningDoor(door);

    // маленькая задержка, чтобы анимация "открытия" проигралась
    setTimeout(() => {
      if (door === "heat") {
        go("day5_heat");
        setCompleted(prev => ({...prev, heat:true}));
      }
      if (door === "lab") {
        go("day5_lab");
        setCompleted(prev => ({...prev, lab:true}));
      }
      if (door === "garage") {
        go("day5_garage");
        setCompleted(prev => ({...prev, garage:true}));
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
        <h1 className="quest-title-text">Полярная станция Шпицбергена</h1>
      </div>

      <div className="quest-story-text" style={{ marginTop: "20px" }}>
        <div className="quest-text-paper">
          <div className="quest-text-inner">
            <p className="quest-p">
              Ты на научной полярной станции — месте, где учёные изучают вечные льды, следят за климатом, наблюдают за белыми медведями, исследуют северные сияния и даже хранят коллекции редких растений в специальных холодных хранилищах. 
            </p>
          </div>
        </div>
      </div>
      <div className="quest-story-text" style={{ marginTop: "20px" }}>
        <div className="quest-text-paper">
          <div className="quest-text-inner">
            <p className="quest-p">
              Эта станция помогает понять, как меняется наша планета и что нужно сделать, чтобы защитить природу Арктики. Здесь каждый день проводят эксперименты, делают измерения, отправляют данные в международные центры и внимательно следят за тем, как живёт север.
            </p>
          </div>
        </div>
      </div>

      <div className="quest-story-text" style={{ marginTop: "20px" }}>
        <div className="quest-text-paper">
          <div className="quest-text-inner">
            <p className="quest-p">
              Тебе тоже пора готовиться к своей полярной экспедиции! На базе есть три отдела, и каждый поможет тебе освоить важную часть подготовки:
            </p>
          </div>
        </div>
      </div>
      <div className="quest-story-text" style={{ marginTop: "20px" }}>
        <div className="quest-text-paper">
          <div className="quest-text-inner">
            <p className="quest-p">
              — <strong className="quest-hint-blue">Тепловой модуль</strong> — где ты научишься правильному полярному снаряжению.<br/>
              — <strong className="quest-hint-red">Лаборатория оборудования</strong> — где проверяют инструменты и приборы.<br/>
              — <strong className="quest-hint-green">Гараж</strong> — место, где готовят снегоходы и технику к выезду.
            </p>
            <p className="quest-p">
              Ты можешь заходить в комнаты в любом порядке — всё зависит от тебя. Когда пройдёшь все три этапа, экспедиция начнётся!
            </p>
          </div>
        </div>
      </div>

      <div className="spitsbergen-station">
        {/* фон станции */}
        <img
          className="station-bg"
          src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/Spitzbergen-station.webp"
          alt="Полярная станция Шпицбергена"
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

        <div className="station-label station-label--heat">Тепловой модуль</div>
        {/* дверь 1 — Тепловой модуль */}
        <button
          className={
            "station-door station-door--heat" +
            (openingDoor === "heat" ? " station-door--opening" : "")
          }
          onClick={() => handleDoorClick("heat")}
          aria-label="Тепловой модуль"
        >
          <div className="station-door-inner"></div>
        </button>

        <div className="station-label station-label--lab">Лаборатория</div>
        {/* дверь 2 — Лаборатория оборудования */}
        <button
          className={
            "station-door station-door--lab" +
            (openingDoor === "lab" ? " station-door--opening" : "")
          }
          onClick={() => handleDoorClick("lab")}
          aria-label="Лаборатория оборудования"
        >
          <div className="station-door-inner"></div>
        </button>

        <div className="station-label station-label--garage">Гараж</div>
        {/* дверь 3 — Гараж */}
        <button
          className={
            "station-door station-door--garage" +
            (openingDoor === "garage" ? " station-door--opening" : "")
          }
          onClick={() => handleDoorClick("garage")}
          aria-label="Гараж"
        >
          <div className="station-door-inner"></div>
        </button>
      </div>
      {completed.heat && completed.lab && completed.garage && (
        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <button
            className="quest-next-btn"
            onClick={() => go("day6_expedition")}
          >
            Продолжить путешествие →
          </button>
        </div>
      )}
    </div>
  );
}