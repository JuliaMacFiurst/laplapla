import { useEffect, useRef, useState } from "react";
import { initRouteLogic } from "../logic/initRouteLogic";
import type { PageId } from "../QuestEngine";
import { getMapSvg } from "@/utils/storageMaps";
import countryNames from "@/utils/country_names.json";
import FlightSecretsManager from "../flight/FlightSecretsManager";
import DialogBox from "../flight/DialogBox";
import type { DialogueStep } from "@/utils/flightDialogs";
import { flightRouteDialogs } from "@/utils/flightDialogs";
import FlightMap from "../logic/FlightMap";

export default function Day3Flight({ go }: { go: (id: PageId) => void }) {
  const racTextRef = useRef<HTMLDivElement>(null);

  const [svgLoaded, setSvgLoaded] = useState(false);
  const [userChoice, setUserChoice] = useState<
    "straight" | "arc" | "zigzag" | null
  >(null);
  const [dialogueQueue, setDialogueQueue] = useState<DialogueStep[]>([]);

  // --- перевод ID страны в русское название ---
  function getCountryRu(id: string): string {
    const entry = (countryNames as Record<string, any>)[id];
    return entry?.ru || id;
  }

  // --- слушатель для текстов от initRouteLogic ---
  useEffect(() => {
    function handleCountryEvent(ev: CustomEvent) {
      const id = ev.detail;
      const ruName = getCountryRu(id);
      if (racTextRef.current) {
        racTextRef.current.textContent = `Енот: «Вы летите над: ${ruName}»`;
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

        <h1 className="quest-title-text">Прокладываем маршрут</h1>
      </div>

      <div className="quest-story-text" style={{ marginTop: "20px" }}>
        <div className="quest-text-paper">
          <div className="quest-text-inner">
            <p className="quest-p quest-em">
              Енот надевает лётный шлем и говорит:
            </p>
            <p className="quest-p">«Роланд, ставь синюю кнопку на свой дом!»</p>
          </div>
        </div>
      </div>

      <div className="quest-row-story">
        <div className="quest-story-text" style={{ marginTop: "20px" }}>
          <div className="quest-text-paper">
            <div className="quest-tips">
              <p className="quest-hint-blue">Синяя точка — твой дом.</p>
              <p className="quest-hint-red">Красная точка — Шпицберген.</p>
              <p className="quest-hint-green">
                Когда выберешь маршрут — прямой, дугой или зигзагом — енот
                покажет, над какими странами вы пролетите. И поможет найти
                лучший маршрут.
              </p>
            </div>
          </div>
        </div>

        {/* ВИДЕО */}
        <div className="quest-video-wrapper ice-window">
          <div className="ice-window">
            <video className="quest-video" autoPlay muted loop playsInline>
              <source
                src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/route.webm"
                type="video/webm"
              />
            </video>
          </div>
        </div>
      </div>

      {/* MAP */}
      <FlightMap racTextRef={racTextRef} routeType={userChoice} />

      <div className="raccoon-absolute">
        <video
          className="quest-raccoon-video"
          autoPlay
          muted
          loop
          playsInline
          src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/raccoon-points.webm"
        />
      </div>
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
          Прямая
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
          Дуга
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
          Зигзаг
        </button>
      </div>

      <div ref={racTextRef} id="raccoonText" className="quest-speech">
        Енот: «Выбери тип маршрута.»
      </div>

      {/* SECOND DIALOG WINDOW — диалог о выборе маршрута */}
      <div
        className="flight-dialog-box-wrapper"
        style={{
          marginTop: "20px",
          maxWidth: "600px",
          marginLeft: "auto",
          marginRight: "auto",
          position: "relative",
          zIndex: 40,
        }}
      >
        <DialogBox
          queue={dialogueQueue}
          onNext={() => setDialogueQueue((q) => q.slice(1))}
        />
      </div>

      {/* FLIGHT SECRETS MODULE */}
      <div style={{ marginTop: "40px" }}>
        <FlightSecretsManager />
      </div>
    </div>
  );
}
