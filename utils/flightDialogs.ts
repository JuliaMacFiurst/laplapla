export type DialogueStep = {
  id: string;
  speaker: "roland" | "logan";
  text: string;
  condition: "straight" | "arc" | "zigzag" | "afterCorrect";
};

export const flightRouteDialogs: DialogueStep[] = [
  // ------------------------
  // ПРЯМАЯ
  // ------------------------
  {
    id: "straight_1",
    speaker: "logan",
    text: "Ты провёл прямую линию. Выглядит красиво… но так будет дольше!",
    condition: "straight"
  },
  {
    id: "straight_2",
    speaker: "roland",
    text: "Это совершенно нелогично! Прямой путь всегда самый быстрый!",
    condition: "straight"
  },
  {
    id: "straight_3",
    speaker: "logan",
    text: "Только если Земля — лист бумаги. Но она круглая! На шарике прямые превращаются в дуги.",
    condition: "straight"
  },
  {
    id: "straight_4",
    speaker: "roland",
    text: "То есть… “у-прямая линия” не хочет гнуться и не огибает землю по-дуге?",
    condition: "straight"
  },
  {
    id: "straight_5",
    speaker: "logan",
    text: "Верно! А ещё эта прямая называется локсодромия — линия, которая упрямо идёт под одним углом. Удобная, но НЕ самая короткая.",
    condition: "straight"
  },

  // ------------------------
  // ДУГА
  // ------------------------
  {
    id: "arc_1",
    speaker: "roland",
    text: "Вот это уже похоже на настоящий авиамаршрут.",
    condition: "arc"
  },
  {
    id: "arc_2",
    speaker: "logan",
    text: "Это ортодромия — коротчайший путь по круглой Земле!",
    condition: "arc"
  },
  {
    id: "arc_3",
    speaker: "roland",
    text: "Кривая, но быстрая. Как будто Земля сама говорит:«Иди по дуге — я же круглая!»",
    condition: "arc"
  },

  // ------------------------
  // ЗИГЗАГ
  // ------------------------
  {
    id: "zigzag_1",
    speaker: "logan",
    text: "Ух ты! Маршрут для самолёта в котором сломался навигатор и приходится спрашивать дорогу, приземляясь в аэропортах!",
    condition: "zigzag"
  },
  {
    id: "zigzag_2",
    speaker: "roland",
    text: "Зигзаг хорош, если хочешь лететь три года…",
    condition: "zigzag"
  },
  {
    id: "zigzag_3",
    speaker: "logan",
    text: "Но если хочешь добраться быстро — выбирай дугу!",
    condition: "zigzag"
  },

  // ------------------------
  // ПОСЛЕ ПРАВИЛЬНОГО ВЫБОРА (АРКА)
  // ------------------------
  {
    id: "afterCorrect_1",
    speaker: "logan",
    text: "Ты выбрал самый быстрый путь для самолёта!",
    condition: "afterCorrect"
  },
  {
    id: "afterCorrect_2",
    speaker: "roland",
    text: "Теперь мы готовы поделиться с тобой нашими секретами.",
    condition: "afterCorrect"
  },
  {
    id: "afterCorrect_3",
    speaker: "logan",
    text: "Жми на штурвалы под нами, чтобы узнать больше!",
    condition: "afterCorrect"
  }
];