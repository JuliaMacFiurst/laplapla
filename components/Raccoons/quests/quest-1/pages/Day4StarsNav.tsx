"use client";

import Image from "next/image";
import type { PageId } from "../QuestEngine";
import StarsMap, { type StarsMapHandle } from "../sail/StarsMap";
import DialogBoxStars from "../logic/DialogBoxStars";
import DialogBoxStarsInteractive from "../logic/DialogBoxStarsInteractive";
import { useRef, useState, useEffect } from "react";
import { useQuest1I18n } from "../i18n";
import QuestTextBlocks from "../QuestTextBlocks";
import {
  getStarRouteDialogs,
  getStarNavigationUi,
  relocalizeStarDialogueQueue,
  type StarDialogueStep,
} from "../i18n/dialogs";
import { devLog } from "@/utils/devLog";
import { QuestNarrationSlot, useAvailableNarrationBlocks } from "../narration/availability";
import { STARS_INTRO_BLOCKS, starDialogueBlockId } from "../narration/gameMappings";
import { getStarNavigationVideoEmbedUrl } from "../sail/starNavigationVideos";
import { formatLocalizedStarFactText } from "@/utils/starInfo";

export default function Day4StarsNav({ go }: { go: (id: PageId) => void }) {
  const { lang, t } = useQuest1I18n();
  const starsMapRef = useRef<StarsMapHandle>(null);
  const starRouteDialogs = getStarRouteDialogs(lang);
  const navigationVideoUrl = getStarNavigationVideoEmbedUrl(lang);
  const navigationUi = getStarNavigationUi(lang);

  const introDialogs = starRouteDialogs.filter((d) => d.condition === "intro");
  const [dialogueQueue, setDialogueQueue] =
    useState<StarDialogueStep[]>(introDialogs);

  const [mapDialogueQueue, setMapDialogueQueue] = useState<StarDialogueStep[]>(
    []
  );
  const [finishDialogueQueue, setFinishDialogueQueue] = useState<StarDialogueStep[]>([]);
  const [showVideo, setShowVideo] = useState(false);
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);
  const selectedStarFact = selectedStarId ? formatLocalizedStarFactText(selectedStarId, lang) : null;

  const [introDone, setIntroDone] = useState(false);
  const visibleDialogueId = finishDialogueQueue[0]?.id
    ?? mapDialogueQueue[0]?.id
    ?? dialogueQueue[0]?.id;
  const visibleDialogueBlock = starDialogueBlockId(visibleDialogueId);
  useAvailableNarrationBlocks("day4-stars-story", STARS_INTRO_BLOCKS);
  useAvailableNarrationBlocks(
    "day4-stars-dialogue",
    visibleDialogueBlock ? [visibleDialogueBlock] : [],
  );
  useAvailableNarrationBlocks(
    "day4-stars-arrival",
    showVideo ? ["svalbard.day04.stars.arrival.01"] : [],
  );

  useEffect(() => {
    setDialogueQueue((queue) => relocalizeStarDialogueQueue(queue, lang, selectedStarId));
    setMapDialogueQueue((queue) => relocalizeStarDialogueQueue(queue, lang, selectedStarId));
    setFinishDialogueQueue((queue) => relocalizeStarDialogueQueue(queue, lang, selectedStarId));
  }, [lang, selectedStarId]);

  return (
    <div className="quest-page-bg">
      <div className="polar-scenery" aria-hidden />

      <div className="quest-title-wrapper">
        <Image
          src="/quests/assets/banners/ribbon.webp"
          alt=""
          className="quest-title-banner"
          width={650}
          height={160}
          unoptimized
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
          <StarsMap
            ref={starsMapRef}
            onStarSelect={setSelectedStarId}
            onStep={(stepId: string) => {
              devLog("[Day4StarsNav] onStep:", stepId);

              if (stepId.startsWith("wrong-star:")) {
                const [, humanName] = stepId.split(":");

                const merakPhase = starsMapRef.current?.getRouteStep?.() === "find_merak";
                const dubhePhase = starsMapRef.current?.getRouteStep?.() === "find_dubhe";
                const polarisPhase = starsMapRef.current?.getRouteStep?.() === "find_polaris";

                let dialogId = "";
                if (merakPhase) {
                  dialogId = humanName === "no_id" ? "wrong_merak_no_id" : "wrong_merak_wrong_id";
                } else if (dubhePhase) {
                  dialogId = humanName === "no_id" ? "wrong_dubhe_no_id" : "wrong_dubhe_wrong_id";
                } else if (polarisPhase) {
                  dialogId = "wrong_polaris";
                }

                const wrongLines = starRouteDialogs.filter((d) => d.id === dialogId);

                if (wrongLines.length > 0) {
                  const cloned = wrongLines.map((line) => ({ ...line }));

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

                setShowVideo(true);
                setMapDialogueQueue([]);

                setFinishDialogueQueue(finishLines);

                return;
              }

              const newLines = starRouteDialogs.filter(
                (d) => d.condition === stepId
              );

              if (newLines.length > 0) {
                setMapDialogueQueue(newLines);
              }
            }}
          />

        <div id="raccoonText" className="quest-speech">
          {selectedStarFact ? `${lang === "ru" ? "Енот" : lang === "he" ? "לוגן" : "Logan"}: ${selectedStarFact}` : t.day4StarsNav.defaultSpeech}
        </div>

        <div className="flight-dialog-box-wrapper">
          {!introDone && dialogueQueue.length > 0 && (
            <DialogBoxStars
              queue={dialogueQueue}
              onNext={() => {
                const current = dialogueQueue[0];
                if (current?.id === "intro_4") {
                  setIntroDone(true);
                  setSelectedStarId(null);
                  starsMapRef.current?.startRoute();
                  setDialogueQueue([]);
                  return;
                }
                setDialogueQueue((q) => q.slice(1));
              }}
            />
          )}

          {introDone && mapDialogueQueue.length > 0 && (
            <div>
              <DialogBoxStarsInteractive
                key={mapDialogueQueue[0]?.id}
                queue={mapDialogueQueue}
              />
            </div>
          )}

          {finishDialogueQueue.length > 0 && (
            finishDialogueQueue.map((line) => <DialogBoxStarsInteractive key={line.id} queue={[line]} />)
          )}
        </div>

        <QuestNarrationSlot />

        {showVideo && <QuestTextBlocks blocks={[t.day4StarsNav.arrivalBlock]} style={{ marginTop: "20px" }} />}

        {showVideo && (
          <section className="star-navigation-completion">
            {navigationVideoUrl ? (
              <div className="ice-window">
                <div className="youtube-wrapper-polar-star">
                  <iframe
                    className="quest-video"
                    src={navigationVideoUrl}
                    title={t.day4StarsNav.videoTitle}
                    allow="autoplay; encrypted-media; fullscreen"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : <p className="quest-video-unavailable" role="status">{navigationUi.videoUnavailable}</p>}
            <div className="quest-center ice-button-wrapper">
              <button type="button" className="ice-button" onClick={() => go("day5_spitsbergen")}>
                <Image className="ice" src="/quests/assets/buttons/ice-button-bg.svg" alt="" width={720} height={180} unoptimized />
                <span className="ice-text">{t.day4StarsNav.nextButton}</span>
                <Image className="penguin" src="/supabase-storage/characters/other/penguin.gif" alt="" width={92} height={92} unoptimized />
              </button>
            </div>
          </section>
        )}
    </div>
      </div>
    
  );
}
