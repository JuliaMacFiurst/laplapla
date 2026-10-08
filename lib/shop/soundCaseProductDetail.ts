import type { Lang } from "@/i18n";

type ProductDetailCopy = {
  availability: string;
  priceLabel: string;
  heroValue: string;
  whatIsTitle: string;
  whatIsBody: string;
  includedTitle: string;
  includedIntro: string;
  flowTitle: string;
  flow: Array<{ title: string; body: string }>;
  galleryTitle: string;
  galleryIntro: string;
  galleryLabels: string[];
  personalizationTitle: string;
  personalizationBody: string;
  personalizationItems: string[];
  reuseTitle: string;
  reuseBody: string;
  detailsTitle: string;
  details: Array<{ label: string; value: string }>;
  trustTitle: string;
  trustItems: string[];
  sellerLabel: string;
  finalTitle: string;
  finalBody: string;
};

export const SOUND_CASE_PRODUCT_DETAIL_COPY: Record<Lang, ProductDetailCopy> = {
  ru: {
    availability: "Скоро · предзаказ без оплаты",
    priceLabel: "Обычная цена после запуска",
    heroValue: "Готовое групповое приключение, которое становится вашей собственной историей — с именами участников, печатными уликами и интерактивными звуковыми заданиями.",
    whatIsTitle: "Что это за квест?",
    whatIsBody: "Команда расследует загадочный звук, проходит восемь связанных этапов и через игру знакомится с вибрацией, ритмом, звуковыми кодами и поющими песками.",
    includedTitle: "Что входит в Sound Case",
    includedIntro: "Это не одна рабочая страница, а 24-страничный комплект материалов для целого приключения.",
    flowTitle: "Как это работает",
    flow: [
      { title: "Покупка", body: "После запуска — безопасная оплата через PayPal." },
      { title: "Персонализация", body: "Вы выбираете язык и добавляете имена команды." },
      { title: "Печать", body: "Печатаете подготовленные материалы A4 через браузер." },
      { title: "Игра", body: "Команда открывает улики и проходит интерактивные этапы." },
    ],
    galleryTitle: "Настоящие материалы приключения",
    galleryIntro: "Фрагменты карточек, улик и финальных наград, которые уже входят в Sound Case #001.",
    galleryLabels: [
      "Карточка звука из первого этапа",
      "Печатная карточка вибрационного шифра",
      "Эксперимент о поющих дюнах",
      "Коллекционные карточки участников",
    ],
    personalizationTitle: "Сделано для вашей команды",
    personalizationBody: "Не нужно разбираться во внутренних настройках: после покупки конструктор проведёт вас по трём понятным шагам.",
    personalizationItems: [
      "Выберите язык квеста: русский, English или עברית.",
      "Добавьте имя главного участника.",
      "Добавьте до 8 участников команды.",
    ],
    reuseTitle: "Можно вернуться и распечатать снова",
    reuseBody: "Персонализация сохраняется в аккаунте. После покупки можно снова открыть квест, изменить имена и повторно подготовить материалы к печати.",
    detailsTitle: "Практические детали",
    details: [
      { label: "Формат", value: "24 печатные страницы A4 + интерактивные этапы по QR-кодам" },
      { label: "Языки", value: "Русский · English · עברית" },
      { label: "Команда", value: "Главный участник + до 8 участников" },
      { label: "Доступ", value: "Сохраняется в аккаунте для редактирования и повторной печати" },
    ],
    trustTitle: "Покупка без сюрпризов",
    trustItems: [
      "Когда продажи откроются, оплата будет проходить через PayPal.",
      "Доступ к квесту открывается после подтверждённой оплаты.",
      "Купленный квест остаётся доступен в вашем аккаунте.",
    ],
    sellerLabel: "Продавец: אומנצ׳קים",
    finalTitle: "Готовы собрать команду?",
    finalBody: "Сейчас можно записаться на предзаказ. Оплата ещё не открыта.",
  },
  en: {
    availability: "Coming soon · preorder with no payment",
    priceLabel: "Regular price after launch",
    heroValue: "A complete group adventure that becomes your own story—with participant names, printable clues, and interactive sound challenges.",
    whatIsTitle: "What kind of quest is it?",
    whatIsBody: "The team investigates a mysterious sound across eight connected stages, discovering vibration, rhythm, sound codes, and singing sands through play.",
    includedTitle: "What comes with Sound Case",
    includedIntro: "This is not a single worksheet: it is a 24-page set of materials for a complete adventure.",
    flowTitle: "How it works",
    flow: [
      { title: "Buy", body: "After launch, pay securely with PayPal." },
      { title: "Personalize", body: "Choose a language and add your team’s names." },
      { title: "Print", body: "Print the prepared A4 materials from your browser." },
      { title: "Play", body: "Open clues and continue through interactive stages." },
    ],
    galleryTitle: "Real materials from the adventure",
    galleryIntro: "A look at cards, clues, and final rewards already included in Sound Case #001.",
    galleryLabels: [
      "A sound card from the first stage",
      "A printable vibration-code card",
      "The singing-dunes experiment",
      "Personal collectible cards",
    ],
    personalizationTitle: "Made for your team",
    personalizationBody: "There are no complicated settings: after purchase, the builder guides you through three clear choices.",
    personalizationItems: [
      "Choose the quest language: Русский, English, or עברית.",
      "Add the lead participant’s name.",
      "Add up to 8 team participants.",
    ],
    reuseTitle: "Come back and print again",
    reuseBody: "Personalization is saved to your account. After purchase, you can reopen the quest, change names, and prepare the materials for printing again.",
    detailsTitle: "Practical details",
    details: [
      { label: "Format", value: "24 printable A4 pages + QR-linked interactive stages" },
      { label: "Languages", value: "Русский · English · עברית" },
      { label: "Team", value: "Lead participant + up to 8 participants" },
      { label: "Access", value: "Saved to your account for editing and reprinting" },
    ],
    trustTitle: "A purchase you can understand",
    trustItems: [
      "When sales open, payment will be processed through PayPal.",
      "Quest access opens after confirmed payment.",
      "Your purchased quest remains available in your account.",
    ],
    sellerLabel: "Seller: אומנצ׳קים",
    finalTitle: "Ready to gather your team?",
    finalBody: "You can join the preorder now. Payment is not open yet.",
  },
  he: {
    availability: "בקרוב · הרשמה מוקדמת ללא תשלום",
    priceLabel: "המחיר הרגיל לאחר ההשקה",
    heroValue: "הרפתקה קבוצתית שלמה שהופכת לסיפור שלכם — עם שמות המשתתפים, רמזים להדפסה ומשימות צליל אינטראקטיביות.",
    whatIsTitle: "איזו משימה זו?",
    whatIsBody: "הצוות חוקר צליל מסתורי לאורך שמונה שלבים מחוברים ומגלה דרך המשחק רעידות, קצב, קודי צליל וחולות מזמרים.",
    includedTitle: "מה מקבלים ב־Sound Case",
    includedIntro: "זה לא דף עבודה אחד, אלא ערכה בת 24 עמודים להרפתקה שלמה.",
    flowTitle: "איך זה עובד",
    flow: [
      { title: "קנייה", body: "לאחר ההשקה — תשלום מאובטח דרך PayPal." },
      { title: "התאמה אישית", body: "בוחרים שפה ומוסיפים את שמות הצוות." },
      { title: "הדפסה", body: "מדפיסים את חומרי A4 המוכנים דרך הדפדפן." },
      { title: "משחק", body: "פותחים רמזים וממשיכים בשלבים האינטראקטיביים." },
    ],
    galleryTitle: "חומרים אמיתיים מההרפתקה",
    galleryIntro: "הצצה לכרטיסים, לרמזים ולפרסים הסופיים שכבר כלולים ב־Sound Case #001.",
    galleryLabels: [
      "כרטיס צליל מהשלב הראשון",
      "כרטיס קוד רעידות להדפסה",
      "הניסוי על הדיונות המזמרות",
      "כרטיסי אספנות אישיים",
    ],
    personalizationTitle: "נוצר עבור הצוות שלכם",
    personalizationBody: "אין הגדרות מסובכות: לאחר הרכישה, הבונה מוביל אתכם בשלוש בחירות ברורות.",
    personalizationItems: [
      "בוחרים את שפת המשימה: Русский, English או עברית.",
      "מוסיפים את שם המשתתף הראשי.",
      "מוסיפים עד 8 משתתפים לצוות.",
    ],
    reuseTitle: "אפשר לחזור ולהדפיס שוב",
    reuseBody: "ההתאמה האישית נשמרת בחשבון. לאחר הרכישה אפשר לפתוח שוב את המשימה, לשנות שמות ולהכין מחדש את החומרים להדפסה.",
    detailsTitle: "פרטים שימושיים",
    details: [
      { label: "פורמט", value: "24 עמודי A4 להדפסה + שלבים אינטראקטיביים המקושרים בקודי QR" },
      { label: "שפות", value: "Русский · English · עברית" },
      { label: "צוות", value: "משתתף ראשי + עד 8 משתתפים" },
      { label: "גישה", value: "נשמר בחשבון לעריכה ולהדפסה חוזרת" },
    ],
    trustTitle: "רכישה ברורה ורגועה",
    trustItems: [
      "כשהמכירה תיפתח, התשלום יתבצע דרך PayPal.",
      "הגישה למשימה נפתחת לאחר אישור התשלום.",
      "המשימה שנרכשה נשארת זמינה בחשבון שלכם.",
    ],
    sellerLabel: "המוכר: אומנצ׳קים",
    finalTitle: "מוכנים לאסוף את הצוות?",
    finalBody: "כעת אפשר להצטרף להרשמה המוקדמת. התשלום עדיין לא פתוח.",
  },
};
