"use client";
import type { PageId } from "../QuestEngine";
import React from "react";

export default function Day2({ go }: { go: (id: PageId) => void }) {
  return (
    <div className="quest-wrapper">

        
          <video 
          className="quest-video"
            width="600"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/day2.webm" />
          </video>

        <div className="quest-story-text">
          <p className="quest-p"><em className="quest-em">Утро тёплое, но в воздухе чувствуется волнение. В комнате суета.
          <strong className="quest-strong">Роланд</strong> крутит старый глобус, прищурившись сквозь очки.</em></p>
          <p className="quest-p">— Хм… если верить записям сэра Бартоломью, первая часть карты должна быть где-то на севере... но где именно?</p>

          <p className="quest-p"><em className="quest-em"><strong className="quest-strong">Свенсен</strong> пишет список вещей.</em></p>
          <p className="quest-p">— Компас, фонарик, шоколад… нет, стоп, два шоколада!</p>

          <p className="quest-p"><em className="quest-em"><strong className="quest-strong">Тобиас</strong> сбивает стопку карт и визжит:</em></p>
          <p className="quest-p">— Мы поедем, да? Мы поедем прямо сейчас?!</p>

          <hr />

          <p className="quest-p"><em className="quest-em">
            В дверь стучат. Входит енот-капитан Логан с картой, пахнущей солью и ветром.
          </em></p>

          <p className="quest-p"><em className="quest-em"><strong>Логан</strong>: </em></p>
          <p className="quest-p">— Я слышал, кто-то тут собирается в путешествие и им нужен проводник?  
            Я летал над фьордами и плавал сквозь штормы, когда чайки замерзали на лету!
          </p>

          <p className="quest-p"><em className="quest-em">
            Он бросает карту на стол — пункт назначения:  
            <strong className="quest-strong">таинственный архипелаг Шпицберген</strong>, за Полярным кругом.
          </em>
          </p>

          <p className="quest-p"><em className="quest-em"><strong className="quest-strong">Логан</strong> снова говорит:
          </em>
          </p>
          
          <p className="quest-p">
            — Добраться туда можно двумя путями: по морю или по воздуху.  
            Решать вам, отважные хвосты!
          </p>

          <p className="quest-p"><em className="quest-em">Роланд нахмурился. Свенсен застыл. Тобиас уже влез на чемодан.</em></p>

          <div className="quest-center">
            <h3 className="quest-question">
                Как предпочитаете добираться?
            </h3>
            
          </div>

          <div className="quest-center quest-choice-container">
  <button
    className="quest-next-btn"
    onClick={() => go("day3flight")}
  >
    ✈️ Полетим
  </button>

  <button
    className="quest-btn quest-next-btn"
    onClick={() => go("day3sail")}
  >
    🚢 Отправимся по морю
  </button>
</div>
        </div>
      </div>
  );
}
