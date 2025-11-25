"use client";

import type { PageId } from "../QuestEngine";
import { useRef } from "react";
import PlaneWindshield, { PlaneWindshieldRef } from "../flight/PlaneWindshield";
import SteeringYoke from "../flight/SteeringYoke";
import { useState } from "react";
import InstrumentPanel from "../flight/InstrumentPanel";
import takeoffHints from "@/utils/takeoffHints";
import CockpitHint from "../flight/CockpitHint";

export default function Day4Takeoff({ go }: { go: (id: PageId) => void }) {
  const windshieldRef = useRef<PlaneWindshieldRef>(null);
  const [angle, setAngle] = useState(0);
  const [pushPull, setPushPull] = useState(0);
  const [hint, setHint] = useState<string | null>(null);

  function handleSwitch(id: string) {
    // Показываем советы только для switcher-on
    if (id.startsWith("switcher-on")) {
      const text = (takeoffHints as any)[id];
      if (text) setHint(text);
    } else {
      // switcher-off → закрываем подсказку
      setHint(null);
    }

    // Видео-карты под каждый свитчер
    const videoMap: Record<string, string[]> = {
      "switcher-on-1": ["takeoff-1", "takeoff-2"],
      "switcher-on-2": ["low_altitude-forest", "low_altitude-island", "low_altitude-city"],
      "switcher-on-3": ["low_altitude-mountains", "low_altitude-north", "low_altitude-green-fields"],
      "switcher-on-4": ["takeoff-1"],
      "switcher-on-5": ["clouds-1", "clouds-2"],
      "switcher-on-6": ["clouds-3", "clouds-4"],
      "switcher-on-7": ["clouds-5"],
      "switcher-on-8": ["wind-1"],
      "switcher-on-9": ["troposphere"],
      "switcher-on-10": ["stratosphere-1", "stratosphere-2", "stratosphere-3"],
      "switcher-on-11": ["storm-1", "storm-gets-better"],
      "switcher-on-12": ["troposphere"],
      "switcher-on-13": ["turb-1"],
      "switcher-on-14": ["aurora-1"]
    };

    // Только switcher-on меняют видео
    if (!id.startsWith("switcher-on")) return;

    const list = videoMap[id];
    if (!list) return;

    const selected = list[Math.floor(Math.random() * list.length)];
    windshieldRef.current?.setVideoById(selected);
  }
  return (
    <div className="quest-page-bg">
      <div className="polar-scenery" aria-hidden />

      <div className="quest-title-wrapper">
        <img
          src="/quests/assets/banners/ribbon.webp"
          alt=""
          className="quest-title-banner"
        />
        <h1 className="quest-title-text">Взлёт!</h1>
      </div>

      <div className="quest-story-text" style={{ marginTop: "20px" }}>
        <div className="quest-text-paper">
          <div className="quest-text-inner">
            <p className="quest-p">
              Енот подмигивает: «Готовы? Это будет наш самый красивый взлёт!»
            </p>
            <p className="quest-p">
              Крути штурвал и нажимай на кнопки, выполняя команды опытных пилотов на экране.
            </p>
          </div>
        </div>
      </div>
<div className="flight-cockpit-wrapper">

  <div className="flight-windshield">
    <PlaneWindshield
      ref={windshieldRef}
      angle={angle}
      pushPull={pushPull}
    />
      {hint && (
        <div className="cockpit-hint-overlay">
          <CockpitHint text={hint} onClose={() => setHint(null)} />
        </div>
      )}
  </div>

  <div className="flight-cockpit-controls">

    <div className="instrument-panel">
      <InstrumentPanel onSwitch={handleSwitch} />
    </div>

    <div className="yoke-container">
      <SteeringYoke
        onAngleChange={(a, p) => {
          setAngle(a);
          setPushPull(p);
        }}
      />
    </div>

  </div>

{/* Spacer for cockpit area */}
</div>
<div style={{ height: "290px" }} />

      <div className="quest-story-text" style={{ marginTop: "20px" }}>
        <div className="quest-text-paper">
          <div className="quest-text-inner">
            <p className="quest-p">
              Отличная работа, капитан! Смотри‑ка, что там виднеется внизу? Кажется, пора заходить на посадку!
            </p>
          </div>
        </div>
      </div>

      <div className="quest-video-wrapper ice-window">
        <div className="ice-window">
          <video className="quest-video" autoPlay muted loop playsInline>
            <source src="/quests/assets/videos/approach-spitsbergen.mp4" type="video/mp4" />
          </video>
        </div>
      </div>

      <div className="quest-story-text" style={{ marginTop: "20px" }}>
        <div className="quest-text-paper">
          <div className="quest-text-inner">
            <p className="quest-p">
              Приземлились! Добро пожаловать в страну льдов и полярных лисиц.
            </p>
          </div>
        </div>
      </div>

    <div
            className="quest-center ice-button-wrapper"
            style={{ marginTop: "60px" }}
          >

      <div className="ice-button" onClick={() => go("day2")}>
        <img
          className="ice"
          src="/quests/assets/buttons/ice-button-bg.svg"
          alt="ice-btn"
        />
        <div className="ice-text">Навстречу приключениям!</div>
        <img
          className="penguin"
          src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/characters/other/penguin.gif"
          alt="penguin"
        />
      </div>
</div>
      
    </div>
  );
}