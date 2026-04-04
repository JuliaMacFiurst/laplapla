import type { Lang } from "@/i18n";

export type QuestQuestion = {
  text: string;
  explanation?: string;
  answers: { text: string; correct: boolean }[];
};

const flightQuestions: Record<Lang, QuestQuestion[]> = {
  ru: [
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
        "Карта Меркатора разворачивает поверхность Земли в прямоугольник. Из-за этого кратчайшие линии выглядят не прямыми, а изогнутыми.",
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
  ],
  en: [
    {
      text: "What is the shortest path between two points on a sphere called?",
      answers: [
        { text: "Orthodrome", correct: true },
        { text: "Super turbo straight line 3000", correct: false },
        { text: "A 'let’s just see' route", correct: false },
      ],
    },
    {
      text: "Why does an orthodrome look curved on a Mercator map?",
      explanation:
        "A Mercator map unwraps Earth into a rectangle. Because of that, the shortest routes no longer look straight.",
      answers: [
        { text: "Because on a sphere the shortest route is a great-circle arc", correct: true },
        { text: "Because Mercator loved rainbows", correct: false },
        { text: "Because maps enjoy being mysterious", correct: false },
      ],
    },
    {
      text: "Can orthodromes be used for sea routes too?",
      answers: [
        { text: "Yes, ships also travel along the shortest arcs", correct: true },
        { text: "Only if the captain is both a geodesist and a witch", correct: false },
        { text: "No, water gets offended by such calculations", correct: false },
      ],
    },
  ],
  he: [
    {
      text: "איך נקרא המסלול הקצר ביותר בין שתי נקודות על כדור?",
      answers: [
        { text: "אורתודרומיה", correct: true },
        { text: "קו סופר-ישר טורבו 3000", correct: false },
        { text: "מסלול 'נראה מה יקרה'", correct: false },
      ],
    },
    {
      text: "למה אורתודרומיה נראית כמו קשת במפת מרקטור?",
      explanation:
        "מפת מרקטור פורשת את כדור הארץ למלבן. בגלל זה המסלול הקצר ביותר כבר לא נראה ישר.",
      answers: [
        { text: "כי על כדור המסלול הקצר ביותר הוא קשת של מעגל גדול", correct: true },
        { text: "כי מרקטור אהב קשתות בענן", correct: false },
        { text: "כי מפות אוהבות מסתורין", correct: false },
      ],
    },
    {
      text: "האם אפשר להשתמש באורתודרומיה גם במסלולי ים?",
      answers: [
        { text: "כן, גם ספינות נעות לאורך הקשתות הקצרות ביותר", correct: true },
        { text: "רק אם הקפטן הוא גם גאודזיסט וגם מכשף", correct: false },
        { text: "לא, הים נעלב מחישובים כאלה", correct: false },
      ],
    },
  ],
};

const sailQuestions: Record<Lang, QuestQuestion[]> = {
  ru: [
    {
      text: "Почему северные маршруты часто меняются?",
      answers: [
        { text: "Потому что лёд двигается и перекрывает пути", correct: true },
        { text: "Потому что море каждый день играет в тетрис", correct: false },
        { text: "Потому что капитаны соревнуются, кто запутается первым", correct: false },
      ],
    },
    {
      text: "Почему моряки иногда выбирают путь длиннее прямой?",
      answers: [
        { text: "Потому что течение ускоряет корабль", correct: true },
        { text: "Потому что компас просит разнообразия", correct: false },
        { text: "Потому что прямые линии слишком скучные", correct: false },
      ],
    },
    {
      text: "Всегда ли безопаснее держаться ближе к берегу?",
      answers: [
        { text: "Нет, в сильные шторма дальше от берега волны предсказуемее", correct: true },
        { text: "Да, берег отпугивает волны своим суровым видом", correct: false },
        { text: "Да, потому что чайки помогают ориентироваться", correct: false },
      ],
    },
    {
      text: "Почему два маршрута в одно место могут отличаться?",
      answers: [
        { text: "Потому что условия на море меняются и капитан выбирает лучший путь", correct: true },
        { text: "Потому что море любит неожиданные повороты сюжета", correct: false },
        { text: "Потому что корабль ищет приключения", correct: false },
      ],
    },
  ],
  en: [
    {
      text: "Why do northern routes often change?",
      answers: [
        { text: "Because ice moves and blocks the paths", correct: true },
        { text: "Because the sea plays Tetris every day", correct: false },
        { text: "Because captains compete to see who gets lost first", correct: false },
      ],
    },
    {
      text: "Why do sailors sometimes choose a route longer than a straight line?",
      answers: [
        { text: "Because a current can make the ship faster", correct: true },
        { text: "Because the compass wants variety", correct: false },
        { text: "Because straight lines are too boring", correct: false },
      ],
    },
    {
      text: "Is it always safer to stay close to shore?",
      answers: [
        { text: "No, in strong storms waves can be more predictable farther from shore", correct: true },
        { text: "Yes, the shore scares the waves away", correct: false },
        { text: "Yes, because seagulls help with navigation", correct: false },
      ],
    },
    {
      text: "Why can two routes to the same place be different?",
      answers: [
        { text: "Because sea conditions change and the captain chooses the best route", correct: true },
        { text: "Because the sea loves plot twists", correct: false },
        { text: "Because the ship is looking for adventure", correct: false },
      ],
    },
  ],
  he: [
    {
      text: "למה מסלולים צפוניים משתנים לעיתים קרובות?",
      answers: [
        { text: "כי הקרח נע וחוסם את הנתיבים", correct: true },
        { text: "כי הים משחק טטריס כל יום", correct: false },
        { text: "כי הקברניטים מתחרים מי ילך לאיבוד ראשון", correct: false },
      ],
    },
    {
      text: "למה מלחים לפעמים בוחרים מסלול ארוך יותר מקו ישר?",
      answers: [
        { text: "כי זרם יכול להאיץ את הספינה", correct: true },
        { text: "כי המצפן מבקש גיוון", correct: false },
        { text: "כי קווים ישרים משעממים מדי", correct: false },
      ],
    },
    {
      text: "האם תמיד בטוח יותר להישאר קרוב לחוף?",
      answers: [
        { text: "לא, בסערות חזקות הגלים יכולים להיות צפויים יותר דווקא רחוק מהחוף", correct: true },
        { text: "כן, החוף מפחיד את הגלים", correct: false },
        { text: "כן, כי שחפים עוזרים בניווט", correct: false },
      ],
    },
    {
      text: "למה שני מסלולים לאותו מקום יכולים להיות שונים?",
      answers: [
        { text: "כי תנאי הים משתנים והקפטן בוחר את הדרך הטובה ביותר", correct: true },
        { text: "כי הים אוהב תפניות מפתיעות", correct: false },
        { text: "כי הספינה מחפשת הרפתקאות", correct: false },
      ],
    },
  ],
};

export function getFlightQuestions(lang: Lang) {
  return flightQuestions[lang] ?? flightQuestions.ru;
}

export function getSailQuestions(lang: Lang) {
  return sailQuestions[lang] ?? sailQuestions.ru;
}
