"use client";

import type { PageId } from "../QuestEngine";
import StarsMap from "../sail/StarsMap";
import DialogBox from "../logic/DialogBox";
import { useRef, useState } from "react";
import { seaRouteDialogs } from "@/utils/seaRouteDialogs";

export default function Day4StarsNav({ go }: { go: (id: PageId) => void }) {
  const racTextRef = useRef<HTMLDivElement|null>(null);
  const [dialogueQueue, setDialogueQueue] = useState(seaRouteDialogs);

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
                Йорк Свенсен стоит на палубе, маленький и пушистый, ветер
                треплет его плед. Корабль под вечерним небом. Небо бледно-синее,
                уже видны первые звёзды.
              </em>
            </p>
            <p className="quest-p">
              <em className="quest-em"><strong className="quest-strong">Свенсен (взволнованно):</strong></em> — Компас ведёт себя странно! Стрелка всё
              время крутится. Как мы теперь поймём, куда плыть!?
            </p>
            <p className="quest-p">
              <em className="quest-em"><strong className="quest-strong">Логан (с ухмылкой):</strong></em> — Компас — это для тех, кто ленится поднять
              глаза. Настоящие путешественники читают не стрелки, а само небо.
            </p>
          </div>
        </div>
    
            <div className="quest-story-text">
        <div className="quest-text-paper">
          <div className="quest-text-inner"></div>
            <p className="quest-p">
              <em className="quest-em"><strong className="quest-strong">Логан продолжает :</strong></em> — Хочешь узнать, где север — ищи Полярную звезду. Она не бегает по небу как остальные. Смотри…
            </p>
          </div>
        </div>
      </div>
       {/* ВИДЕО */}
        <div className="quest-vertical-video-wrapper ice-window">
          <div className="ice-window">
            <video className="quest-vertical-video" autoPlay muted loop playsInline>
              <source
                src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/svensen-with-compass.webm"
                type="video/webm"
              />
            </video>
          </div>
        </div>
      </div>
      <div style={{ marginTop: "40px" }}>
         <StarsMap racTextRef={racTextRef} />
        <div ref={racTextRef} id="raccoonText" className="quest-speech">
          Енот: «Нажми на звезду, чтобы узнать о ней!»
        </div>
        <div className="flight-dialog-box-wrapper">
          <DialogBox queue={dialogueQueue} onNext={()=>setDialogueQueue(q=>q.slice(1))}/>
        </div>
       
      </div>
    </div>
  );
}
