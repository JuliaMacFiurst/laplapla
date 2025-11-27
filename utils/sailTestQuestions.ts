export type SeaTestQuestion = {
  text: string;
  explanation?: string;
  answers: { text: string; correct: boolean }[];
};

export const seaTestQuestions: SeaTestQuestion[] = [
  {
    text: "Почему северные маршруты часто меняются?",
    answers: [
      { text: "Потому что лёд двигается и перекрывает пути", correct: true },
      { text: "Потому что море каждый день играет в тетрис", correct: false },
      { text: "Потому что капитаны соревнуются, кто запутается первым", correct: false }
    ]
  },
  {
    text: "Почему моряки иногда выбирают путь длиннее прямой?",
    answers: [
      { text: "Потому что течение ускоряет корабль", correct: true },
      { text: "Потому что компас просит разнообразия", correct: false },
      { text: "Потому что прямые линии слишком скучные", correct: false }
    ]
  },
  {
    text: "Всегда ли безопаснее держаться ближе к берегу?",
    answers: [
      { text: "Нет, в сильные шторма дальше от берега волны предсказуемее", correct: true },
      { text: "Да, берег отпугивает волны своим суровым видом", correct: false },
      { text: "Да, потому что чайки помогают ориентироваться", correct: false }
    ]
  },
  {
    text: "Почему два маршрута в одно место могут отличаться?",
    answers: [
      { text: "Потому что условия на море меняются и капитан выбирает лучший путь", correct: true },
      { text: "Потому что море любит неожиданные повороты сюжета", correct: false },
      { text: "Потому что корабль ищет приключения", correct: false }
    ]
  }
];

export default seaTestQuestions;