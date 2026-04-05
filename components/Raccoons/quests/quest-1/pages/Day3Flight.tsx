import { useEffect, useRef, useState } from "react";
import type { PageId } from "../QuestEngine";
import countryNames from "@/utils/country_names.json";
import DialogBox from "../logic/DialogBox";
import FlightMap from "../logic/FlightMap";
import FlightMiniTest from "../flight/FlightMiniTest";
import { useQuest1I18n } from "../i18n";
import QuestTextBlocks from "../QuestTextBlocks";
import { getFlightRouteDialogs, type FlightDialogueStep } from "../i18n/dialogs";

export default function Day3Flight({ go }: { go: (id: PageId) => void }) {
  const { lang, t } = useQuest1I18n();
  const racTextRef = useRef<HTMLDivElement>(null);
  const [userChoice, setUserChoice] = useState<
    "straight" | "arc" | "zigzag" | null
  >(null);
  const [dialogueQueue, setDialogueQueue] = useState<FlightDialogueStep[]>([]);
  const flightRouteDialogs = getFlightRouteDialogs(lang);

  // --- перевод ID страны в русское название ---
  function getCountryLabel(id: string): string {
    const entry = (countryNames as Record<string, any>)[id];
    return entry?.[lang] || entry?.ru || id;
  }

  // --- слушатель для текстов от initRouteLogic ---
  useEffect(() => {
    function handleCountryEvent(ev: CustomEvent) {
      const id = ev.detail;
      const countryName = getCountryLabel(id);
      if (racTextRef.current) {
        racTextRef.current.textContent = t.day3Flight.speech.flyingOver.replace(
          "{name}",
          countryName
        );
      }
    }

    window.addEventListener(
      "quest-country",
      handleCountryEvent as EventListener
    );

    return () => {
      window.removeEventListener(
        "quest-country",
        handleCountryEvent as EventListener
      );
    };
  }, []);
  // ======================================================
  // ✅ RENDER
  // ======================================================
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

        <h1 className="quest-title-text">{t.day3Flight.title}</h1>
      </div>

      <QuestTextBlocks blocks={t.day3Flight.introBlocks} style={{ marginTop: "20px" }} />

      <div className="quest-row-story">
        <div className="quest-story-text" style={{ marginTop: "20px" }}>
          <div className="quest-text-paper">
            <div className="quest-tips">
              <p className="quest-hint-blue">{t.day3Flight.tips[0]}</p>
              <p className="quest-hint-red">{t.day3Flight.tips[1]}</p>
              <p className="quest-hint-green">
                {t.day3Flight.tips[2]}
              </p>
              <p className="quest-hint-red">{t.day3Flight.tips[3]}</p>
            </div>
          </div>
        </div>

        {/* ВИДЕО */}
        <div className="quest-video-wrapper ice-window">
          <div className="ice-window">
            <video className="quest-video" autoPlay muted loop playsInline>
              <source
                src="/supabase-storage/quests/1_quest/images/route.webm"
                type="video/webm"
              />
            </video>
          </div>
        </div>
      </div>

      {/* MAP */}
      <FlightMap racTextRef={racTextRef} routeType={userChoice} />
      {/* BUTTONS */}
      <div className="quest-controls">
        <button
          className={`quest-route-btn ${userChoice === "straight" ? "active" : ""}`}
          data-type="straight"
          onClick={() => {
            setUserChoice("straight");
            setDialogueQueue(
              flightRouteDialogs.filter((d) => d.condition === "straight")
            );
          }}
        >
          {t.day3Flight.routeButtons.straight}
        </button>

        <button
          className={`quest-route-btn ${userChoice === "arc" ? "active" : ""}`}
          data-type="arc"
          onClick={() => {
            setUserChoice("arc");
            setDialogueQueue(
              flightRouteDialogs.filter((d) => d.condition === "arc")
            );
          }}
        >
          {t.day3Flight.routeButtons.arc}
        </button>

        <button
          className={`quest-route-btn ${userChoice === "zigzag" ? "active" : ""}`}
          data-type="zigzag"
          onClick={() => {
            setUserChoice("zigzag");
            setDialogueQueue(
              flightRouteDialogs.filter((d) => d.condition === "zigzag")
            );
          }}
        >
          {t.day3Flight.routeButtons.zigzag}
        </button>
      </div>

      {/* SECOND DIALOG WINDOW — диалог о выборе маршрута */}
      <div
        className="flight-dialog-box-wrapper"
      >
        <DialogBox
          queue={dialogueQueue}
          onNext={() => setDialogueQueue((q) => q.slice(1))}
        />
      </div>

          {/* FIRST DIALOG WINDOW — монолог Логана про id */}
      <div ref={racTextRef} id="raccoonText" className="quest-speech">
        {t.day3Flight.speech.selectType}
      </div>

      {/* ORTHODROME MINI-TEST */}
      <FlightMiniTest go={go} />

        
      </div>

  
  );
}
