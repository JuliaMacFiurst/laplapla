import type { Lang } from "@/i18n";

type ShopStorefrontCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  featuredLabel: string;
  productValue: string;
  priceLabel: string;
  ageLabel: string;
  durationLabel: string;
  languagesLabel: string;
  formatLabel: string;
  formatValue: string;
  availability: string;
  detailsAction: string;
};

export const SHOP_STOREFRONT_COPY: Record<Lang, ShopStorefrontCopy> = {
  ru: {
    eyebrow: "LapLapLa Shop",
    title: "Мир полон загадок. Пора их разгадать!",
    intro: "Почему пески умеют петь? Что скрывает арктическое семенохранилище? Интерактивные квесты LapLapLa превращают удивительные научные факты в приключения с головоломками, экспериментами и мини-играми. Играйте онлайн или отправляйтесь в приключение с печатными заданиями.",
    featuredLabel: "Первое приключение",
    productValue: "Расследование тайны поющих песков: восемь этапов, имена вашей команды, печатные материалы и звуковые задания.",
    priceLabel: "Обычная цена после запуска",
    ageLabel: "Возраст",
    durationLabel: "Игра",
    languagesLabel: "Языки",
    formatLabel: "Формат",
    formatValue: "Персонализированный печатный квест + интерактивные этапы",
    availability: "Скоро · сейчас доступен предзаказ без оплаты",
    detailsAction: "Посмотреть Sound Case",
  },
  en: {
    eyebrow: "LapLapLa Shop",
    title: "The World Is Full of Mysteries. Let's Solve Them!",
    intro: "Why do sand dunes sing? What secrets does the Arctic Seed Vault hold? LapLapLa's interactive quests turn surprising scientific facts into adventures filled with puzzles, experiments, and mini-games. Play online or take your adventure further with printable activities.",
    featuredLabel: "The first adventure",
    productValue: "Investigate the mystery of singing sands across eight stages with your team’s names, printable materials, and sound challenges.",
    priceLabel: "Regular price after launch",
    ageLabel: "Age",
    durationLabel: "Play time",
    languagesLabel: "Languages",
    formatLabel: "Format",
    formatValue: "Personalized printable quest + interactive stages",
    availability: "Coming soon · preorder now with no payment",
    detailsAction: "Explore Sound Case",
  },
  he: {
    eyebrow: "LapLapLa Shop",
    title: "העולם מלא תעלומות. הגיע הזמן לפתור אותן!",
    intro: "למה דיונות חול שרות? אילו סודות מסתתרים בכספת הזרעים הארקטית? הקווסטים האינטראקטיביים של LapLapLa הופכים עובדות מדעיות מפתיעות להרפתקאות עם חידות, ניסויים ומשחקונים. אפשר לשחק אונליין או להמשיך את ההרפתקה עם פעילויות להדפסה.",
    featuredLabel: "ההרפתקה הראשונה",
    productValue: "חוקרים את תעלומת החולות המזמרים בשמונה שלבים, עם שמות הצוות שלכם, חומרים להדפסה ומשימות צליל.",
    priceLabel: "המחיר הרגיל לאחר ההשקה",
    ageLabel: "גיל",
    durationLabel: "משך המשחק",
    languagesLabel: "שפות",
    formatLabel: "פורמט",
    formatValue: "משימת הרפתקה אישית להדפסה + שלבים אינטראקטיביים",
    availability: "בקרוב · כעת אפשר להירשם מראש ללא תשלום",
    detailsAction: "לגלות את Sound Case",
  },
};
