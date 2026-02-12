"use client";

import { useState } from "react";
import type { PageId } from "../../QuestEngine";
import CharacterStage from "../../logic/dress-up-game/CharacterStage";
import type { CharacterResult } from "@/types/types";
import FinalSummary from "../../logic/dress-up-game/FinalSummary";

export default function Day5Heat({ go }: { go: (id: PageId) => void }) {
  const [results, setResults] = useState<CharacterResult[]>([]);
  const [showFinal, setShowFinal] = useState(false);

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
        {!showFinal && (
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
                img: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dress-up/Joe/Joe.webp",
              },
              {
                name: "Tamara",
                img: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dress-up/Tamara/Tamara.webp",
              },
            ]}
            onCharacterSelected={(char) => {
              console.log("Selected character:", char);
            }}
            onStartGame={() => {
              console.log("start game");
            }}
            onCharacterFinished={(result) => {
              setResults((prev) => {
                const next = [...prev, result];
                if (next.length === 6) {
                  setShowFinal(true);
                }
                return next;
              });
            }}
          />
        )}

        {showFinal && (
          <FinalSummary
            results={results}
            onRestart={() => {
              setResults([]);
              setShowFinal(false);
            }}
          />
        )}
      </div>

      {/* Нижняя навигация */}
     <footer className="quest-footer">
          <div
            className="quest-center ice-button-wrapper"
            style={{ marginTop: "60px" }}
          >
            <div className="ice-button" onClick={() => go("day5_spitsbergen")}>
              {/* льдина */}
              <img
                className="ice"
                src="/quests/assets/buttons/ice-button-bg.svg"
                alt="ice-btn"
              />

              {/* текст */}
              <div className="ice-text">Назад на научную станцию</div>

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
