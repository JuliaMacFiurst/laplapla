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
  directionsTitle: string;
  howTitle: string;
  howSteps: [string, string, string];
};

export const SHOP_STOREFRONT_COPY: Record<Lang, ShopStorefrontCopy> = {
  ru: {
    eyebrow: "LapLapLa Shop",
    title: "Приключения, которые начинаются дома",
    intro: "Интерактивные квесты, игры и приключения для печати. Исследуйте необычные явления, разгадывайте загадки и играйте вместе.",
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
    directionsTitle: "Куда отправимся?",
    howTitle: "Как это работает",
    howSteps: ["Выберите приключение", "Играйте онлайн или подготовьте материалы для печати", "Разгадывайте, экспериментируйте и проходите задания"],
  },
  en: {
    eyebrow: "LapLapLa Shop",
    title: "Adventures that begin at home",
    intro: "Interactive quests, games, and printable adventures. Explore surprising discoveries, solve mysteries, and play together.",
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
    directionsTitle: "Choose your direction",
    howTitle: "How it works",
    howSteps: ["Choose an adventure", "Play online or prepare printable materials", "Solve puzzles, experiment, and complete the challenges"],
  },
  he: {
    eyebrow: "LapLapLa Shop",
    title: "הרפתקאות שמתחילות בבית",
    intro: "משימות הרפתקה אינטראקטיביות, משחקים והרפתקאות להדפסה. מגלים תופעות מפתיעות, פותרים תעלומות ומשחקים יחד.",
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
    directionsTitle: "לאן יוצאים?",
    howTitle: "איך זה עובד",
    howSteps: ["בוחרים הרפתקה", "משחקים אונליין או מכינים חומרים להדפסה", "פותרים חידות, מתנסים ומשלימים משימות"],
  },
};
