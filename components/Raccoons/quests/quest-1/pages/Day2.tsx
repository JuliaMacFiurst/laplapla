"use client";
import type { PageId } from "../QuestEngine";
import { useQuest1I18n } from "../i18n";
import QuestTextBlocks from "../QuestTextBlocks";

export default function Day2({ go }: { go: (id: PageId) => void }) {
  const { t } = useQuest1I18n();
  return (
    <div className="quest-page-bg">
      <div className="polar-scenery" aria-hidden />

      {/* ВИДЕО */}
      <div className="quest-video-wrapper ice-window">
        <div className="ice-window">
          <video className="quest-video" autoPlay muted loop playsInline>
            <source
              src="/supabase-storage/quests/1_quest/images/day2.webm"
              type="video/webm"
            />
          </video>
        </div>
      </div>

      <QuestTextBlocks blocks={t.day2.blocks} style={{ marginTop: "20px" }} />
      <div
            className="quest-center ice-button-wrapper"
            style={{ marginTop: "60px" }}
          >
            <div className="ice-button">
              {/* льдина */}
              <img
                className="ice"
                src="/quests/assets/buttons/ice-button-bg.svg"
                alt=""
              />

              {/* текст */}
              <div className="quest-question">{t.day2.question}</div>

            </div>
          </div>

      <div className="quest-center quest-choice-container">
        <div
            className="small-ice-button-wrapper"
          >
            <div className="quest-btn quest-next-btn"
            onClick={() => go("day3flight")}
            >
              {/* льдина */}
              <img
                className="small-ice"
                src="/quests/assets/buttons/small-ice-btn.svg"
                alt=""
              />

              {/* текст */}
              <div className="quest-option quest-option-flight">{t.day2.flightOption}</div>
            </div>
          </div>
        

         <div className="quest-center quest-choice-container">
        <div
            className="small-ice-button-wrapper"
          >
            <div className="quest-btn quest-next-btn"
            onClick={() => go("day3sail")}
            >
              {/* льдина */}
              <img
                className="small-ice"
                src="/quests/assets/buttons/small-ice-btn.svg"
                alt=""
              />

              {/* текст */}
              <div className="quest-option quest-option-sail">{t.day2.sailOption}</div>

            </div>
          </div>
       </div>
      </div>
    </div>
  );
}
