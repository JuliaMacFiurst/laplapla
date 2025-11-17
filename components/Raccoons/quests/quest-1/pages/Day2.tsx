"use client";
import type { PageId } from "../QuestEngine";
import React from "react";

export default function Day2({ go }: { go: (id: PageId) => void }) {
  return (
    <div className="quest-page-bg">
      <div className="polar-scenery" aria-hidden />

      {/* ВИДЕО */}
      <div className="quest-video-wrapper ice-window">
        <div className="ice-window">
          <video className="quest-video" autoPlay muted loop playsInline>
            <source
              src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/day2.webm"
              type="video/webm"
            />
          </video>
        </div>
      </div>

      
        <div className="quest-story-text" style={{ marginTop: "20px" }}>
          <div className="quest-text-paper">
            <div className="quest-text-inner">
              <p className="quest-p">
                <em className="quest-em">
                  Утро тёплое, но в воздухе чувствуется волнение. В комнате
                  суета.
                  <strong className="quest-strong">Роланд</strong> крутит старый
                  глобус, прищурившись сквозь очки.
                </em>
              </p>
              <p className="quest-p">
                — Хм… если верить записям сэра Бартоломью, первая часть карты
                должна быть где-то на севере... но где именно?
              </p>
            </div>
          </div>
          <div className="quest-text-paper">
            <div className="quest-text-inner">
              <p className="quest-p">
                <em className="quest-em">
                  <strong className="quest-strong">Свенсен</strong> пишет список
                  вещей.
                </em>
              </p>
              <p className="quest-p">
                — Компас, фонарик, шоколад… нет, стоп, два шоколада!
              </p>
            </div>
          </div>
          <div className="quest-text-paper">
            <div className="quest-text-inner">
              <p className="quest-p">
                <em className="quest-em">
                  <strong className="quest-strong">Тобиас</strong> сбивает
                  стопку карт и визжит:
                </em>
              </p>
              <p className="quest-p">
                — Мы поедем, да? Мы поедем прямо сейчас?!
              </p>
            </div>
          </div>

          <div className="quest-text-paper">
            <div className="quest-text-inner">
              <p className="quest-p">
                <em className="quest-em">
                  В дверь стучат. Входит енот-капитан Логан с картой, пахнущей
                  солью и ветром.
                </em>
              </p>

              <p className="quest-p">
                <em className="quest-em">
                  <strong>Логан</strong>:{" "}
                </em>
              </p>
              <p className="quest-p">
                — Я слышал, кто-то тут собирается в путешествие и им нужен
                проводник? Я летал над фьордами и плавал сквозь штормы, когда
                чайки замерзали на лету!
              </p>

              <p className="quest-p">
                <em className="quest-em">
                  Он бросает карту на стол — пункт назначения:
                  <strong className="quest-strong">
                    таинственный архипелаг Шпицберген
                  </strong>
                  , за Полярным кругом.
                </em>
              </p>
            </div>
          </div>

          <div className="quest-text-paper">
            <div className="quest-text-inner">
              <p className="quest-p">
                <em className="quest-em">
                  <strong className="quest-strong">Логан</strong> снова говорит:
                </em>
              </p>

              <p className="quest-p">
                — Добраться туда можно двумя путями: по морю или по воздуху.
                Решать вам, отважные хвосты!
              </p>
            </div>
          </div>

          <div className="quest-text-paper">
            <div className="quest-text-inner">
              <p className="quest-p">
                <em className="quest-em">
                  Роланд нахмурился. Свенсен застыл. Тобиас уже влез на чемодан.
                </em>
              </p>
            </div>
          </div>
        </div>
      <div
            className="quest-center ice-button-wrapper"
            style={{ marginTop: "60px" }}
          >
            <div className="ice-button">
              {/* льдина */}
              <img
                className="ice"
                src="/quests/assets/buttons/ice-button-bg.svg"
                alt="ice-btn"
              />

              {/* текст */}
              <div className="quest-question">Как предпочитаете добираться?</div>

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
                alt="ice-btn"
              />

              {/* текст */}
              <div className="quest-option quest-option-flight">✈️ Полетим</div>
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
                alt="ice-btn"
              />

              {/* текст */}
              <div className="quest-option quest-option-sail">🚢 Отправимся по морю</div>

            </div>
          </div>
       </div>
      </div>
    </div>
  );
}
