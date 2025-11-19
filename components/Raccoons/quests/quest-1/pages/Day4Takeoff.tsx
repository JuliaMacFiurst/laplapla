"use client";

import type { PageId } from "../QuestEngine";
import { useRef } from "react";
import PlaneWindshield, { PlaneWindshieldRef } from "../flight/PlaneWindshield";
import SteeringYoke from "../flight/SteeringYoke";
import { useState } from "react";

export default function Day4Takeoff({ go }: { go: (id: PageId) => void }) {
  const windshieldRef = useRef<PlaneWindshieldRef>(null);
  const [angle, setAngle] = useState(0);
  const [pushPull, setPushPull] = useState(0);
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
    </div>

    <div className="plane-steering-wrapper">
      <SteeringYoke
        onAngleChange={(a, p) => {
          setAngle(a);
          setPushPull(p);
        }}
      />
    </div>
      <div style={{ marginTop: "20px" }}>
        <button onClick={() => windshieldRef.current?.setVideoById("takeoff-1")}>
          Взлёт #1
        </button>
        <button onClick={() => windshieldRef.current?.setVideoById("takeoff-2")}>
          Взлёт #2
        </button>
      </div>
    </div>

      <div className="quest-center-btn">
        <button
          className="dialog-next-btn"
          onClick={() => go("day1")}
        >
          ⏭️ Вперёд!
        </button>
      </div>
    </div>
  );
}