"use client";

import { useEffect, useState } from "react";
import ClothesConveyor, { ClothesItem } from "./ClothesConveyor";
import { loadClothesForCharacter } from "./loadClothesForCharacter";

interface Character {
  name: string;
  img: string;
}

export default function CharacterStage({
  characters,
  onCharacterSelected,
  onStartGame,
}: {
  characters: Character[];
  onCharacterSelected: (char: Character) => void;
  onStartGame: () => void;
}) {
  if (!characters || characters.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          textAlign: "center",
          paddingTop: "40px",
          color: "#fff",
          fontFamily: "Amatic SC",
          fontSize: "32px",
        }}
      >
        Загрузка персонажей…
      </div>
    );
  }

  // TEMPORARY FALLBACK: если персонажи не переданы, показываем Стаса
  const fallbackCharacters: Character[] = [
    {
      name: "Stas",
      img: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dress-up/Stas/Stas.webp",
    },
  ];

  const finalCharacters =
    characters.length > 0 ? characters : fallbackCharacters;

  const [index, setIndex] = useState(0);
  const [canSwitch, setCanSwitch] = useState(false); // активируется после завершения ленты
  const [goodScore, setGoodScore] = useState(0);
  const [badScore, setBadScore] = useState(0);
  const [clothes, setClothes] = useState<ClothesItem[]>([]);

  const [timeLeft, setTimeLeft] = useState(15);
  const [timerRunning, setTimerRunning] = useState(false);
  const [handRotation, setHandRotation] = useState(0);

  const safeIndex = Math.min(index, finalCharacters.length - 1);
  const current = finalCharacters[safeIndex];

  useEffect(() => {
    async function load() {
      const items = await loadClothesForCharacter(current.name);
      setClothes(items);
    }
    load();
  }, [current]);

  useEffect(() => {
    if (!timerRunning) return;
    if (timeLeft <= 0) {
      setTimerRunning(false);
      return;
    }
    const id = setInterval(() => {
      setTimeLeft((t) => t - 1);
      setHandRotation((r) => r + 360 / 15);
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning, timeLeft]);

  function startGame() {
    setTimeLeft(15);
    setTimerRunning(true);
    setCanSwitch(false);
    setGoodScore(0);
    setBadScore(0);

    onStartGame();

    // фиксируем персонажа
    onCharacterSelected(current);
  }

  function nextCharacter() {
    if (!canSwitch) return;

    const next = (index + 1) % finalCharacters.length;
    setIndex(next);

    // сброс состояния
    setTimerRunning(false);
    setTimeLeft(15);
    setGoodScore(0);
    setBadScore(0);
  }

  return (
    <div className="dressup-stage">
      <div className="dressup-content">
        <img
          src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dress-up/Interface/Scoreboard.webp"
          alt="scoreboard"
          className="dressup-scoreboard"
        />
        <div className="dressup-scoreboard-values">
          <div className="good-score">+{goodScore}</div>
          <div className="bad-score">-{Math.abs(badScore)}</div>
        </div>
        <div className="dressup-stopwatch">
          <img
            src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dress-up/Interface/Stopwatch.webp"
            className="stopwatch-bg"
          />
          <img
            src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dress-up/Interface/Stopwatch-hand.webp"
            className="stopwatch-hand"
            style={{ transform: `rotate(${handRotation}deg)` }}
          />
          <div className="stopwatch-digits">{timeLeft}</div>
        </div>

        {/* ПЕРСОНАЖ */}
        <div className="dressup-stage-inner">
          <img
            src={current.img}
            alt={current.name}
            className="dressup-character"
          />
        </div>
        {/* КНОПКА СЛЕДУЮЩЕГО ПЕРСОНАЖА */}
        <button
          onClick={nextCharacter}
          disabled={!canSwitch}
          style={{
            position: "absolute",
            right: "-80px",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "40px",
            background: canSwitch ? "#fff" : "#999",
            opacity: canSwitch ? 1 : 0.4,
            border: "none",
            borderRadius: "50%",
            width: "60px",
            height: "60px",
            cursor: canSwitch ? "pointer" : "default",
          }}
        >
          👉
        </button>

        {/* ЛЕНТА С ОДЕЖДОЙ И КНОПКА СТАРТ */}
        <img
          src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dress-up/Interface/Clothing-distribution-belt.webp"
          alt="clothes belt"
          className="dressup-belt"
        />
        {!timerRunning && (
          <button onClick={startGame} className="dressup-start-btn" />
        )}

        {timerRunning && (
          <ClothesConveyor
            items={clothes}
            speed={1.3}
            onPick={(item) => {
              console.log("Нажали на одежду", item);
              if (item.score > 0) setGoodScore((s) => s + item.score);
              else setBadScore((s) => s + Math.abs(item.score));
            }}
          />
        )}
      </div>
    </div>
  );
}
