import { useEffect } from "react";

export default function Day1({ go }) {

  // запуск звука + плавное исчезновение кнопки
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
      setTimeout(() => btn.remove(), 1000);
    }
  }

  return (
    <div className="quest-wrapper">

      {/* ВИДЕО + ОГОНЬ */}
      
        <video class-name="quest-video
" width="600" autoPlay loop muted playsInline>
          <source
            src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/output.webm"
            type="video/webm"
          />
        </video>

        <div id="firelight"></div>

      {/* КНОПКА СТАРТА */}
        <button id="startBtn" onClick={startIntro}>
          Начать историю
        </button>


      {/* АУДИО */}
      <audio
        class-name="quest-audio"
        id="fire"
        src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/sounds/fireplace.ogg"
        loop
      />
      <audio
        class-name="quest-audio"
        id="music"
        src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/sounds/furry_friends.ogg"
        loop
      />

      {/* ТЕКСТ ИСТОРИИ */}
      <div className="quest-story" style={{ marginTop: "20px" }}>

        <p className="quest-p">
          <em className="quest-em">
            Хрустят дрова в камине. За окном медленно падает снег. На пушистом
            коврике у огня сидят друзья: толстый Бульдог Роланд в очках,
            Йоркширский терьер Свенсен, запутавшийся в клетчатом пледе,
            маленький щенок Тобиас, играющий с апельсином, и задумчивая кошка,
            свернувшаяся клубком на кровати в углу.
          </em>
        </p>

        <p className="quest-p">Бульдог открывает старую, чуть потёртую книгу. Его голос звучит низко и спокойно:</p>

        <p className="quest-p">
          <strong className="quest-strong">
            «Когда-то давно, мой юный слушатель, жил великий путешественник —
            сэр Бартоломью Вагглстоун. Он прошёл сквозь снега Севера и пески Юга,
            пересёк океаны, пережил ураганы и песчаные бури. И в один из своих
            походов он нашёл древнюю карту — карту, ведущую к Кладу Времён.
            Но судьба капризна: буря разорвала карту на пять частей и разбросала
            их по всему свету.»
          </strong>
        </p>

        <p className="quest-p">Йоркширский терьер отпивает чай и шепчет:</p>
        <p className="quest-p">
          <em className="quest-em">— Пять частей... это же почти как пять историй!</em>
        </p>

        <p className="quest-p">Бульдог кивает:</p>

        <p className="quest-p">
          <strong className="quest-strong">
            «Именно так, мои пушистые слушатели. Чтобы найти клад, нужно собрать
            карту снова. Каждая часть спрятана в новой стране, за рекой, за
            горами, под морем и в сердце джунглей. И лишь самые отважные смогут
            пройти этот путь.»
          </strong>
        </p>

        <p className="quest-p">Маленький щенок подпрыгивает:</p>
        <p className="quest-p">
          <em className="quest-em">— Давайте мы попробуем!</em>
        </p>

        <p className="quest-p">Бульдог с улыбкой закрывает книгу:</p>

        <p className="quest-p">
          <strong className="quest-strong">
            «Каждое путешествие начинается с первого шага.
            Завтра на рассвете — отправляемся.»
          </strong>
        </p>

        <p className="quest-p">
          Пламя камина тихо трещит, и кажется, что искры на секунду складываются
          в очертания старой карты…
        </p>

        {/* КНОПКА ПЕРЕХОДА */}
        
          <button id="startBtn" onClick={() => go("day2")}>
            🚢 Отправиться в путешествие
          </button>
    

      </div>
    </div>
  );
}