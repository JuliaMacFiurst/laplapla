"use client";

export default function Day7TreasureOfTimes() {
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
        <h1 className="quest-title-text">Клад Времён</h1>
      </div>

      {/* ВИДЕО */}
      <div className="ice-window">
        <div className="youtube-wrapper">
          <iframe
            className="quest-video"
            src="https://www.youtube.com/embed/sE2jxOVG8kU"
            title="Spitsbergen Flight"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
          />
        </div>
      </div>

      {/* Текстовые плитки */}
      <div className="quest-story-text" style={{ marginTop: "24px" }}>
        <div className="quest-text-paper">
          <div className="quest-text-inner">
            <p className="quest-p">
              Каждая экспедиция когда-нибудь заканчивается.
            </p>

            <p className="quest-p">
              Но если что-то интересное подошло к концу —
              значит, совсем скоро начнётся что-то новое.
            </p>

            <p className="quest-p">
              Пора возвращаться домой, открывать карту
              и искать новые удивительные места,
              куда обязательно захочется отправиться снова.
            </p>
          </div>
        </div>
        </div>

        <footer className="quest-footer">
        <div
          className="quest-center ice-button-wrapper"
          style={{ marginTop: "60px" }}
        >
          <div
            className="ice-button"
            onClick={() => {
              window.location.href = "/raccoons";
            }}
          >
            {/* льдина */}
            <img
              className="ice"
              src="/quests/assets/buttons/ice-button-bg.svg"
              alt="ice-btn"
            />

            {/* текст */}
            <div className="ice-text">↩️ Вернуться на карту </div>

            {/* пингвин */}
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