

export type StarDialogueStep = {
  id: string;
  speaker: "logan" | "svensen";
  text: string;
  condition:
    | "intro"
    | "click_merak"
    | "click_dubhe"
    | "click_polaris"
    | "wrong_line"
    | "correct_line"
    | "finish";
};

export const starRouteDialogs: StarDialogueStep[] = [
  // INTRO — компас сломался, ищем звёзды
  {
    id: "intro_1",
    speaker: "svensen",
    text: "Логан, я смотрю на небо… и вижу просто россыпь блёсток! Как можно что‑то понять в этом хаосе?",
    condition: "intro"
  },
  {
    id: "intro_2",
    speaker: "logan",
    text: "Это только сначала хаос. Есть звёзды‑подсказки. Они помогут найти север лучше любого компаса.",
    condition: "intro"
  },
  {
    id: "intro_3",
    speaker: "svensen",
    text: "Подсказки? У звёзд есть подсказки?! Покажи, какие именно!",
    condition: "intro"
  },
  {
    id: "intro_4",
    speaker: "logan",
    text: "Иногда достаточно трёх. Найди Мерак и Дубхе на карте звёздного неба и соедини их прямой линией — она укажет направление ⬆️!",
    condition: "intro"
  },

  // КЛИК ПО МЕРАК
  {
    id: "merak_1",
    speaker: "logan",
    text: "Отлично! Мерак — первая указательная звезда. Молодец, ты нашёл её!",
    condition: "click_merak"
  },
  {
    id: "merak_2",
    speaker: "svensen",
    text: "Первая есть! А дальше куда смотреть?",
    condition: "click_merak"
  },

  // КЛИК ПО ДУБХЕ
  {
    id: "dubhe_1",
    speaker: "logan",
    text: "А вот и Дубхе! Теперь соедини её с Мераком — они показывают направление.",
    condition: "click_dubhe"
  },
  {
    id: "dubhe_2",
    speaker: "svensen",
    text: "Соединить… ой, надеюсь, линия не выйдет кривее морского коралла!",
    condition: "click_dubhe"
  },

  // НЕПРАВИЛЬНАЯ ЛИНИЯ
  {
    id: "wrong_1",
    speaker: "logan",
    text: "Посмотри ещё раз — линия должна идти от ковша в сторону Полярной, вниз по карте.",
    condition: "wrong_line"
  },
  {
    id: "wrong_2",
    speaker: "svensen",
    text: "Ай-ай-ай! Значит, я наметила путь к пингвинам… Попробую снова!",
    condition: "wrong_line"
  },

  // ПРАВИЛЬНАЯ ЛИНИЯ
  {
    id: "correct_1",
    speaker: "logan",
    text: "Да! Именно так моряки веками находили север. Линия ведёт прямо к Полярной!",
    condition: "correct_line"
  },
  {
    id: "correct_2",
    speaker: "svensen",
    text: "Значит, Полярная — это главный маяк на небе? Показывает север?",
    condition: "correct_line"
  },

  // КЛИК ПО ПОЛЯРНОЙ
  {
    id: "polaris_1",
    speaker: "logan",
    text: "Вот она — Полярная! Она почти не двигается на небе, как настоящий небесный якорь.",
    condition: "click_polaris"
  },
  {
    id: "polaris_2",
    speaker: "svensen",
    text: "Якорь в небе… вот это красота!",
    condition: "click_polaris"
  },

  // ФИНАЛ
  {
    id: "finish_1",
    speaker: "logan",
    text: "Ты справился! Теперь ты знаешь, как ориентироваться по звёздам — даже если компас танцует ламбаду.",
    condition: "finish"
  },
  {
    id: "finish_2",
    speaker: "svensen",
    text: "Йеее! Теперь я морской пёс со звёздным навигатором!",
    condition: "finish"
  }
];