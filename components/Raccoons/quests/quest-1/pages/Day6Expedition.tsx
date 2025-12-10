

"use client";

import type { PageId } from "../QuestEngine";

export default function Day6Expedition({ go }: { go: (id: PageId) => void }) {
  return (
    <div className="quest-page-bg">

      {/* Заголовок */}
      <div className="quest-title-wrapper">
        <img
          src="/quests/assets/banners/ribbon.webp"
          alt=""
          className="quest-title-banner"
        />
        <h1 className="quest-title-text">Начало Полярной Экспедиции</h1>
      </div>

      {/* Вводный текст */}
      <div className="quest-story-text" style={{ marginTop: "20px" }}>
        <div className="quest-text-paper">
          <div className="quest-text-inner">
            <p className="quest-p">
              Экспедиция начинается! За пределами станции лежит царство снега,
              льда и бескрайних просторов. Команда собирается, снегоходы прогреты,
              приборы откалиброваны — всё готово для большого путешествия.
            </p>

            <p className="quest-p">
              Впереди — долины вечной мерзлоты, ледяные гроты, заснеженные холмы
              и следы белых медведей. Логан, Роланд, Свенсен и Тобиас ждут тебя —
              вместе вы сможете исследовать самый загадочный уголок Арктики.
            </p>

            <p className="quest-p">
              Сделай глубокий вдох — полярный путь зовёт!
            </p>
          </div>
        </div>
      </div>

      {/* Центр страницы: здесь позже появится карта пути или мини‑игра */}
      <div style={{ marginTop: "40px", textAlign: "center" }}>
        <p className="quest-p">
          (Здесь появится интерактив: маршрут экспедиции, выбор направления,
          мини‑игры со снегом и льдами)
        </p>
      </div>

      {/* Кнопки навигации */}
      <div style={{ textAlign: "center", marginTop: "40px" }}>
        <button className="quest-next-btn" onClick={() => go("day5_spitsbergen")}>
          ← Вернуться на базу
        </button>

        <button
          className="quest-next-btn"
          style={{ marginLeft: "20px" }}
          //onClick={() => go("day7")} // заглушка: следующая страница маршрута
        >
          В путь →
        </button>
      </div>
    </div>
  );
}