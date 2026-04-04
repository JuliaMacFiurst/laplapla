import { useState } from "react";
import type { PageId } from "../QuestEngine";
import { useQuest1I18n } from "../i18n";
import QuestTextBlocks from "../QuestTextBlocks";

export default function Day1({ go }: { go: (id: PageId) => void }) {
  const { t } = useQuest1I18n();
  const [started, setStarted] = useState(false);

  //
  // ✅ Кнопка «Начать историю»
  //
  function startIntro() {
    const fire = document.getElementById("fire") as HTMLAudioElement | null;
    const music = document.getElementById("music") as HTMLAudioElement | null;
    const btn = document.getElementById("startBtn") as HTMLButtonElement | null;

    if (fire) {
      fire.volume = 0.4;
      fire.play();
    }

    if (music) {
      music.volume = 0.2;
      music.play();
    }

    if (btn) {
      btn.style.transition = "opacity 1s ease";
      btn.style.opacity = "0";
      setTimeout(() => btn.remove(), 800);
    }

    // Отложенный запуск, чтобы дать браузеру полностью отрисовать DOM
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setStarted(true);

        // Небольшая плавная прокрутка вниз
        setTimeout(() => {
          window.scrollTo({
            top: window.scrollY + 200,
            behavior: "smooth",
          });
        }, 500);
      });
    });
  }

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

        <h1 className="quest-title-text">{t.day1.title}</h1>
      </div>
      {/* ВИДЕО */}
      <div className="quest-video-wrapper ice-window">
        <div className="ice-window">
          <video className="quest-video" autoPlay muted loop playsInline>
            <source
              src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/output.webm"
              type="video/webm"
            />
          </video>
        </div>
      </div>
      {/* КНОПКА СТАРТА */}
      <div className="quest-start-btn-wrapper">
        {!started && (
          <div className="boat-wrapper" id="startBtn" onClick={startIntro}>
            <div className="boat-inner boat-button">
              <img
                className="boat"
                src="/quests/assets/buttons/boat-btn.svg"
                alt="boat"
              />
              <div className="boat-text">{t.day1.startButton}</div>
            </div>
          </div>
        )}
      </div>
      {/* АУДИО */}
      <audio
        id="fire"
        src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/sounds/fireplace.ogg"
        loop
      />
      <audio
        id="music"
        src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/sounds/furry_friends.ogg"
        loop
      />

      {/* ТЕКСТ — ПОЯВЛЕНИЕ АБЗАЦОВ */}
      {started && (
        <div className="quest-day1-story-wrapper">
          <QuestTextBlocks
            className="quest-story-text quest-day1-story-text"
            blocks={t.day1.blocks}
          />
        </div>
      )}

      {/* КНОПКА ПЕРЕХОДА */}
      {started && (
        <footer className="quest-footer">
          <div
            className="quest-center ice-button-wrapper"
            style={{ marginTop: "60px" }}
          >
            <div className="ice-button" onClick={() => go("day2")}>
              {/* льдина */}
              <img
                className="ice"
                src="/quests/assets/buttons/ice-button-bg.svg"
                alt="ice-btn"
              />

              {/* текст */}
              <div className="ice-text">{t.day1.nextButton}</div>

              {/* пингвин */}
              <img
                className="penguin"
                src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/characters/other/penguin.gif"
                alt="penguin"
              />
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
