"use client";

import type { PageId } from "../QuestEngine";

export default function Day6Expedition({ go }: { go: (id: PageId) => void }) {
  return (
    <div className="quest-page-bg">
      <div className="polar-scenery" aria-hidden />

      {/* Заголовок */}
      <div className="quest-title-wrapper">
        <img
          src="/quests/assets/banners/ribbon.webp"
          alt=""
          className="quest-title-banner"
        />
        <h1 className="quest-title-text">Экспедиция</h1>
      </div>

      {/* ВИДЕО */}
      <div className="quest-video-wrapper ice-window">
        <div className="ice-window">
          <video className="quest-video" autoPlay muted loop playsInline>
            <source
              src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/expedition.webm"
              type="video/webm"
            />
          </video>
        </div>
      </div>

      {/* Текстовые плитки */}
      <div className="quest-story-text" style={{ marginTop: "24px" }}>
        <div className="quest-text-paper">
          <div className="quest-text-inner">
            <p className="quest-p">Они ехали долго.</p>
            <p className="quest-p">
              Сани мягко скользили по насту. Снег скрипел под полозьями, дыхание
              собак сливалось в ровный, живой шум.
            </p>

            <p className="quest-p">
              Ничего лишнего. Только бег, холод и движение вперёд..
            </p>
          </div>
        </div>

        <div className="quest-text-paper">
          <div className="quest-text-inner">
            <p className="quest-p">
              <em className="quest-em">
                Здесь не было дорог — только направление.
              </em>
            </p>

            <p className="quest-p">
              Ни следов, ни указателей, ни привычных ориентиров.
            </p>

            <p className="quest-p">
              В таких местах мир не подсказывает путь — он смотрит, как ты
              выберешь его сам.
            </p>
          </div>
        </div>

        <div className="quest-text-paper">
          <div className="quest-text-inner">
            <p className="quest-p">
              <em className="quest-em">
                Роланд прищурился, глядя на горизонт.
              </em>
            </p>
            <p className="quest-p">
              Он не повышал голос — здесь и так было слышно всё важное.
            </p>

            <p className="quest-p">
              <strong className="quest-strong">
                — Торопиться не будем, — сказал он. — Здесь выигрывает не тот,
                кто быстрее, а тот, кто умеет замечать.
              </strong>
            </p>
          </div>
        </div>

        <div className="quest-text-paper">
          <div className="quest-text-inner">
            <p className="quest-p">
              <em className="quest-em">Маленький Тобиас подпрыгивает:</em>
            </p>

            <p className="quest-p">
              — Я буду смотреть первым! Следы, трещины, ветер! И если что-то
              покажется странным — я сразу скажу!
            </p>

            <p className="quest-p">
              <em className="quest-em">Роланд с улыбкой отвечает:</em>
            </p>

            <p className="quest-p">
              — Правильно. — Вот в этом и есть суть экспедиции. Когда один
              смотрит вперёд, другой — по сторонам, а третий не боится сказать,
              что что-то идёт не так.
            </p>
          </div>
        </div>
      </div>

      {/* Кнопка дальше */}
      <footer className="quest-footer">
        <div
          className="quest-center ice-button-wrapper"
          style={{ marginTop: "60px" }}
        >
          <div
            className="ice-button"
            onClick={() => go("day7_treasure_of_times")}
          >
            <img
              className="ice"
              src="/quests/assets/buttons/ice-button-bg.svg"
              alt="ice-btn"
            />
            <div className="ice-text">К Кладу Времен →</div>
            <img
              className="penguin"
              src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/characters/other/penguin.gif"
              alt="penguin"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
