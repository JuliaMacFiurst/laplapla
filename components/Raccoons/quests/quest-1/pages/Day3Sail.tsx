"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { PageId } from "../QuestEngine";
import SeaMap from "../sail/SeaMap";
import DialogBox from "../logic/DialogBox";
import SailMiniTest from "../sail/SailMiniTest";
import { useQuest1I18n } from "../i18n";
import QuestTextBlocks from "../QuestTextBlocks";
import { getSeaRouteDialogs } from "../i18n/dialogs";

export default function Day3Sail({ go }: { go: (id: PageId) => void }) {
  const { lang, t } = useQuest1I18n();
  const racTextRef = useRef<HTMLDivElement | null>(null);
  const seaRouteDialogs = getSeaRouteDialogs(lang);
  const [dialogueQueue, setDialogueQueue] = useState(seaRouteDialogs);
  return (
    <div className="quest-page-bg">
      <div className="polar-scenery" aria-hidden />
      {/*ЗАГОЛОВОК */}
      <div className="quest-title-wrapper">
        <Image
          src="/quests/assets/banners/ribbon.webp"
          alt=""
          className="quest-title-banner"
          width={650}
          height={160}
          unoptimized
        />

        <h1 className="quest-title-text">{t.day3Sail.title}</h1>
      </div>

      <QuestTextBlocks blocks={t.day3Sail.introBlocks} style={{ marginTop: "20px" }} />

      <div className="quest-row-story">
        <div className="quest-story-text" style={{ marginTop: "20px" }}>
          <div className="quest-text-paper">
            <div className="quest-tips">
              <p className="quest-hint-blue">{t.day3Sail.tips[0]}</p>
              <p className="quest-hint-red">{t.day3Sail.tips[1]}</p>
              <p className="quest-hint-green">
                {t.day3Sail.tips[2]}
              </p>
              <p className="quest-hint-red">{t.day3Sail.tips[3]}</p>
            </div>
          </div>
        </div>
        

         {/* ВИДЕО */}
        <div className="quest-video-wrapper ice-window">
          <div className="ice-window">
            <video className="quest-video" autoPlay muted loop playsInline>
              <source
                src="/supabase-storage/quests/1_quest/images/sail-route.webm"
                type="video/webm"
              />
            </video>
          </div>
        </div>
</div>
      <div style={{ marginTop: "40px" }}>
        <SeaMap racTextRef={racTextRef} />
        <div ref={racTextRef} className="quest-speech"></div>
      </div>
      <div className="flight-dialog-box-wrapper" style={{ marginTop: "30px" }}>
        <DialogBox
          queue={dialogueQueue}
          onNext={() => setDialogueQueue((q) => q.slice(1))}
        />
      </div>

      {/* MINI TEST — морской тест */}
<div style={{ marginTop: "50px" }}>
  <SailMiniTest go={go} />
</div>
    </div>
  );
}
