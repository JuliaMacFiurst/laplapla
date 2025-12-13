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
  // const [canSwitch, setCanSwitch] = useState(false); // активируется после завершения ленты
  const [goodScore, setGoodScore] = useState(0);
  const [badScore, setBadScore] = useState(0);
  const [clothes, setClothes] = useState<ClothesItem[]>([]);
  const [dressedItems, setDressedItems] = useState<{ id: string; season: string }[]>([]);

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
    // setCanSwitch(false);
    setGoodScore(0);
    setBadScore(0);
    setDressedItems([]);

    onStartGame();

    // фиксируем персонажа
    onCharacterSelected(current);
  }

  function nextCharacter() {
    // if (!canSwitch) return;

    const next = (index + 1) % finalCharacters.length;
    setIndex(next);

    // сброс состояния
    setTimerRunning(false);
    setTimeLeft(15);
    setGoodScore(0);
    setBadScore(0);
    setDressedItems([]);
  }

  function seasonFromId(id: string): "winter-clothes" | "summer-clothes" | "mid-season" {
    if (id.startsWith("Winter-")) return "winter-clothes";
    if (id.startsWith("Summer-")) return "summer-clothes";
    // default for Mid-season-*
    return "mid-season";
  }

  function handleDrop(itemId: string) {
    console.log("[DressUp][DROP] raw itemId:", itemId);
    if (!itemId) return;

    // Normalize itemId: remove .webp extension and -dressed suffix if present
    let normalizedId = itemId;
    if (normalizedId.endsWith(".webp")) {
      normalizedId = normalizedId.slice(0, -5);
    }
    if (normalizedId.endsWith("-dressed")) {
      normalizedId = normalizedId.slice(0, -8);
    }

    console.log("[DressUp][DROP] normalizedId:", normalizedId);
    console.log("[DressUp][DROP] current character:", current?.name);

    if (dressedItems.some((di) => di.id === normalizedId)) {
      console.log("[DressUp][DROP] already dressed:", normalizedId);
      return;
    }

    const item = clothes.find((c) => c.id === normalizedId);
    console.log("[DressUp][DROP] found item in clothes:", item);

    if (!item) {
      console.warn("[DressUp][DROP] item NOT found in clothes, ignoring drop:", normalizedId);
      return;
    }

    const season = seasonFromId(normalizedId);
    const dressedSrc = `https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dress-up/${current.name}/${season}/${normalizedId}-dressed.webp`;
    console.log("[DressUp][DROP] dressed image src:", dressedSrc);

    if (item.score > 0) {
      setGoodScore((s) => s + item.score);
    } else {
      setBadScore((s) => s + Math.abs(item.score));
    }

    setDressedItems((prev) => [...prev, { id: normalizedId, season }]);
    setClothes((prev) => prev.filter((c) => c.id !== normalizedId));
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
        <div
          className="dressup-stage-inner dressup-dropzone"
          data-testid="dressup-dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const itemId = e.dataTransfer.getData("text/plain");
            handleDrop(itemId);
          }}
        >
          <img
            src={current.img}
            alt={current.name}
            className="dressup-character"
          />
          {dressedItems.map(({ id, season }) => {
            const src = `https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dress-up/${current.name}/${season}/${id}-dressed.webp`;
            console.log("[DressUp][RENDER] dressed item:", id, src);

            return (
              <img
                key={id}
                src={src}
                className={`dressup-clothing dressup-${id}`}
                alt=""
                onLoad={() => console.log("[DressUp][IMG LOADED]", src)}
                onError={() => console.error("[DressUp][IMG ERROR]", src)}
              />
            );
          })}
        </div>
        {/* КНОПКА СЛЕДУЮЩЕГО ПЕРСОНАЖА */}
        {/*
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
        */}

        {/* ЛЕНТА С ОДЕЖДОЙ И КНОПКА СТАРТ */}
        <img
          src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dress-up/Interface/Clothing-distribution-belt.webp"
          alt="clothes belt"
          className="dressup-belt"
        />
        {!timerRunning && (
          <button onClick={startGame} className="dressup-start-btn" />
        )}

        {timerRunning && clothes.length > 0 && (
          <ClothesConveyor
            items={clothes}
            speed={1.3}
          />
        )}
      </div>
    </div>
  );
}
