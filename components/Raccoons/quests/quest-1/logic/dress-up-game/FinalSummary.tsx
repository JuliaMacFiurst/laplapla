"use client";

import { CharacterResult, DressedItem } from "@/types/types";

export default function FinalSummary({
  results,
  onRestart,
}: {
  results: CharacterResult[];
  onRestart: () => void;
}) {
  return (
    <div className="final-summary-stage">
      {/* HEADER: общий счёт */}
      <div className="final-summary-header">
        <div className="final-summary-total-score">
          ⭐{" "}
          {results.reduce((sum, r) => sum + (r.goodScore - r.badScore), 0)} /{" "}
          {results.reduce((sum, r) => sum + r.maxScore, 0)}
        </div>
      </div>

      {/* СЛОТЫ ПЕРСОНАЖЕЙ (1–6) */}
      <div className="final-summary-characters">
        {results.map((result, index) => (
          <div
            key={result.character.name}
            className={`final-summary-slot final-summary-slot-${index + 1}`}
          >
            <div className="final-summary-avatar">
              {/* БАЗОВЫЙ ПЕРСОНАЖ */}
              <img
                src={result.character.img}
                alt={result.character.name}
                className="final-summary-base"
              />

              {/* НАДЕТАЯ ОДЕЖДА */}
              {result.dressedItems.map((item: DressedItem) => {
                const src = `https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dress-up/${result.character.name}/${item.season}/${item.id}-dressed.webp`;

                return (
                  <img
                    key={item.id}
                    src={src}
                    alt=""
                    className="final-summary-dressed-layer"
                  />
                );
              })}
            </div>

            {/* СЧЁТ ПЕРСОНАЖА */}
            <div className="final-summary-character-score">
              ⭐ {result.goodScore - result.badScore} / {result.maxScore}
            </div>
          </div>
        ))}
      </div>

      {/* РЕСТАРТ */}
      <button className="final-summary-restart-btn" onClick={onRestart}>
        Играть ещё раз
      </button>
    </div>
  );
}