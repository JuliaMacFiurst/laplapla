"use client";

import type { PageId } from "../QuestEngine";
import { useState } from "react";

type DoorId = "heat" | "lab" | "garage";

export default function Day5Spitsbergen({ go }: { go: (id: PageId) => void }) {
  const [openingDoor, setOpeningDoor] = useState<DoorId | null>(null);

  const handleDoorClick = (door: DoorId) => {
    setOpeningDoor(door);

    // маленькая задержка, чтобы анимация "открытия" проигралась
    setTimeout(() => {
      if (door === "heat") go("day5_heat");
      if (door === "lab") go("day5_lab");
      if (door === "garage") go("day5_garage");
    }, 400);
  };

return (
    <div className="quest-page-bg">
      <div className="quest-title-wrapper">
        <img
          src="/quests/assets/banners/ribbon.webp"
          alt=""
          className="quest-title-banner"
        />
        <h1 className="quest-title-text">Полярная станция Шпицбергена</h1>
      </div>

      <div className="spitsbergen-station">
        {/* фон станции */}
        <img
          className="station-bg"
          src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/Spitzbergen-station.webp"
          alt="Полярная станция Шпицбергена"
        />

        {/* дверь 1 — Тепловой модуль */}
        <button
          className={
            "station-door station-door--heat station-door-inner" +
            (openingDoor === "heat" ? " station-door--opening" : "")
          }
          onClick={() => handleDoorClick("heat")}
          aria-label="Тепловой модуль"
        />

        {/* дверь 2 — Лаборатория оборудования */}
        <button
          className={
            "station-door station-door--lab station-door-inner" +
            (openingDoor === "lab" ? " station-door--opening" : "")
          }
          onClick={() => handleDoorClick("lab")}
          aria-label="Лаборатория оборудования"
        />

        {/* дверь 3 — Гараж */}
        <button
          className={
            "station-door station-door--garage" +
            (openingDoor === "garage" ? " station-door--opening" : "")
          }
          onClick={() => handleDoorClick("garage")}
          aria-label="Гараж"
        />
      </div>
    </div>
  );
}