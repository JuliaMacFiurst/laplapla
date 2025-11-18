import type { PageId } from "../QuestEngine";
import { useState, useRef, useEffect } from "react";

type Question = {
  text: string;
  explanation?: string;
  answers: { text: string; correct: boolean }[];
};

const questions: Question[] = [
  {
    text: "Как называется самый короткий путь между двумя точками на сфере?",
    answers: [
      { text: "Ортодромия", correct: true },
      { text: "Суперпрямая турбо-линия 3000", correct: false },
      { text: "Маршрут «как пойдёт»", correct: false },
    ],
  },
  {
    text:
      "Почему на карте Меркатора ортодромия выглядит дугой?",
    explanation:
      "Карта Меркатора — это когда поверхность Земли разворачивают в прямоугольник. Такое «разворачивание» растягивает линии и прямые превращаются в дуги.",
    answers: [
      { text: "Потому что на сфере кратчайшая линия — дуга большого круга", correct: true },
      { text: "Потому что Меркатор обожал радуги", correct: false },
      { text: "Потому что карта любит загадочность", correct: false },
    ],
  },
  {
    text: "Можно ли применять ортодромию для маршрутов по воде?",
    answers: [
      { text: "Да, корабли тоже ходят по кратчайшим дугам", correct: true },
      { text: "Только если капитан — магистр геодезии и ведьма", correct: false },
      { text: "Нет, вода обижается на такие вычисления", correct: false },
    ],
  },
];

export default function FlightMiniTest({ go }: { go: (id: PageId) => void }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [finished, setFinished] = useState(false);

  const finishRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (finished && finishRef.current) {
      finishRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [finished]);

  const question = questions[current];

  const handleSelect = (index: number) => {
    if (checked) return;
    setSelected(index);
  };

  const handleCheck = () => {
    if (selected === null) return;
    setChecked(true);
  };

  const nextQuestion = () => {
    setSelected(null);
    setChecked(false);
    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      setFinished(true);
    }
  };

  const prevQuestion = () => {
    setSelected(null);
    setChecked(false);
    if (current > 0) {
      setCurrent(current - 1);
    }
  };

  return (
    <div className="flight-mini-test-wrapper">
      <div className="flight-mini-progress">
        <div
          className="flight-mini-progress-bar"
          style={{ width: `${((current + 1) / questions.length) * 100}%` }}
        />
      </div>
      <div className={`flight-mini-test-slide comic-transition`}>
        <h2 className="quest-h2" style={{ textAlign: "center", marginBottom: "15px" }}>
          Вопрос {current + 1} из {questions.length}
        </h2>

        <p className="quest-p" style={{ marginBottom: "10px" }}>{question.text}</p>

        {question.explanation && (
          <p className="quest-p" style={{ opacity: 0.7, fontSize: "18px", marginBottom: "15px" }}>
            {question.explanation}
          </p>
        )}

        <ul className="flight-test-answers">
          {question.answers.map((ans, i) => (
            <li
              key={i}
              className={`flight-test-answer ${
                selected === i ? "selected" : ""
              } ${checked && ans.correct ? "correct" : ""} ${
                checked && selected === i && !ans.correct ? "wrong" : ""
              }`}
              onClick={() => handleSelect(i)}
            >
              {ans.text}
              {checked && ans.correct && <span className="checkmark">✔</span>}
              {checked && selected === i && !ans.correct && <span className="cross">✘</span>}
            </li>
          ))}
        </ul>

        {!checked ? (
          <button className="dialog-next-btn" onClick={handleCheck}>
            Проверить
          </button>
        ) : (
          <button className="dialog-next-btn" onClick={nextQuestion}>
            Дальше ⏭️
          </button>
        )}

        <div className="mini-test-nav">
          <button
            className="nav-btn"
            onClick={prevQuestion}
            disabled={current === 0}
          >
            ⬅
          </button>

          <button
            className="nav-btn"
            onClick={nextQuestion}
            disabled={current === questions.length - 1}
          >
            ➡
          </button>
        </div>
      </div>
      {finished && (
        <div className="flight-mini-finish-screen" ref={finishRef}>
          <h2 className="quest-h2" style={{ textAlign: "center", marginBottom: "20px" }}>
            Ты — будущий пилот! 🚀
          </h2>
          <button
            className="dialog-next-btn"
            onClick={() => go("day4_takeoff")}
          >
            Идём на взлёт!✈️💨 ⏭️
          </button>
        </div>
      )}
    </div>
  );
}
