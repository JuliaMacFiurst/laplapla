"use client";

import { useEffect, useState } from "react";

interface Character {
  name: string;
  img: string;
}

export default function CharacterStage({
  characters,
  onCharacterSelected,
  onStartGame
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
          fontSize: "32px"
        }}
      >
        Загрузка персонажей…
      </div>
    );
  }

  // TEMPORARY FALLBACK: если персонажи не переданы, показываем Стаса
  const fallbackCharacters: Character[] = [
    { name: "Stas", img: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dress-up/Stas/Stas.webp" }
  ];

  const finalCharacters = characters.length > 0 ? characters : fallbackCharacters;

  const [index, setIndex] = useState(0);
  const [canSwitch, setCanSwitch] = useState(false); // активируется после завершения ленты
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);

  const safeIndex = Math.min(index, finalCharacters.length - 1);
  const current = finalCharacters[safeIndex];

  // запуск секундомера
  useEffect(() => {
    let id: NodeJS.Timeout | null = null;

    if (running) {
      id = setInterval(() => setTimer((t) => t + 1), 1000);
    }

    return () => {
      if (id) clearInterval(id);
    };
  }, [running]);

  function formatTime(sec: number) {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function startGame() {
    setRunning(true);
    setCanSwitch(false);
    setTimer(0);
    setScore(0);

    onStartGame();

    // фиксируем персонажа
    onCharacterSelected(current);
  }

  function nextCharacter() {
    if (!canSwitch) return;

    const next = (index + 1) % finalCharacters.length;
    setIndex(next);

    // сброс состояния
    setRunning(false);
    setTimer(0);
    setScore(0);
  }

  return (
    <div
      style={{
        width: "100%",
        textAlign: "center",
        paddingTop: "20px",
        color: "#fff",
        fontFamily: "Amatic SC",
        position: "relative"
      }}
    >
      {/* ВЕРХНЯЯ ПАНЕЛЬ — таймер + очки */}
      <div
        style={{
          fontSize: "32px",
          display: "flex",
          justifyContent: "center",
          gap: "40px",
          marginBottom: "20px"
        }}
      >
        <div>⏱ {formatTime(timer)}</div>
        <div>⭐ {score}</div>
      </div>

      {/* СЦЕНА */}
      <div
        style={{
          position: "relative",
          width: "340px",
          margin: "0 auto"
        }}
      >
        {/* ПОДИУМ */}
        <div
          style={{
            width: "320px",
            height: "120px",
            background: "radial-gradient(ellipse, #444 0%, #111 80%)",
            borderRadius: "50%",
            margin: "0 auto",
            marginBottom: "10px",
            filter: "drop-shadow(0 0 10px #000)"
          }}
        />

        {/* ПЕРСОНАЖ */}
        <img
          src={current.img}
          alt={current.name}
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "260px",
            height: "auto",
            userSelect: "none",
            pointerEvents: "none",
            filter: running ? "drop-shadow(0 0 12px rgba(255,255,255,0.4))" : "none"
          }}
        />

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
            cursor: canSwitch ? "pointer" : "default"
          }}
        >
          👉
        </button>
      </div>

      {/* ЛЕНТА С ОДЕЖДОЙ И КНОПКА СТАРТ */}
      {!running && (
        <button
          onClick={startGame}
          style={{
            fontSize: "32px",
            marginTop: "30px",
            padding: "10px 40px",
            background: "#47d4ff",
            border: "none",
            borderRadius: "16px",
            cursor: "pointer",
            color: "#00232f",
            fontWeight: "bold",
            boxShadow: "0 4px 10px rgba(0,0,0,0.4)"
          }}
        >
          ▶️ Старт
        </button>
      )}

      {running && (
        <div
          style={{
            width: "100%",
            height: "140px",
            background: "rgba(0,0,0,0.3)",
            marginTop: "20px",
            overflow: "hidden",
            borderTop: "3px solid rgba(255,255,255,0.2)"
          }}
        >
          {/* сюда позже подключим ClothesConveyor */}
          <p style={{ marginTop: "50px", opacity: 0.6 }}>
            🔧 Лента одежды скоро заработает…
          </p>
        </div>
      )}
    </div>
  );
}