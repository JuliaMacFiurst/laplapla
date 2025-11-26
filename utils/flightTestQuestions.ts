

export type Question = {
  text: string;
  explanation?: string;
  answers: { text: string; correct: boolean }[];
};

export const flightTestQuestions: Question[] = [
  {
    text: "Как называется самый короткий путь между двумя точками на сфере?",
    answers: [
      { text: "Ортодромия", correct: true },
      { text: "Суперпрямая турбо-линия 3000", correct: false },
      { text: "Маршрут «как пойдёт»", correct: false },
    ],
  },
  {
    text: "Почему на карте Меркатора ортодромия выглядит дугой?",
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

export default flightTestQuestions;