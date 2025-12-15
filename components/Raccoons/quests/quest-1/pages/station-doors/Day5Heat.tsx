"use client";

import type { PageId } from "../../QuestEngine";
import CharacterStage from "../../logic/dress-up-game/CharacterStage";

export default function Day5Heat({ go }: { go: (id: PageId) => void }) {
  return (
    <div className="quest-page-bg">
      {/* Заголовок страницы */}
      <div className="quest-title-wrapper">
        <img
          src="/quests/assets/banners/ribbon.webp"
          alt=""
          className="quest-title-banner"
        />
        <h1 className="quest-title-text">Тепловой модуль</h1>
      </div>

      <div className="dressup-container">
        <CharacterStage
          characters={[
            {
              name: "Stas",
              img: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dress-up/Stas/Stas.webp",
            },
            {
              name: "Clare",
              img: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dress-up/Clare/Clare.webp",
            },
            {
              name: "Sam",
              img: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dress-up/Sam/Sam.webp",
            },
            {
              name: "Matilda",
              img: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dress-up/Matilda/Matilda.webp",
            },
            {
              name: "Joe",
              img: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dress-up/Joe/Joe.webp"
            },
            {
              name: "Tamara",
              img: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dress-up/Tamara/Tamara.webp"         
            }
          ]}
          onCharacterSelected={(char) => {
            console.log("Selected character:", char);
          }}
          onStartGame={() => {
            console.log("start game");
          }}
        />
      </div>

      {/* Нижняя навигация */}
      <div style={{ textAlign: "center", marginTop: "40px" }}>
        <button
          className="quest-next-btn"
          onClick={() => go("day5_spitsbergen")}
        >
          ← Вернуться на станцию
        </button>
      </div>
    </div>
  );
}
