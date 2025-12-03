

export type StarDialogueStep = {
  id: string;
  speaker: "logan" | "svensen";
  text: string;
  condition:
    | "intro"
    | "first_click"
  | "click_merak"
  | "click_dubhe"
  | "correct_line"
  | "wrong_line"
  | "click_polaris"
  | "finish"
  | `wrong-star:${string}`;
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
    text: "Иногда достаточно трёх. Найди (1) Мерак и (2) Дубхе на карте звёздного неба и соедини их прямой линией — она укажет направление ⬆️!",
    condition: "intro"
  },

  // ОШИБКИ ПРИ ПОИСКЕ МЕРАКА
  {
    id: "wrong_merak_no_id",
    speaker: "logan",
    text: "Найди на карте звезду, которая называется Мерак, и кликни по ней.",
    condition: "wrong-star:merak_no_id"
  },
  {
    id: "wrong_merak_wrong_id",
    speaker: "logan",
    text: "Это #id, а мы ищем Мерак. Попробуй ещё раз!",
    condition: "wrong-star:merak_wrong_id"
  },

  // ОШИБКИ ПРИ ПОИСКЕ ДУБХЕ
  {
    id: "wrong_dubhe_no_id",
    speaker: "logan",
    text: "Найди на карте звезду, которая называется Дубхе и кликни по ней.",
    condition: "wrong-star:dubhe_no_id"
  },
  {
    id: "wrong_dubhe_wrong_id",
    speaker: "logan",
    text: "Это #id, а мы ищем Дубхе, попробуй ещё раз.",
    condition: "wrong-star:dubhe_wrong_id"
  },

  // КЛИК ПО МЕРАК
  {
    id: "merak_1",
    speaker: "logan",
    text: "Отлично! Мерак — первая указательная звезда. Молодец! Теперь найди звезду под названием Дубхе.",
    condition: "click_merak"
  },

  // КЛИК ПО ДУБХЕ
  {
    id: "dubhe_1",
    speaker: "logan",
    text: "А вот и Дубхе! Теперь мы соединим её линией с Мераком — они показывают направление к Полярной Звезде. Продолжи рисовать прямую линию вниз и посмотри, куда она ведёт.",
    condition: "click_dubhe"
  },

  // НЕПРАВИЛЬНАЯ ЛИНИЯ
  {
    id: "wrong_1",
    speaker: "logan",
    text: "Посмотри ещё раз — линия должна идти от ковша в сторону Полярной, вниз по карте.",
    condition: "wrong_line"
  },

  // КЛИК ПО ПОЛЯРНОЙ
  {
    id: "polaris_1",
    speaker: "logan",
    text: "Вот она — Полярная! Она почти не двигается на небе, как настоящий небесный якорь.",
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