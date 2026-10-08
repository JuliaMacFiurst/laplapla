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
    title: "Приключения, которые начинаются на бумаге — и продолжаются в игре",
    intro: "Персонализированные печатные квесты соединяют физические карточки и улики со звуком, QR-заданиями и интерактивными этапами LapLapLa.",
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
    title: "Adventures that begin on paper—and continue through play",
    intro: "Personalized printable quests connect physical cards and clues with sound, QR activities, and interactive LapLapLa stages.",
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
    title: "הרפתקאות שמתחילות על הנייר — וממשיכות במשחק",
    intro: "משימות הרפתקה אישיות להדפסה שמחברות כרטיסים ורמזים פיזיים עם צלילים, משימות QR ושלבים אינטראקטיביים של LapLapLa.",
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
