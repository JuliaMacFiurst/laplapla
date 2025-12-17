"use client";

import { useState } from "react";
import type { PageId } from "../../QuestEngine";
import CharacterStage from "../../logic/dress-up-game/CharacterStage";
import type { CharacterResult } from "@/types";
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
