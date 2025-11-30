"use client";

import type { PageId } from "../QuestEngine";
import StarsMap from "../sail/StarsMap";
import DialogBoxStars from "../logic/DialogBoxStars";
import { useRef, useState } from "react";
import { starRouteDialogs, StarDialogueStep } from "@/utils/starRouteDialogs";

export default function Day4StarsNav({ go }: { go: (id: PageId) => void }) {
  const racTextRef = useRef<HTMLDivElement | null>(null);
  const starsMapRef = useRef<any>(null);

  const introDialogs = starRouteDialogs.filter((d) => d.condition === "intro");
  const [dialogueQueue, setDialogueQueue] =
    useState<StarDialogueStep[]>(introDialogs);

  const [mapDialogueQueue, setMapDialogueQueue] = useState<StarDialogueStep[]>(
    []
  );

  const [introDone, setIntroDone] = useState(false);

  return (
    <div className="quest-page-bg">
      <div className="polar-scenery" aria-hidden />

      <div className="quest-title-wrapper">
        <img
          src="/quests/assets/banners/ribbon.webp"
          alt=""
          className="quest-title-banner"
        />
        <h1 className="quest-title-text">На встречу Полярной Звезде!</h1>
      </div>

      <div className="quest-row-story">
        <div className="quest-story-text" style={{ marginTop: "20px" }}>
          <div className="quest-text-paper">
            <div className="quest-text-inner">
              <p className="quest-p">
                <em className="quest-em">
                  Йорк Свенсен стоит на палубе, маленький и пушистый...
                </em>
              </p>
              <p className="quest-p">
                <em className="quest-em">
                  <strong className="quest-strong">Свенсен:</strong>
                </em>{" "}
                — Компас ведёт себя странно!
              </p>
              <p className="quest-p">
                <em className="quest-em">
                  <strong className="quest-strong">Логан:</strong>
                </em>{" "}
                — Настоящие путешественники читают не стрелки…
              </p>
            </div>
          </div>

          <div className="quest-text-paper">
            <div className="quest-text-inner"></div>
            <p className="quest-p">
              <em className="quest-em">
                <strong className="quest-strong">Логан продолжает:</strong>
              </em>{" "}
              — Хочешь узнать, где север — ищи Полярную.
            </p>
          </div>
        </div>

        <div className="quest-vertical-video-wrapper ice-window">
          <div className="ice-window">
            <video
              className="quest-vertical-video"
              autoPlay
              muted
              loop
              playsInline
            >
              <source
                src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/svensen-with-compass.webm"
                type="video/webm"
              />
            </video>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "40px" }}>
        <StarsMap
          ref={starsMapRef}
          racTextRef={racTextRef}
          onStep={(stepId: string) => {
            const newLines = starRouteDialogs.filter(
              (d) => d.condition === stepId
            );
            if (newLines.length > 0) {
              setMapDialogueQueue((prev) => [...prev, ...newLines]);
            }
          }}
        />

        <div ref={racTextRef} id="raccoonText" className="quest-speech">
          Енот: «Нажми на звезду, чтобы узнать о ней!»
        </div>

        <div className="flight-dialog-box-wrapper">
          {!introDone && dialogueQueue.length > 0 && (
            <DialogBoxStars
              queue={dialogueQueue}
              onNext={() => {
                const current = dialogueQueue[0];
                if (current?.id === "intro_4") {
                  setIntroDone(true);
                  starsMapRef.current?.startRoute();
                  setDialogueQueue([]);
                  return;
                }
                setDialogueQueue((q) => q.slice(1));
              }}
            />
          )}

          {introDone && (
            <>
              {mapDialogueQueue.length > 0 && (
                <DialogBoxStars
                  queue={mapDialogueQueue}
                  onNext={() => {
                    setMapDialogueQueue((q) => q.slice(1));
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
