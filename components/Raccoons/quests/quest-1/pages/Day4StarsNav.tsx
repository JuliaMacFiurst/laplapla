"use client";

import type { PageId } from "../QuestEngine";
import StarsMap from "../sail/StarsMap";
import DialogBoxStars from "../logic/DialogBoxStars";
import DialogBoxStarsInteractive from "../logic/DialogBoxStarsInteractive";
import { useRef, useState, useEffect } from "react";
import { useQuest1I18n } from "../i18n";
import QuestTextBlocks from "../QuestTextBlocks";
import { getStarRouteDialogs, type StarDialogueStep } from "../i18n/dialogs";

export default function Day4StarsNav({ go }: { go: (id: PageId) => void }) {
  const { lang, t } = useQuest1I18n();
  const racTextRef = useRef<HTMLDivElement | null>(null);
  const starsMapRef = useRef<any>(null);
  const starRouteDialogs = getStarRouteDialogs(lang);

  const introDialogs = starRouteDialogs.filter((d) => d.condition === "intro");
  const [dialogueQueue, setDialogueQueue] =
    useState<StarDialogueStep[]>(introDialogs);

  const [mapDialogueQueue, setMapDialogueQueue] = useState<StarDialogueStep[]>(
    []
  );
  const [finishDialogueQueue, setFinishDialogueQueue] = useState<StarDialogueStep[]>([]);
  const [showVideo, setShowVideo] = useState(false);
  const [fadeOutInteractive, setFadeOutInteractive] = useState(false);

  const [introDone, setIntroDone] = useState(false);

  const handleMapClick = () => {
    if (!introDone) {
      const currentIntro = dialogueQueue[0];
      if (currentIntro?.id === "intro_4") {
        setIntroDone(true);
        setDialogueQueue([]);
        starsMapRef.current?.startRoute();
      }
    }
  };

  useEffect(() => {
    if (showVideo) {
      setTimeout(() => {
        document.querySelector(".youtube-wrapper")?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 300);
    }
  }, [showVideo]);

  return (
    <div className="quest-page-bg">
      <div className="polar-scenery" aria-hidden />

      <div className="quest-title-wrapper">
        <img
          src="/quests/assets/banners/ribbon.webp"
          alt=""
          className="quest-title-banner"
        />
        <h1 className="quest-title-text">{t.day4StarsNav.title}</h1>
      </div>

      <div className="quest-row-story">
        <QuestTextBlocks blocks={t.day4StarsNav.introBlocks} style={{ marginTop: "20px" }} />

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
                src="/supabase-storage/quests/1_quest/images/svensen-with-compass.webm"
                type="video/webm"
              />
            </video>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "40px" }}>
        <div onClick={handleMapClick}>
          <StarsMap
            ref={starsMapRef}
            racTextRef={racTextRef}
            onStep={(stepId: string) => {
              console.log("[Day4StarsNav] onStep:", stepId);

              // Пропускаем служебный шаг
              if (stepId === "first_click") {
                return;
              }

              // Разбор wrong-star:[humanName]
              if (stepId.startsWith("wrong-star:")) {
                const [, humanName] = stepId.split(":"); // например "Фекда" или "no_id"

                // Определяем, какое состояние сейчас активно
                const merakPhase = starsMapRef.current?.getRouteStep?.() === "waiting_merak";
                const dubhePhase = starsMapRef.current?.getRouteStep?.() === "waiting_dubhe";

                // Выбираем нужный ключ ошибки
                let dialogId = "";
                if (merakPhase) {
                  dialogId = humanName === "no_id" ? "wrong_merak_no_id" : "wrong_merak_wrong_id";
                } else if (dubhePhase) {
                  dialogId = humanName === "no_id" ? "wrong_dubhe_no_id" : "wrong_dubhe_wrong_id";
                }

                // Находим соответствующие строки диалога
                const wrongLines = starRouteDialogs.filter((d) => d.id === dialogId);

                if (wrongLines.length > 0) {
                  const cloned = wrongLines.map((line) => ({ ...line }));

                  // Подставляем красивое имя звезды
                  if (humanName !== "no_id") {
                    cloned.forEach((line) => {
                      line.text = line.text.replace("#id", humanName);
                    });
                  }

                  setMapDialogueQueue(cloned);
                }

                return;
              }

              if (stepId === "finish") {
                const finishLines = starRouteDialogs.filter(
                  (d) => d.id === "finish_1" || d.id === "finish_2"
                );

                // trigger fade-out of interactive box
                setFadeOutInteractive(true);

                // stop interactive dialogue
                setMapDialogueQueue([]);

                // load finish dialogue
                setFinishDialogueQueue(finishLines);

                return;
              }

              // Остальные шаги: click_merak, click_dubhe, correct_line, finish
              const newLines = starRouteDialogs.filter(
                (d) => d.condition === stepId
              );

              if (newLines.length > 0) {
                setMapDialogueQueue(newLines);
              }
            }}
          />
        </div>

        <div ref={racTextRef} id="raccoonText" className="quest-speech">
          {t.day4StarsNav.defaultSpeech}
        </div>

        {lang !== "ru" && t.day4StarsNav.mapTranslationNotice && (
          <div className="quest-map-translation-note" dir={lang === "he" ? "rtl" : "ltr"}>
            {t.day4StarsNav.mapTranslationNotice}
          </div>
        )}

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

          {introDone && mapDialogueQueue.length > 0 && (
            <div className={fadeOutInteractive ? "dialog-fade-out" : ""}>
              <DialogBoxStarsInteractive
                key={mapDialogueQueue[0]?.id}
                queue={mapDialogueQueue}
              />
            </div>
          )}

          {finishDialogueQueue.length > 0 && (
            <DialogBoxStars
              queue={finishDialogueQueue}
              onNext={() => {
                const current = finishDialogueQueue[0];

                if (current.id === "finish_1") {
                  setShowVideo(true);
                  setFinishDialogueQueue((q) => q.slice(1));
                  return;
                }

                if (current.id === "finish_2") {
                  setFinishDialogueQueue([]);
                  return;
                }

                setFinishDialogueQueue((q) => q.slice(1));
              }}
            />
          )}
        </div>

        {showVideo && (
          <>
          <div className="ice-window" style={{ marginTop: "100px" }}>
            <div className="youtube-wrapper-polar-star">

              <iframe
                className="quest-video"
                src="https://www.youtube.com/embed/CWf0_sdJOJI?enablejsapi=1"
                title={t.day4StarsNav.videoTitle}
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
       

         <QuestTextBlocks blocks={[t.day4StarsNav.arrivalBlock]} style={{ marginTop: "20px" }} />

    <div
            className="quest-center ice-button-wrapper"
            style={{ marginTop: "60px" }}
          >

      <div className="ice-button" onClick={() => go("day5_spitsbergen")}>
        <img
          className="ice"
          src="/quests/assets/buttons/ice-button-bg.svg"
          alt="ice-btn"
        />
        <div className="ice-text">{t.day4StarsNav.nextButton}</div>
        <img
          className="penguin"
          src="/supabase-storage/characters/other/penguin.gif"
          alt="penguin"
        />
      </div>
</div>
</>
       )}
    </div>
      </div>
    
  );
}
