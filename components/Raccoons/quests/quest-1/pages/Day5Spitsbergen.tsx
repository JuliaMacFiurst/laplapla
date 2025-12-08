"use client";

import type { PageId } from "../QuestEngine";
import { useState } from "react";

export default function Day5Spitsbergen({ go }: { go: (id: PageId) => void }) {
  const [started, setStarted] = useState(false);

  const handleStart = () => {
    setStarted(true);
  };

  return (
    <div className="quest-page-bg">
      <div className="polar-scenery" aria-hidden />

      <div className="quest-title-wrapper">
        <img
          src="/quests/assets/banners/ribbon.webp"
          alt=""
          className="quest-title-banner"
        />
        <h1 className="quest-title-text">На острове Шпицберген</h1>
      </div>

      <div className="quest-row-story">
        <div className="quest-story-text" style={{ marginTop: "20px" }}>
          <div className="quest-text-paper">
            <div className="quest-text-inner">
              <p className="quest-p">
                <em className="quest-em">
                  Ледяные ветры несут нас всё севернее… впереди —
                  архипелаг Свалбард, а на нём суровый и прекрасный остров
                  Шпицберген.
                </em>
              </p>

              <p className="quest-p">
                <strong className="quest-strong">Логан:</strong>{" "}
                Здесь люди научились жить бок о бок с полярными медведями,
                а ночное небо сияет северным сиянием почти полгода подряд!
              </p>

              <p className="quest-p">
                <strong className="quest-strong">Свенсен:</strong>{" "}
                — Ты только скажи — мы высаживаемся? Или продолжаем путь?
              </p>

              {!started && (
                <button
                  className="dialog-next-btn"
                  onClick={handleStart}
                >
                  🧭 Вперёд к ледяным берегам!
                </button>
              )}
            </div>
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
                src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/arctic-ship.webm"
                type="video/webm"
              />
            </video>
          </div>
        </div>
      </div>

      {started && (
        <div style={{ marginTop: "40px" }}>
          <div className="quest-text-paper">
            <div className="quest-text-inner">
              <p className="quest-p">
                <em className="quest-em">
                  Мы приближаемся к одному из самых загадочных мест планеты.
                </em>
              </p>

              <p className="quest-p">
                Шпицберген встречает путешественников суровой природой,
                древними горными породами и спокойствием, которое можно
                ощутить только здесь, вдали от цивилизации.
              </p>

              <p className="quest-p">
                Готов продолжить путь? Тогда — вперёд!
              </p>

              <button
                className="dialog-next-btn"
                onClick={() => go("day5_spitsbergen")}
              >
                🚢 Продолжить путешествие
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
