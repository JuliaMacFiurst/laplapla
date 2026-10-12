export type StarLocale = "ru" | "en" | "he";

export type StarInfo = {
  id: string;
  name: {
    ru: string;
    en: string;
    he: string;
  };
  description: {
    ru: string;
    en: string;
    he: string;
  };
};

export const starInfoList: StarInfo[] = [
  {
    id: "Grumium",
    name: {
      ru: "Грумиум",
      en: "Grumium",
      he: "גרומיום",
    },
    description: {
      ru: "Грумиум — яркая звезда хвоста созвездия Дракона; раньше служила точкой ориентации для северных мореходов.",
      en: "Grumium is a bright star in the tail of the Draco constellation; it formerly served as an orientation point for northern seafarers.",
      he: "גרומיום הוא כוכב בהיר בזנב קבוצת הכוכבים דרקון; בעבר שימש כנקודת התמצאות ליורדי ים צפוניים.",
    },
  },
  {
    id: "Cepheus",
    name: {
      ru: "Цефей",
      en: "Cepheus",
      he: "קפאוס",
    },
    description: {
      ru: "Цефей — созвездие, похожее на дом; его ‘крыша’ помогает искать Полярную звезду в северных широтах.",
      en: "Cepheus is a constellation that resembles a house; its 'roof' helps find Polaris in northern latitudes.",
      he: "קפאוס היא קבוצת כוכבים המזכירה בית; ה'גג' שלה עוזר למצוא את כוכב הצפון בקווי הרוחב הצפוניים.",
    },
  },
  {
    id: "bootes",
    name: {
      ru: "Волопас",
      en: "Boötes",
      he: "רועה דובים",
    },
    description: {
      ru: "Волопас — созвездие с яркой звездой Арктуром. Мореходы использовали его для определения приближения весенних ветров.",
      en: "Boötes is a constellation featuring the bright star Arcturus. Seafarers used it to determine the approach of spring winds.",
      he: "רועה דובים היא קבוצת כוכבים בעלת הכוכב הבהיר ארקטורוס. יורדי ים נעזרו בה כדי לזהות את בואן של רוחות האביב.",
    },
  },
  {
    id: "Alfirk",
    name: {
      ru: "Альфирк",
      en: "Alfirk",
      he: "אלפירק",
    },
    description: {
      ru: "Альфирк — звезда в созвездии Цефея; в древности по ней сверяли направление на северо‑восток.",
      en: "Alfirk is a star in the constellation Cepheus; in ancient times, the northeast direction was checked by it.",
      he: "אלפירק הוא כוכב בקבוצת קפאוס; בעת העתיקה נעזרו בו כדי לוודא את הכיוון לצפון-מזרח.",
    },
  },
  {
    id: "Lira",
    name: {
      ru: "Лира",
      en: "Lyra",
      he: "נבל",
    },
    description: {
      ru: "Лира — маленькое, но яркое созвездие с Вегой. Вега использовалась как летний ориентир на ночном небе.",
      en: "Lyra is a small but bright constellation featuring Vega. Vega was used as a summer landmark in the night sky.",
      he: "נבל היא קבוצת כוכבים קטנה אך בולטת שבה נמצא וגה. וגה שימש כנקודת ציון קיצית בשמי הלילה.",
    },
  },
  {
    id: "Sadalmelik",
    name: {
      ru: "Садальмелик",
      en: "Sadalmelik",
      he: "סעד אל-מליכ",
    },
    description: {
      ru: "Садальмелик — звезда созвездия Водолея. Арабы называли её «Счастливый», и по ней определяли наступление сезона дождей.",
      en: "Sadalmelik is a star in the constellation Aquarius. The Arabs called it 'the lucky one,' and the onset of the rainy season was determined by it.",
      he: "סעד אל-מליכ הוא כוכב בקבוצת דלי. הערבים כינו אותו 'בר-המזל', ובעזרתו קבעו את תחילת עונת הגשמים.",
    },
  },
  {
    id: "Aquila",
    name: {
      ru: "Орел",
      en: "Aquila",
      he: "נשר",
    },
    description: {
      ru: "Aquila (Орел) — созвездие с яркой звездой Альтаиром, которое помогает ориентироваться южнее Полярной.",
      en: "Aquila (Eagle) is a constellation with the bright star Altair that helps navigate south of Polaris.",
      he: "נשר (אקווילה) היא קבוצת כוכבים בעלת הכוכב הבהיר אלתאיר, המסייעת להתמצא מדרום לכוכב הצפון.",
    },
  },
  {
    id: "Dubhe",
    name: {
      ru: "Дубхе",
      en: "Dubhe",
      he: "דובהה",
    },
    description: {
      ru: "Дубхе — звезда-указатель на краю ковша Большой Медведицы. Линия от Мерака через Дубхе ведёт к Полярной звезде.",
      en: "Dubhe is a pointer star on the edge of the Big Dipper. The line from Merak through Dubhe leads to Polaris.",
      he: "דובהה הוא כוכב מצביע בקצה הסיר של הדובה הגדולה. הקו ממראק דרך דובהה מוביל לכוכב הצפון.",
    },
  },
  {
    id: "Merak-Star",
    name: {
      ru: "Мерак",
      en: "Merak",
      he: "מראק",
    },
    description: {
      ru: "Мерак — ‘указательная звезда’ ковша Большой Медведицы; линия от Мерака к Дубхе указывает на Полярную.",
      en: "Merak is a 'pointer star' of the Big Dipper bowl; the line from Merak to Dubhe points to Polaris.",
      he: "מראק הוא 'כוכב מצביע' בסיר של הדובה הגדולה; קו ממראק לדובהה מצביע על כוכב הצפון.",
    },
  },
  {
    id: "Fekda",
    name: {
      ru: "Фекда",
      en: "Phecda",
      he: "פקדה",
    },
    description: {
      ru: "Фекда — одна из звёзд ковша Большой Медведицы; использовалась мореходами для оценки широты северных маршрутов.",
      en: "Phecda is one of the stars in the Big Dipper bowl; it was used by seafarers to estimate the latitude of northern routes.",
      he: "פקדה הוא אחד מכוכבי הסיר של הדובה הגדולה; יורדי ים נעזרו בו להערכת קו הרוחב במסלולים צפוניים.",
    },
  },
  {
    id: "Megrez",
    name: {
      ru: "Мегрец",
      en: "Megrez",
      he: "מגרז",
    },
    description: {
      ru: "Мегрец — звезда ручки Большой Медведицы; по ней моряки определяли положение ковша на небе весной.",
      en: "Megrez is a star in the Big Dipper handle; sailors used it to determine the position of the dipper in the sky in spring.",
      he: "מגרז הוא כוכב בידית הדובה הגדולה; בעזרתו קבעו מלחים את מיקום הסיר בשמי האביב.",
    },
  },
  {
    id: "Muscida",
    name: {
      ru: "Мусцида",
      en: "Muscida",
      he: "מוסקידה",
    },
    description: {
      ru: "Мусцида — звезда в созвездии Большой Медведицы. Использовалась как дополнительная точка для проверки направления на север.",
      en: "Muscida is a star in the constellation Ursa Major. It was used as an additional point to verify the direction north.",
      he: "מוסקידה הוא כוכב בקבוצת הדובה הגדולה. הוא שימש כנקודה נוספת לאימות הכיוון צפונה.",
    },
  },
  {
    id: "Kochab",
    name: {
      ru: "Кохаб",
      en: "Kochab",
      he: "כוכאב",
    },
    description: {
      ru: "Кохаб — одна из полярных звёзд прошлого. До нашей Полярной моряки ориентировались именно по Кохабу.",
      en: "Kochab is one of the pole stars of the past. Before our Polaris, sailors navigated by Kochab.",
      he: "כוכאב הוא אחד מכוכבי הקוטב של העבר. לפני כוכב הצפון הנוכחי, יורדי ים ניווטו דווקא לפיו.",
    },
  },
  {
    id: "aquila",
    name: {
      ru: "Орел",
      en: "Aquila",
      he: "נשר",
    },
    description: {
      ru: "Орел — созвездие с яркой звездой Альтаиром, хорошо заметной в южной части северного неба.",
      en: "Aquila is a constellation with the bright star Altair, clearly visible in the southern part of the northern sky.",
      he: "נשר היא קבוצת כוכבים עם הכוכב הבהיר אלתאיר, הבולט היטב בחלק הדרומי של שמי הצפון.",
    },
  },
  {
    id: "Elnath",
    name: {
      ru: "Эль-Нат",
      en: "Elnath",
      he: "אל-נאת",
    },
    description: {
      ru: "Эль-Нат — яркая звезда созвездий Телец и Возничий; по ней определяли зимнее ночное направление.",
      en: "Elnath is a bright star in the constellations Taurus and Auriga; it was used to determine the winter nighttime direction.",
      he: "אל-נאת הוא כוכב בהיר בקבוצות שור ועגלון; בעזרתו קבעו את כיוון התנועה בלילות החורף.",
    },
  },
  {
    id: "Cygnis",
    name: {
      ru: "Лебедь",
      en: "Cygnus",
      he: "ברבור",
    },
    description: {
      ru: "Лебедь — созвездие с яркой звездой Денеб. Мореплаватели ориентировались по его характерному 'кресту'.",
      en: "Cygnus is a constellation with the bright star Deneb. Navigators oriented themselves by its distinctive 'cross'.",
      he: "ברבור היא קבוצת כוכבים בעלת הכוכב הבהיר דנב. יורדי ים התמצאו לפיה בזכות ה'צלב' המאפיין אותה.",
    },
  },
  {
    id: "Pisces",
    name: {
      ru: "Рыбы",
      en: "Pisces",
      he: "דגים",
    },
    description: {
      ru: "Рыбы — созвездие осени; использовалось в древности для обозначения наступления холодного сезона.",
      en: "Pisces is an autumn constellation; in ancient times it was used to mark the arrival of the cold season.",
      he: "דגים היא קבוצת כוכבים של הסתיו; בעת העתיקה היא שימשה לציון בואה של העונה הקרה.",
    },
  },
  {
    id: "Sagitta",
    name: {
      ru: "Стрела",
      en: "Sagitta",
      he: "חץ",
    },
    description: {
      ru: "Стрела — маленькое, но заметное созвездие; по нему проверяли точность построения звёздного маршрута.",
      en: "Sagitta is a small but noticeable constellation; the accuracy of star route planning was checked by it.",
      he: "חץ היא קבוצת כוכבים קטנה אך בולטת; בעזרתה בדקו את הדיוק בבניית נתיב הכוכבים.",
    },
  },
  {
    id: "alioth",
    name: {
      ru: "Алиот",
      en: "Alioth",
      he: "אליות",
    },
    description: {
      ru: "Алиот — яркая звезда ручки Большой Медведицы; одна из ключевых точек для навигации по ковшу.",
      en: "Alioth is a bright star in the Big Dipper handle; one of the key points for navigating by the dipper.",
      he: "אליות הוא כוכב בהיר בידית של הדובה הגדולה; אחת מנקודות המפתח לניווט לפי הסיר.",
    },
  },
  {
    id: "dubhe",
    name: {
      ru: "Дубхе",
      en: "Dubhe",
      he: "דובהה",
    },
    description: {
      ru: "Дубхе — звезда-указатель на краю ковша Большой Медведицы. Вместе с Мераком она помогает найти Полярную звезду.",
      en: "Dubhe is a pointer star on the edge of the Big Dipper. Together with Merak, it helps locate Polaris.",
      he: "דובהה הוא כוכב מצביע בקצה הסיר של הדובה הגדולה. יחד עם מראק הוא עוזר למצוא את כוכב הצפון.",
    },
  },
  {
    id: "Kochab",
    name: {
      ru: "Кохаб",
      en: "Kochab",
      he: "כוכאב",
    },
    description: {
      ru: "Кохаб — одна из полярных звёзд прошлого; раньше по ней определяли северное направление.",
      en: "Kochab is one of the pole stars of the past; the northern direction was previously determined by it.",
      he: "כוכאב הוא אחד מכוכבי הקוטב של העבר; בעבר קבעו לפיו את הכיוון צפונה.",
    },
  },
  {
    id: "phecda",
    name: {
      ru: "Фекда",
      en: "Phecda",
      he: "פקדה",
    },
    description: {
      ru: "Фекда — звезда Большой Медведицы, использовавшаяся мореходами для оценки широты маршрутов.",
      en: "Phecda is a star in Ursa Major used by seafarers to estimate route latitude.",
      he: "פקדה הוא כוכב בדובה הגדולה, שיורדי ים נעזרו בו כדי להעריך את קו הרוחב של מסלוליהם.",
    },
  },
  {
    id: "merak",
    name: {
      ru: "Мерак",
      en: "Merak",
      he: "מראק",
    },
    description: {
      ru: "Мерак — нижняя ‘указательная звезда’ ковша Большой Медведицы; линия от Мерака к Дубхе указывает на Полярную.",
      en: "Merak is the lower 'pointer star' of the Big Dipper bowl; the line from Merak to Dubhe points to Polaris.",
      he: "מראק הוא 'הכוכב המצביע' התחתון בסיר של הדובה הגדולה; קו ממראק לדובהה מצביע על כוכב הצפון.",
    },
  },
  {
    id: "Vulpencula",
    name: {
      ru: "Лисичка",
      en: "Vulpecula",
      he: "שועלון",
    },
    description: {
      ru: "Лисичка — маленькое созвездие северного неба; по нему проверяли положение летних созвездий.",
      en: "Vulpecula is a small constellation of the northern sky; the position of summer constellations was verified by it.",
      he: "שועלון היא קבוצת כוכבים קטנה בשמי הצפון; בעזרתה נהגו לבדוק את מיקומן של קבוצות הקיץ.",
    },
  },
  {
    id: "Vulpecula",
    name: {
      ru: "Лисичка",
      en: "Vulpecula",
      he: "שועלון",
    },
    description: {
      ru: "Лисичка — созвездие в Млечном Пути; использовалась для ориентирования летом.",
      en: "Vulpecula is a constellation in the Milky Way; it was used for navigation in the summer.",
      he: "שועלון היא קבוצת כוכבים בשביל החלב; היא שימשה להתמצאות בקיץ.",
    },
  },
  {
    id: "Anser",
    name: {
      ru: "Гусь",
      en: "Anser",
      he: "אנסר",
    },
    description: {
      ru: "Гусь — звезда в созвездии Лисички; помогает узнавать структуру летнего треугольника.",
      en: "Anser is a star in the constellation Vulpecula; it helps recognize the structure of the Summer Triangle.",
      he: "אנסר הוא כוכב בקבוצת שועלון; הוא עוזר לזהות את מבנה משולש הקיץ.",
    },
  },
  {
    id: "Rukbah",
    name: {
      ru: "Рукбах",
      en: "Rukbah",
      he: "רוכבה",
    },
    description: {
      ru: "Рукбах — звезда в созвездии Кассиопея; помогает находить противоположную сторону от Полярной.",
      en: "Rukbah is a star in the constellation Cassiopeia; it helps find the side opposite Polaris.",
      he: "רוכבה הוא כוכב בקבוצת קסיופאה; הוא מסייע למצוא את הצד הנגדי לכוכב הצפון.",
    },
  },
  {
    id: "Taurus",
    name: {
      ru: "Телец",
      en: "Taurus",
      he: "שור",
    },
    description: {
      ru: "Телец — яркое созвездие зимы; его звезды помогали ориентироваться в холодный сезон.",
      en: "Taurus is a bright winter constellation; its stars helped with navigation during the cold season.",
      he: "שור היא קבוצת כוכבים בולטת של החורף; כוכביה עזרו להתמצא בעונה הקרה.",
    },
  },
  {
    id: "Castor",
    name: {
      ru: "Кастор",
      en: "Castor",
      he: "קסטור",
    },
    description: {
      ru: "Кастор — одна из двух главных звёзд Близнецов; использовалась для проверки положения летних маршрутов.",
      en: "Castor is one of the two main stars of Gemini; it was used to verify the alignment of summer routes.",
      he: "קסטור הוא אחד משני הכוכבים הראשיים של תאומים; הוא שימש לבדיקת מיקומם של נתיבי הקיץ.",
    },
  },
  {
    id: "Cepheus",
    name: {
      ru: "Цефей",
      en: "Cepheus",
      he: "קפאוס",
    },
    description: {
      ru: "Цефей — созвездие, похожее на дом; его ‘крыша’ помогает искать Полярную звезду.",
      en: "Cepheus is a constellation that resembles a house; its 'roof' helps find Polaris.",
      he: "קפאוס היא קבוצת כוכבים המזכירה בית; ה'גג' שלה עוזר למצוא את כוכב הצפון.",
    },
  },
  {
    id: "Draco",
    name: {
      ru: "Драко",
      en: "Draco",
      he: "דרקון",
    },
    description: {
      ru: "Созвездие Драко извивается вокруг северного неба, как страж Полярной звезды.",
      en: "The Draco constellation winds across the northern sky like a guardian of Polaris.",
      he: "קבוצת הכוכבים דרקון מתפתלת סביב שמי הצפון כמו שומר של כוכב הצפון.",
    },
  },
  {
    id: "Gemini",
    name: {
      ru: "Близнецы",
      en: "Gemini",
      he: "תאומים",
    },
    description: {
      ru: "Созвездие двух звёзд-братьев, Кастора и Поллукса — яркий ориентир на зимнем небе.",
      en: "The constellation of the twin stars, Castor and Pollux — a bright landmark in the winter sky.",
      he: "קבוצת הכוכבים של שני האחים-כוכבים, קסטור ופולוקס — נקודת ציון בולטת בשמי החורף.",
    },
  },
  {
    id: "Hercules",
    name: {
      ru: "Геркулес",
      en: "Hercules",
      he: "הרקולס",
    },
    description: {
      ru: "Геркулес — одно из крупнейших созвездий северного неба, заметное своим трапециевидным контуром.",
      en: "Hercules is one of the largest constellations of the northern sky, notable for its trapezoidal outline.",
      he: "הרקולס היא אחת מקבוצות הכוכבים הגדולות בשמי הצפון, הבולטת במתאר הטרפזי שלה.",
    },
  },
  {
    id: "Lacerta",
    name: {
      ru: "Ящерица",
      en: "Lacerta",
      he: "לטאה",
    },
    description: {
      ru: "Маленькое, но изящное созвездие, напоминающее крохотную живую линию среди звёзд.",
      en: "A small but graceful constellation resembling a tiny living line among the stars.",
      he: "קבוצת כוכבים קטנה אך חיננית, המזכירה קו חי וזעיר בין הכוכבים.",
    },
  },
  {
    id: "Lacerta_dup",
    name: {
      ru: "Ящерица",
      en: "Lacerta",
      he: "לטאה",
    },
    description: {
      ru: "Повторный ID точки внутри созвездия Ящерица.",
      en: "Duplicate point ID within the Lacerta constellation.",
      he: "מזהה נקודה כפול בתוך קבוצת הכוכבים לטאה.",
    },
  },
  {
    id: "Pisces",
    name: {
      ru: "Рыбы",
      en: "Pisces",
      he: "דגים",
    },
    description: {
      ru: "Созвездие Рыбы — его использовали как признак смены сезона — начало холодов и перехода к более длинным ночам.",
      en: "The Pisces constellation — it was used as a sign of seasonal change, marking the onset of cold weather and longer nights.",
      he: "קבוצת הכוכבים דגים — שימשה כסימן לחילופי עונות: תחילת הקור והמעבר ללילות ארוכים יותר.",
    },
  },
  {
    id: "Pegasus",
    name: {
      ru: "Пегас",
      en: "Pegasus",
      he: "פגסוס",
    },
    description: {
      ru: "Пегас легко узнаётся по огромному квадрату — ориентира осеннего неба.",
      en: "Pegasus is easily recognized by its huge square — a landmark of the autumn sky.",
      he: "את פגסוס קל לזהות לפי הריבוע העצום שלו — נקודת ציון מרכזית של שמי הסתיו.",
    },
  },
  {
    id: "Perseus",
    name: {
      ru: "Персей",
      en: "Perseus",
      he: "פרסאוס",
    },
    description: {
      ru: "Созвездие героя, победившего Медузу; содержит яркие звёзды Мирфак и Алголь.",
      en: "The constellation of the hero who defeated Medusa; it contains the bright stars Mirfak and Algol.",
      he: "קבוצת הכוכבים של הגיבור שהביס את מדוזה; כוללת את הכוכבים הבהירים מירפק ואלגול.",
    },
  },
  {
    id: "Lyra_dup",
    name: {
      ru: "Лира",
      en: "Lyra",
      he: "נבל",
    },
    description: {
      ru: "Внутренняя точка созвездия Лира, ведущая к Веге.",
      en: "An internal point of the Lyra constellation leading to Vega.",
      he: "נקודה פנימית בקבוצת הכוכבים נבל, המובילה אל וגה.",
    },
  },
  {
    id: "Aquila",
    name: {
      ru: "Орел",
      en: "Aquila",
      he: "נשר",
    },
    description: {
      ru: "Созвездие Орла тянется вдоль Млечного Пути и содержит яркую звезду Альтаир.",
      en: "The constellation Aquila stretches along the Milky Way and contains the bright star Altair.",
      he: "קבוצת הכוכבים נשר נמתחת לאורך שביל החלב וכוללת את הכוכב הבהיר אלתאיר.",
    },
  },
  {
    id: "Cygnus",
    name: {
      ru: "Лебедь",
      en: "Cygnus",
      he: "ברבור",
    },
    description: {
      ru: "Созвездие Лебедь образует знаменитый Северный Крест и ведёт взгляд к яркой звезде Денеб.",
      en: "The Cygnus constellation forms the famous Northern Cross and leads the eye to the bright star Deneb.",
      he: "קבוצת הכוכבים ברבור יוצרת את הצלב הצפוני המפורסם ומובילה את המבט אל הכוכב הבהיר דנב.",
    },
  },
  {
    id: "Triangulum",
    name: {
      ru: "Треугольник",
      en: "Triangulum",
      he: "משולש",
    },
    description: {
      ru: "Треугольник — маленькое, но легко узнаваемое созвездие, использовавшееся для проверки ориентира осеннего неба.",
      en: "Triangulum is a small but easily recognized constellation used to verify landmarks of the autumn sky.",
      he: "משולש היא קבוצת כוכבים קטנה אך קלה לזיהוי, ששימשה לאימות נקודות הציון בשמי הסתיו.",
    },
  },
  {
    id: "Vega",
    name: {
      ru: "Вега",
      en: "Vega",
      he: "וגה",
    },
    description: {
      ru: "Вега — одна из ярчайших звёзд северного неба и вершина Летнего треугольника.",
      en: "Vega is one of the brightest stars in the northern sky and an apex of the Summer Triangle.",
      he: "וגה הוא אחד הכוכבים הבהירים ביותר בשמי הצפון וקודקוד של משולש הקיץ.",
    },
  },
  {
    id: "Capella",
    name: {
      ru: "Капелла",
      en: "Capella",
      he: "קפלה",
    },
    description: {
      ru: "Капелла — яркая звезда созвездия Возничего; зимой она служила надёжной путеводной точкой.",
      en: "Capella is a bright star in the constellation Auriga; in winter it served as a reliable guiding point.",
      he: "קפלה הוא כוכב בהיר בקבוצת עגלון; בחורף הוא שימש כנקודת ניווט אמינה.",
    },
  },
  {
    id: "Altair",
    name: {
      ru: "Альтаир",
      en: "Altair",
      he: "אלתאיר",
    },
    description: {
      ru: "Альтаир — одна из трёх звёзд Летнего треугольника; хорошо видна над южным горизонтом.",
      en: "Altair is one of the three stars of the Summer Triangle; it is clearly visible above the southern horizon.",
      he: "אלתאיר הוא אחד משלושת כוכבי משולש הקיץ; הוא נראה היטב מעל האופק הדרומי.",
    },
  },
  {
    id: "Aldebaran",
    name: {
      ru: "Альдебаран",
      en: "Aldebaran",
      he: "אלדברן",
    },
    description: {
      ru: "Альдебаран — яркая оранжевая звезда Тельца, по которой определяли зимние маршруты.",
      en: "Aldebaran is a bright orange star in Taurus used to determine winter routes.",
      he: "אלדברן הוא כוכב כתום בהיר בקבוצת שור, שבעזרתו קבעו מסלולים בחורף.",
    },
  },
  {
    id: "Pollux",
    name: {
      ru: "Поллукс",
      en: "Pollux",
      he: "פולוקס",
    },
    description: {
      ru: "Поллукс — одна из двух главных звёзд созвездия Близнецы; помогает различать зимние ориентиры.",
      en: "Pollux is one of the two main stars in the constellation Gemini; it helps distinguish winter landmarks.",
      he: "פולוקס הוא אחד משני הכוכבים הראשיים בקבוצת תאומים; הוא מסייע להבחין בנקודות ציון חורפיות.",
    },
  },
  {
    id: "Mirfak",
    name: {
      ru: "Мирфак",
      en: "Mirfak",
      he: "מירפק",
    },
    description: {
      ru: "Мирфак — яркая звезда Персея, по которой отслеживали высоту созвездий осеннего неба.",
      en: "Mirfak is a bright star in Perseus used to track the altitude of autumn constellations.",
      he: "מירפק הוא כוכב בהיר בפרסאוס, שבאמצעותו עקבו אחר גובהן של קבוצות הכוכבים בשמי הסתיו.",
    },
  },
  {
    id: "Menkalinan",
    name: {
      ru: "Менкалинан",
      en: "Menkalinan",
      he: "מנקלינן",
    },
    description: {
      ru: "Менкалинан — звезда Возничего; использовалась для проверки положения зимних звёзд.",
      en: "Menkalinan is a star in Auriga; it was used to check the position of winter stars.",
      he: "מנקלינן הוא כוכב בעגלון; הוא שימש לבדיקת מיקומם של כוכבי החורף.",
    },
  },
  {
    id: "Polaris",
    name: {
      ru: "Полярная",
      en: "Polaris",
      he: "כוכב הצפון",
    },
    description: {
      ru: "Полярная — главная путеводная звезда северного полушария; всегда показывает направление на север.",
      en: "Polaris is the main guiding star of the Northern Hemisphere; it always indicates the direction of north.",
      he: "כוכב הצפון הוא כוכב הניווט המרכזי של חצי הכדור הצפוני; הוא מצביע תמיד על כיוון צפון.",
    },
  },
  {
    id: "Polar-Star",
    name: {
      ru: "Полярная",
      en: "Polaris",
      he: "כוכב הצפון",
    },
    description: {
      ru: "Полярная — главная путеводная звезда северного полушария; всегда показывает направление на север.",
      en: "Polaris is the main guiding star of the Northern Hemisphere; it always indicates the direction of north.",
      he: "כוכב הצפון הוא כוכב הניווט המרכזי של חצי הכדור הצפוני; הוא מצביע תמיד על כיוון צפון.",
    },
  },
  {
    id: "Hamal",
    name: {
      ru: "Хамаль",
      en: "Hamal",
      he: "המל",
    },
    description: {
      ru: "Хамаль — яркая звезда созвездия Овна; раньше использовалась как точка весеннего равноденствия.",
      en: "Hamal is a bright star in the constellation Aries; it was formerly used as a marker of the vernal equinox.",
      he: "המל הוא כוכב בהיר בקבוצת טלה; בעבר הוא שימש כנקודת השוויון האביבי.",
    },
  },
  {
    id: "Alpheratz",
    name: {
      ru: "Альферац",
      en: "Alpheratz",
      he: "אלפרץ",
    },
    description: {
      ru: "Альферац — звезда на границе Пегаса и Андромеды, служившая ориентиром осеннего неба.",
      en: "Alpheratz is a star on the border of Pegasus and Andromeda that served as an autumn landmark.",
      he: "אלפרץ הוא כוכב על הגבול שבין פגסוס לאנדרומדה, ששימש כנקודת ציון בשמי הסתיו.",
    },
  },
  {
    id: "Algol",
    name: {
      ru: "Алгол",
      en: "Algol",
      he: "אלגול",
    },
    description: {
      ru: "Алгол — «звезда-мигатель» Персея; по её изменчивому свету моряки знали о смене ночных часов.",
      en: "Algol is the 'winking star' of Perseus; by its changing light, sailors kept track of the passing night hours.",
      he: "אלגול הוא 'הכוכב המהבהב' של פרסאוס; לפי אורו המשתנה ידעו המלחים על חלוף שעות הלילה.",
    },
  },
  {
    id: "Sadr",
    name: {
      ru: "Садр",
      en: "Sadr",
      he: "סאדר",
    },
    description: {
      ru: "Садр — центральная звезда созвездия Лебедь, хорошо видимая на летнем небе.",
      en: "Sadr is the central star of the Cygnus constellation, clearly visible in the summer sky.",
      he: "סאדר הוא הכוכב המרכזי בקבוצת ברבור, הנראה היטב בשמי הקיץ.",
    },
  },
  {
    id: "Mizar",
    name: {
      ru: "Мицар",
      en: "Mizar",
      he: "מיצר",
    },
    description: {
      ru: "Мицар — звезда ручки Большой Медведицы; вместе с Алкором служила тестом зоркости.",
      en: "Mizar is a star in the Big Dipper handle; together with Alcor, it served as an eyesight test.",
      he: "מיצר הוא כוכב בידית של הדובה הגדולה; יחד עם אלקור הוא שימש כמבחן לחדות הראייה.",
    },
  },
  {
    id: "Algecca",
    name: {
      ru: "Альгекка",
      en: "Algecca",
      he: "אלגקה",
    },
    description: {
      ru: "Альгекка — звезда созвездия Льва; использовалась для проверки положения весенних звёзд.",
      en: "Algecca is a star in the constellation Leo; it was used to verify the position of spring stars.",
      he: "אלגקה הוא כוכב בקבוצת אריה; הוא שימש לבדיקת מיקומם של כוכבי האביב.",
    },
  },
  {
    id: "Menkar",
    name: {
      ru: "Менкар",
      en: "Menkar",
      he: "מנקר",
    },
    description: {
      ru: "Менкар — яркая звезда созвездия Кита; служила ориентиром в осенних морских путешествиях.",
      en: "Menkar is a bright star in the constellation Cetus; it served as a landmark during autumn sea voyages.",
      he: "מנקר הוא כוכב בהיר בקבוצת לווייתן; הוא שימש כנקודת ציון במסעות ימיים בסתיו.",
    },
  },
  {
    id: "Sheratan",
    name: {
      ru: "Шератан",
      en: "Sheratan",
      he: "שרתן",
    },
    description: {
      ru: "Шератан — звезда созвездия Овна, по которой отслеживали наступление весны.",
      en: "Sheratan is a star in the constellation Aries used to track the arrival of spring.",
      he: "שרתן הוא כוכב בקבוצת טלה, שבאמצעותו עקבו אחר בוא האביב.",
    },
  },
  {
    id: "Rastaban",
    name: {
      ru: "Растабан",
      en: "Rastaban",
      he: "רסטבאן",
    },
    description: {
      ru: "Растабан — одна из ярких звёзд Дракона; использовалась как северный ориентир в летний сезон.",
      en: "Rastaban is one of the bright stars of Draco; it was used as a northern landmark during the summer season.",
      he: "רסטבאן הוא אחד הכוכבים הבהירים בדרקון; הוא שימש כנקודת ציון צפונית בעונת הקיץ.",
    },
  },
  {
    id: "Seginus",
    name: {
      ru: "Сегинус",
      en: "Seginus",
      he: "סגינוס",
    },
    description: {
      ru: "Сегинус — звезда созвездия Волопаса; помогала оценивать высоту весенних созвездий.",
      en: "Seginus is a star in the constellation Boötes; it helped assess the altitude of spring constellations.",
      he: "סגינוס הוא כוכב בקבוצת רועה דובים; הוא עזר להעריך את גובהן של קבוצות האביב.",
    },
  },
  {
    id: "Altais",
    name: {
      ru: "Альтаис",
      en: "Altais",
      he: "אלתאיס",
    },
    description: {
      ru: "Альтаис — звезда созвездия Драко; использовалась как ориентир в северных ночных маршрутах.",
      en: "Altais is a star in the constellation Draco; it was used as a landmark on northern nighttime routes.",
      he: "אלתאיס הוא כוכב בקבוצת דרקון; הוא שימש כנקודת ציון במסלולים ליליים צפוניים.",
    },
  },
  {
    id: "Albireo",
    name: {
      ru: "Альбирео",
      en: "Albireo",
      he: "אלביראו",
    },
    description: {
      ru: "Альбирео — двойная звезда в созвездии Лебедь; её контрастный свет помогал морякам определять положение Летнего треугольника.",
      en: "Albireo is a double star in the constellation Cygnus; its contrasting colors helped sailors determine the position of the Summer Triangle.",
      he: "אלביראו הוא כוכב כפול בקבוצת ברבור; אורו הניגודי עזר למלחים לקבוע את מיקומו של משולש הקיץ.",
    },
  },
  {
    id: "Errai",
    name: {
      ru: "Эррай",
      en: "Errai",
      he: "אראי",
    },
    description: {
      ru: "Эррай — звезда созвездия Цефея; служила дополнительной точкой при поиске направления на Полярную.",
      en: "Errai is a star in the constellation Cepheus; it served as an additional point when looking for Polaris.",
      he: "אראי הוא כוכב בקבוצת קפאוס; הוא שימש כנקודה נוספת בעת חיפוש הכיוון אל כוכב הצפון.",
    },
  },
  {
    id: "Edasich",
    name: {
      ru: "Эдасик",
      en: "Edasich",
      he: "אדסיך",
    },
    description: {
      ru: "Эдасик — звезда в Драконе, по которой раньше проверяли точность северных ориентаций.",
      en: "Edasich is a star in Draco used in the past to verify the accuracy of northern bearings.",
      he: "אדסיך הוא כוכב בדרקון, שבעבר בדקו באמצעותו את דיוק ההתמצאות בצפון.",
    },
  },
  {
    id: "Mothallah",
    name: {
      ru: "Моталлах",
      en: "Mothallah",
      he: "מותאלאה",
    },
    description: {
      ru: "Моталлах — звезда созвездия Треугольника; использовалась как часть осенних ориентиров.",
      en: "Mothallah is a star in the constellation Triangulum; it was used as part of autumn navigational landmarks.",
      he: "מותאלאה הוא כוכב בקבוצת משולש; הוא שימש כחלק מנקודות הציון בסתיו.",
    },
  },
  {
    id: "Homal",
    name: {
      ru: "Хомал",
      en: "Homal",
      he: "חומאל",
    },
    description: {
      ru: "Хомал — звезда в созвездии Дракона, помогавшая уточнять положение северных звёзд.",
      en: "Homal is a star in the constellation Draco that helped pinpoint the position of northern stars.",
      he: "חומאל הוא כוכב בקבוצת דרקון, שסייע לדייק את מיקומם של כוכבי הצפון.",
    },
  },
  {
    id: "Nekkar",
    name: {
      ru: "Неккар",
      en: "Nekkar",
      he: "נקאר",
    },
    description: {
      ru: "Неккар — яркая звезда созвездия Волопас; служила ориентирами летнего неба.",
      en: "Nekkar is a bright star in the constellation Boötes; it served as a landmark of the summer sky.",
      he: "נקאר הוא כוכב בהיר בקבוצת רועה דובים; הוא שימש כנקודת ציון בשמי הקיץ.",
    },
  },
  {
    id: "Ain",
    name: {
      ru: "Айн",
      en: "Ain",
      he: "עין",
    },
    description: {
      ru: "Айн — звезда созвездия Тельца; использовалась как зимний ориентир.",
      en: "Ain is a star in the constellation Taurus; it was used as a winter landmark.",
      he: "עין הוא כוכב בקבוצת שור; הוא שימש כנקודת ציון בחורף.",
    },
  },
  {
    id: "Pegasus",
    name: {
      ru: "Пегас",
      en: "Pegasus",
      he: "פגסוס",
    },
    description: {
      ru: "Созвездие Пегас легко узнаётся по огромному квадрату — ориентира осеннего неба. (Дополнительная внутренняя точка.)",
      en: "The Pegasus constellation is easily recognized by its huge square — a landmark of the autumn sky. (Additional internal point.)",
      he: "את קבוצת הכוכבים פגסוס קל לזהות לפי הריבוע העצום — נקודת ציון של שמי הסתיו. (נקודה פנימית נוספת.)",
    },
  },
  {
    id: "Enif",
    name: {
      ru: "Эниф",
      en: "Enif",
      he: "אניף",
    },
    description: {
      ru: "Эниф — яркая звезда Пегаса; помогала определять высоту осенних созвездий.",
      en: "Enif is a bright star in Pegasus; it helped determine the altitude of autumn constellations.",
      he: "אניף הוא כוכב בהיר בפגסוס; הוא סייע לקבוע את גובהן של קבוצות הכוכבים בסתיו.",
    },
  },
  {
    id: "Biham",
    name: {
      ru: "Бихам",
      en: "Biham",
      he: "ביחאם",
    },
    description: {
      ru: "Бихам — звезда созвездия Пегаса; по ней проверяли положение осеннего квадрата.",
      en: "Biham is a star in the constellation Pegasus; the position of the Great Square of Pegasus was verified by it.",
      he: "ביחאם הוא כוכב בקבוצת פגסוס; בעזרתו בדקו את מיקומו של ריבוע הסתיו.",
    },
  },
  {
    id: "Sheliak",
    name: {
      ru: "Шелиак",
      en: "Sheliak",
      he: "שליאק",
    },
    description: {
      ru: "Шелиак — звезда Лиры; помогает находить расположение Веги и ориентироваться летом.",
      en: "Sheliak is a star in Lyra; it helps locate Vega and navigate in summer.",
      he: "שליאק הוא כוכב בנבל; הוא עוזר למצוא את מיקומו של וגה ולהתמצא בקיץ.",
    },
  },
  {
    id: "Nusakan",
    name: {
      ru: "Нусака́н",
      en: "Nusakan",
      he: "נוסקאן",
    },
    description: {
      ru: "Нусакан — звезда созвездия Северной Короны; использовалась для уточнения высоты летних созвездий.",
      en: "Nusakan is a star in the constellation Corona Borealis; it was used to determine the altitude of summer constellations.",
      he: "נוסקאן הוא כוכב בקבוצת כתר צפוני; הוא שימש לדיוק גובהן של קבוצות הקיץ.",
    },
  },
  {
    id: "Electra",
    name: {
      ru: "Электра",
      en: "Electra",
      he: "אלקטרה",
    },
    description: {
      ru: "Электра — одна из ярких Плеяд; по ней определяли наступление зимнего сезона.",
      en: "Electra is one of the bright Pleiades; the onset of the winter season was determined by it.",
      he: "אלקטרה הוא אחד מכוכבי הפליאדות הבהירים; לפיו קבעו את בוא עונת החורף.",
    },
  },
  {
    id: "Alshain",
    name: {
      ru: "Альшаин",
      en: "Alshain",
      he: "אלשאין",
    },
    description: {
      ru: "Альшаин — звезда созвездия Орла; помогает находить Альтаир в Летнем треугольнике.",
      en: "Alshain is a star in the constellation Aquila; it helps find Altair in the Summer Triangle.",
      he: "אלשאין הוא כוכב בקבוצת נשר; הוא עוזר למצוא את אלתאיר במשולש הקיץ.",
    },
  },
  {
    id: "Ran",
    name: {
      ru: "Ран",
      en: "Ran",
      he: "ראן",
    },
    description: {
      ru: "Ран — звезда созвездия Эридан; использовалась как ориентир южных направлений.",
      en: "Ran is a star in the constellation Eridanus; it was used as a landmark for southern directions.",
      he: "ראן הוא כוכב בקבוצת ארידנוס; הוא שימש כנקודת ציון לכיוונים דרומיים.",
    },
  },
  {
    id: "Delphinus",
    name: {
      ru: "Дельфин",
      en: "Delphinus",
      he: "דולפין",
    },
    description: {
      ru: "Дельфин — маленькое созвездие, похожее на прыгающего дельфина; служило ориентиром позднего лета.",
      en: "Delphinus is a small constellation resembling a leaping dolphin; it served as a late summer landmark.",
      he: "דולפין היא קבוצת כוכבים קטנה המזכירה דולפין מקפץ; היא שימשה כנקודת ציון בסוף הקיץ.",
    },
  },
  {
    id: "Deneb",
    name: {
      ru: "Денеб",
      en: "Deneb",
      he: "דנב",
    },
    description: {
      ru: "Денеб — вершина Летнего треугольника и яркая звезда созвездия Лебедь.",
      en: "Deneb is an apex of the Summer Triangle and a bright star in the constellation Cygnus.",
      he: "דנב הוא קודקוד של משולש הקיץ וכוכב בהיר בקבוצת ברבור.",
    },
  },
  {
    id: "Sualocin",
    name: {
      ru: "Суалоцин",
      en: "Sualocin",
      he: "סואלוצין",
    },
    description: {
      ru: "Суалоцин — звезда созвездия Дельфин; одно из ориентиров позднего летнего неба.",
      en: "Sualocin is a star in the constellation Delphinus; one of the landmarks of the late summer sky.",
      he: "סואלוצין הוא כוכב בקבוצת דולפין; אחת מנקודות הציון בשמי סוף הקיץ.",
    },
  },
  {
    id: "Aquarius",
    name: {
      ru: "Водолей",
      en: "Aquarius",
      he: "דלי",
    },
    description: {
      ru: "Водолей — созвездие осени; использовалось в древности для прогноза наступления сезона дождей.",
      en: "Aquarius is an autumn constellation; in ancient times it was used to forecast the rainy season.",
      he: "דלי היא קבוצת כוכבים של הסתיו; בעת העתיקה היא שימשה לחיזוי בואה של עונת הגשמים.",
    },
  },
  {
    id: "Albali",
    name: {
      ru: "Альбали",
      en: "Albali",
      he: "אלבאלי",
    },
    description: {
      ru: "Альбали — звезда созвездия Водолея; использовалась для обозначения середины осеннего неба.",
      en: "Albali is a star in the constellation Aquarius; it was used to mark the midpoint of the autumn sky.",
      he: "אלבאלי הוא כוכב בקבוצת דלי; הוא שימש לציון מרכז שמי הסתיו.",
    },
  },
  {
    id: "Sadachbia",
    name: {
      ru: "Садакхбия",
      en: "Sadachbia",
      he: "סדאכביה",
    },
    description: {
      ru: "Садакхбия — звезда Водолея, по которой определяли высоту осенних созвездий.",
      en: "Sadachbia is a star in Aquarius used to determine the altitude of autumn constellations.",
      he: "סדאכביה הוא כוכב בדלי, שבאמצעותו קבעו את גובהן של קבוצות הסתיו.",
    },
  },
  {
    id: "Azha",
    name: {
      ru: "Азха",
      en: "Azha",
      he: "אזחה",
    },
    description: {
      ru: "Азха — звезда созвездия Эридан; служила ориентиром для южных направлений в навигации.",
      en: "Azha is a star in the constellation Eridanus; it served as a navigational landmark for southern directions.",
      he: "אזחה הוא כוכב בקבוצת ארידנוס; הוא שימש כנקודת ציון לכיוונים דרומיים בניווט.",
    },
  },
  {
    id: "Ancha",
    name: {
      ru: "Анча",
      en: "Ancha",
      he: "אנצ'ה",
    },
    description: {
      ru: "Анча — звезда Водолея; по ней проверяли положение осенних звёзд.",
      en: "Ancha is a star in Aquarius; the alignment of autumn stars was checked by it.",
      he: "אנצ'ה הוא כוכב בדלי; בעזרתו בדקו את מיקומם של כוכבי הסתיו.",
    },
  },
  {
    id: "Botein",
    name: {
      ru: "Ботейн",
      en: "Botein",
      he: "בוטיין",
    },
    description: {
      ru: "Ботейн — звезда созвездия Овна; использовалась как дополнительный ориентир весеннего неба.",
      en: "Botein is a star in the constellation Aries; it was used as an additional landmark in the spring sky.",
      he: "בוטיין הוא כוכב בקבוצת טלה; הוא שימש כנקודת ציון נוספת בשמי האביב.",
    },
  },
  {
    id: "Sham",
    name: {
      ru: "Шам",
      en: "Sham",
      he: "שאם",
    },
    description: {
      ru: "Шам — звезда созвездия Стрела; помогала уточнять направление летних созвездий.",
      en: "Sham is a star in the constellation Sagitta; it helped refine the direction of summer constellations.",
      he: "שאם הוא כוכב בקבוצת חץ; הוא סייע לדייק את כיוונן של קבוצות הקיץ.",
    },
  },
  {
    id: "Maasym",
    name: {
      ru: "Маасым",
      en: "Maasym",
      he: "מעסים",
    },
    description: {
      ru: "Маасым — звезда созвездия Геркулес; использовалась для ориентации в летний сезон.",
      en: "Maasym is a star in the constellation Hercules; it was used for navigation during the summer season.",
      he: "מעסים הוא כוכב בקבוצת הרקולס; הוא שימש להתמצאות בעונת הקיץ.",
    },
  },
  {
    id: "Azelfafage",
    name: {
      ru: "Азельфафаге",
      en: "Azelfafage",
      he: "אזלפפאגה",
    },
    description: {
      ru: "Азельфафаге — звезда созвездия Лебедь; служила дополнительной точкой навигации около Денеба.",
      en: "Azelfafage is a star in the constellation Cygnus; it served as an additional navigational point near Deneb.",
      he: "אזלפפאגה הוא כוכב בקבוצת ברבור; הוא שימש כנקודת ניווט נוספת ליד דנב.",
    },
  },
  {
    id: "Zibal",
    name: {
      ru: "Зибал",
      en: "Zibal",
      he: "זיבאל",
    },
    description: {
      ru: "Зибал — звезда созвездия Кит; по ней определяли положение южных звёзд осеннего неба.",
      en: "Zibal is a star in the constellation Cetus; the position of southern stars in the autumn sky was determined by it.",
      he: "זיבאל הוא כוכב בקבוצת לווייתן; בעזרתו קבעו את מיקומם של כוכבי הדרום בשמי הסתיו.",
    },
  },
  {
    id: "Eridanus",
    name: {
      ru: "Эридан",
      en: "Eridanus",
      he: "ארידנוס",
    },
    description: {
      ru: "Эридан — длинное созвездие, символизирующее небесную реку; использовалось для определения направления на южные звёзды.",
      en: "Eridanus is a long constellation symbolizing a celestial river; it was used to find the direction to southern stars.",
      he: "ארידנוס היא קבוצת כוכבים ארוכה המסמלת נהר שמימי; היא שימשה לקביעת הכיוון אל כוכבי הדרום.",
    },
  },
  {
    id: "Fafnir",
    name: {
      ru: "Фафнир",
      en: "Fafnir",
      he: "פאפניר",
    },
    description: {
      ru: "Фафнир — звезда в созвездии Дракона; служила дополнительным ориентиром при поиске северных созвездий.",
      en: "Fafnir is a star in the constellation Draco; it served as an additional landmark when searching for northern constellations.",
      he: "פאפניר הוא כוכב בקבוצת דרקון; הוא שימש כנקודת ציון נוספת בחיפוש קבוצות כוכבים צפוניות.",
    },
  },
  {
    id: "Alresha",
    name: {
      ru: "Альреша",
      en: "Alresha",
      he: "אלרישה",
    },
    description: {
      ru: "Альреша — звезда созвездия Рыбы; отмечает место соединения двух небесных рыб, использовалась как ориентир осеннего неба.",
      en: "Alresha is a star in the constellation Pisces; it marks the knot connecting the two celestial fishes and was used as an autumn landmark.",
      he: "אלרישה הוא כוכב בקבוצת דגים; הוא מציין את נקודת החיבור בין שני הדגים השמימיים, ושימש כנקודת ציון בשמי הסתיו.",
    },
  },
  {
    id: "Andromeda",
    name: {
      ru: "Андромеда",
      en: "Andromeda",
      he: "אנדרומדה",
    },
    description: {
      ru: "Андромеда — большое созвездие, по которому моряки ориентировались осенью благодаря яркой цепочке звёзд.",
      en: "Andromeda is a large constellation that sailors used for autumn navigation thanks to its bright chain of stars.",
      he: "אנדרומדה היא קבוצת כוכבים גדולה שבאמצעותה ניווטו מלחים בסתיו הודות לשרשרת הכוכבים הבהירה שלה.",
    },
  },
  {
    id: "Mirach",
    name: {
      ru: "Мирах",
      en: "Mirach",
      he: "מיראך",
    },
    description: {
      ru: "Мирах — яркая звезда Андромеды; служила ориентиром в середине осеннего неба.",
      en: "Mirach is a bright star in Andromeda; it served as a landmark in the middle of the autumn sky.",
      he: "מיראך הוא כוכב בהיר באנדרומדה; הוא שימש כנקודת ציון במרכז שמי הסתיו.",
    },
  },
  {
    id: "Almach",
    name: {
      ru: "Альмах",
      en: "Almach",
      he: "אלמאך",
    },
    description: {
      ru: "Альмах — красивая двойная звезда Андромеды, по которой отслеживали высоту восточных созвездий.",
      en: "Almach is a beautiful double star in Andromeda used to track the altitude of eastern constellations.",
      he: "אלמאך הוא כוכב כפול יפהפה באנדרומדה, שבאמצעותו עקבו אחר גובהן של קבוצות המזרח.",
    },
  },
  {
    id: "Sheat",
    name: {
      ru: "Шеат",
      en: "Scheat",
      he: "שאט",
    },
    description: {
      ru: "Шеат — звезда Пегаса; одна из вершин осеннего квадрата, помогала определять западную часть осеннего неба.",
      en: "Scheat is a star in Pegasus; one of the vertices of the Great Square, it helped determine the western part of the autumn sky.",
      he: "שאט הוא כוכב בפגסוס; אחד מקודקודי ריבוע הסתיו, שעזר לקבוע את החלק המערבי של שמי הסתיו.",
    },
  },
  {
    id: "Markab",
    name: {
      ru: "Маркаб",
      en: "Markab",
      he: "מרקב",
    },
    description: {
      ru: "Маркаб — яркая звезда Пегаса; использовалась для оценки положения юго-западного неба.",
      en: "Markab is a bright star in Pegasus; it was used to assess the position of the southwestern sky.",
      he: "מרקב הוא כוכב בהיר בפגסוס; הוא שימש להערכת מיקומם של שמי הדרום-מערב.",
    },
  },
  {
    id: "Algenib",
    name: {
      ru: "Альгениб",
      en: "Algenib",
      he: "אלג'ניב",
    },
    description: {
      ru: "Альгениб — восточная звезда осеннего квадрата Пегаса; важная точка для ночной навигации.",
      en: "Algenib is the eastern star of the Great Square of Pegasus; an important point for night navigation.",
      he: "אלג'ניב הוא הכוכב המזרחי בריבוע הסתיו של פגסוס; נקודה חשובה לניווט לילי.",
    },
  },
  {
    id: "Matar",
    name: {
      ru: "Матар",
      en: "Matar",
      he: "מטר",
    },
    description: {
      ru: "Матар — звезда созвездия Пегаса; по ней моряки проверяли высоту осенних созвездий над горизонтом.",
      en: "Matar is a star in the constellation Pegasus; sailors checked the altitude of autumn constellations above the horizon by it.",
      he: "מטר הוא כוכב בקבוצת פגסוס; בעזרתו בדקו מלחים את גובהן של קבוצות הסתיו מעל האופק.",
    },
  },
  {
    id: "Sadalbari",
    name: {
      ru: "Садалбари",
      en: "Sadalbari",
      he: "סעד אל-בארי",
    },
    description: {
      ru: "Звезда в созвездии Водолея; её название означает «приносящая удачу», и моряки считали её добрым знаком в спокойных ночных переходах.",
      en: "A star in the constellation Aquarius; its name means 'bringing good fortune,' and sailors considered it a good omen during calm night passages.",
      he: "כוכב בקבוצת דלי; שמו פירושו 'מביא המזל הטוב', ומלחים ראו בו סימן מבורך בהפלגות לילה רגועות.",
    },
  },
  {
    id: "Adhil",
    name: {
      ru: "Адхил",
      en: "Adhil",
      he: "אדהיל",
    },
    description: {
      ru: "Голубовато-белая звезда в созвездии Андромеды; помогает находить верхнюю часть фигуры созвездия, похожую на вытянутую дугу.",
      en: "A bluish-white star in the constellation Andromeda; it helps find the upper part of the constellation's figure, which resembles an extended arch.",
      he: "כוכב כחלחל-לבן בקבוצת אנדרומדה; הוא עוזר לאתר את חלקה העליון של דמות הקבוצה, המזכיר קשת מתוחה.",
    },
  },
  {
    id: "Geldibeh",
    name: {
      ru: "Гельдебех",
      en: "Geldibeh",
      he: "גלדיבה",
    },
    description: {
      ru: "Название встречается в старых каталогах; относится к слабой звезде около Персея, использовавшейся для уточнения направления среди густых звёздных полей.",
      en: "A name found in old star catalogs; it refers to a faint star near Perseus used to refine directions among dense star fields.",
      he: "שם המופיע בקטלוגים ישנים; מתייחס לכוכב חיוור ליד פרסאוס, ששימש לדיוק הכיוון בתוך שדות כוכבים צפופים.",
    },
  },
  {
    id: "Hercules",
    name: {
      ru: "Геркулес",
      en: "Hercules",
      he: "הרקולס",
    },
    description: {
      ru: "Созвездие Геркулеса — одно из крупнейших на небе; ориентиры в нём используют, чтобы найти знаменитый Шаровой кластер М13.",
      en: "The Hercules constellation is one of the largest in the sky; landmarks within it are used to find the famous globular cluster M13.",
      he: "קבוצת הכוכבים הרקולס היא אחת הגדולות בשמיים; נקודות הציון שבה משמשות למציאת הצביר הכדורי המפורסם M13.",
    },
  },
  {
    id: "Sarin",
    name: {
      ru: "Сарин",
      en: "Sarin",
      he: "סארין",
    },
    description: {
      ru: "Звезда в созвездии Геркулеса; часто служит отправной точкой для поиска других ярких объектов внутри созвездия.",
      en: "A star in the constellation Hercules; it often serves as a starting point for locating other bright objects within the constellation.",
      he: "כוכב בקבוצת הרקולס; משמש לעיתים קרובות כנקודת מוצא לחיפוש עצמים בהירים נוספים בתוך הקבוצה.",
    },
  },
  {
    id: "Cancer",
    name: {
      ru: "Рак",
      en: "Cancer",
      he: "סרטן",
    },
    description: {
      ru: "Созвездие Рака известно слабой видимостью, но содержит Ясли — рассеянное звёздное скопление, служившее ориентиром в тёмных морях.",
      en: "The Cancer constellation is known for its faint visibility, but contains the Beehive Cluster — an open star cluster that served as a landmark across dark seas.",
      he: "קבוצת הכוכבים סרטן מוכרת בנראותה החלשה, אך מכילה את 'האבוס' (צביר הכוורת) — צביר כוכבים פתוח ששימש כנקודת ציון בימים אפלים.",
    },
  },
  {
    id: "Lynx",
    name: {
      ru: "Рысь",
      en: "Lynx",
      he: "שונר",
    },
    description: {
      ru: "Созвездие Рыси состоит из слабых звёзд; навигаторы использовали его как 'тихую зону' между более яркими созвездиями.",
      en: "The Lynx constellation consists of faint stars; navigators used it as a 'quiet zone' between brighter constellations.",
      he: "קבוצת הכוכבים שונר מורכבת מכוכבים חיוורים; נווטים השתמשו בה כ'אזור שקט' בין קבוצות כוכבים בהירות יותר.",
    },
  },
  {
    id: "Merak",
    name: {
      ru: "Мерак",
      en: "Merak",
      he: "מראק",
    },
    description: {
      ru: "Одна из двух Указательных звёзд Большой Медведицы: линия Мерак → Дубхе ведёт прямо к Полярной звезде.",
      en: "One of the two Pointer Stars of the Big Dipper: the line Merak → Dubhe leads directly to Polaris.",
      he: "אחד משני 'הכוכבים המצביעים' של הדובה הגדולה: הקו מראק ← דובהה מוביל היישר אל כוכב הצפון.",
    },
  },
  {
    id: "Alioth",
    name: {
      ru: "Алиот",
      en: "Alioth",
      he: "אליות",
    },
    description: {
      ru: "Самая яркая звезда в ковше Большой Медведицы; помогает находить направление на соседние «ручковые» звёзды — Мицар и Алькаид.",
      en: "The brightest star in the Big Dipper; it helps point the way toward neighboring 'handle' stars — Mizar and Alkaid.",
      he: "הכוכב הבהיר ביותר בסיר של הדובה הגדולה; עוזר למצוא את הכיוון לכוכבי ה'ידית' השכנים — מיצר ואלקאיד.",
    },
  },
  {
    id: "Alkaid",
    name: {
      ru: "Алькаид",
      en: "Alkaid",
      he: "אלקאיד",
    },
    description: {
      ru: "Крайняя звезда ручки Большой Медведицы; использовалась моряками как ориентир на восточной стороне ковша.",
      en: "The end star of the Big Dipper handle; it was used by sailors as a landmark on the eastern side of the dipper.",
      he: "הכוכב הקיצוני בידית של הדובה הגדולה; שימש מלחים כנקודת ציון בצד המזרחי של הסיר.",
    },
  },
  {
    id: "Talitha",
    name: {
      ru: "Талита",
      en: "Talitha",
      he: "טליתא",
    },
    description: {
      ru: "Талита — звезда в созвездии Большой Медведицы; служила дополнительной точкой для выравнивания направления северных маршрутов.",
      en: "Talitha is a star in the constellation Ursa Major; it served as an additional point for aligning the direction of northern routes.",
      he: "טליתא הוא כוכב בקבוצת הדובה הגדולה; הוא שימש כנקודה נוספת ליישור הכיוון במסלולים צפוניים.",
    },
  },
  {
    id: "polaris",
    name: {
      ru: "Полярная",
      en: "Polaris",
      he: "כוכב הצפון",
    },
    description: {
      ru: "Полярная — звезда, указывающая точное направление на север; важнейший ориентир всех древних и современных навигаторов.",
      en: "Polaris is the star indicating the exact direction of north; the most crucial landmark for all ancient and modern navigators.",
      he: "כוכב הצפון הוא הכוכב המצביע על כיוון צפון המדויק; נקודת הציון החשובה ביותר לכל הנווטים בעת העתיקה ובימינו.",
    },
  },
  {
    id: "Iilduun",
    name: {
      ru: "Илдуун",
      en: "Iilduun",
      he: "אילדון",
    },
    description: {
      ru: "Илдуун — редкое название слабой звезды из старых каталогов; использовалась для уточнения положения северных созвездий.",
      en: "Iilduun is a rare name of a faint star from old catalogs; it was used to clarify the position of northern constellations.",
      he: "אילדון הוא שם נדיר של כוכב חיוור מקטלוגים ישנים; הוא שימש לדיוק מיקומן של קבוצות כוכבים צפוניות.",
    },
  },
  {
    id: "Eltanin",
    name: {
      ru: "Эльтанин",
      en: "Eltanin",
      he: "אלתנין",
    },
    description: {
      ru: "Эльтанин — яркая звезда созвездия Дракона; по ней моряки определяли высоту северного неба.",
      en: "Eltanin is a bright star in the constellation Draco; sailors determined the altitude of the northern sky by it.",
      he: "אלתנין הוא כוכב בהיר בקבוצת דרקון; לפיו קבעו מלחים את גובהם של שמי הצפון.",
    },
  },
  {
    id: "Menkib",
    name: {
      ru: "Менкиб",
      en: "Menkib",
      he: "מנקיב",
    },
    description: {
      ru: "Менкиб — звезда созвездия Персея; служила ориентиром среди осенних и зимних звёзд.",
      en: "Menkib is a star in the constellation Perseus; it served as a landmark among autumn and winter stars.",
      he: "מנקיב הוא כוכב בקבוצת פרסאוס; הוא שימש כנקודת ציון בין כוכבי הסתיו והחורף.",
    },
  },
  {
    id: "Atik",
    name: {
      ru: "Атик",
      en: "Atik",
      he: "אטיק",
    },
    description: {
      ru: "Атик — звезда в созвездии Персея; помогает находить яркую звезду Мирфак и другие точки созвездия.",
      en: "Atik is a star in the constellation Perseus; it helps locate the bright star Mirfak and other points in the constellation.",
      he: "אטיק הוא כוכב בקבוצת פרסאוס; הוא מסייע לאתר את הכוכב הבהיר מירפק ונקודות נוספות בקבוצה.",
    },
  },
  {
    id: "Atlas",
    name: {
      ru: "Атлас",
      en: "Atlas",
      he: "אטלס",
    },
    description: {
      ru: "Атлас — одна из звёзд Плеяд; использовалась как часть зимнего ориентира среди яркого скопления.",
      en: "Atlas is one of the stars of the Pleiades; it was used as part of a winter landmark within the bright cluster.",
      he: "אטלס הוא אחד מכוכבי הפליאדות; הוא שימש כחלק מנקודת ציון חורפית בתוך הצביר הבהיר.",
    },
  },
  {
    id: "Mesarthim",
    name: {
      ru: "Месартим",
      en: "Mesarthim",
      he: "מסרתים",
    },
    description: {
      ru: "Месартим — двойная звезда в созвездии Овна; служила отправной точкой при поиске соседних ярких объектов.",
      en: "Mesarthim is a double star in the constellation Aries; it served as a starting point when locating neighboring bright objects.",
      he: "מסרתים הוא כוכב כפול בקבוצת טלה; הוא שימש כנקודת מוצא בחיפוש אחר עצמים בהירים סמוכים.",
    },
  },
  {
    id: "Ecuuleus",
    name: {
      ru: "Экуллеус",
      en: "Equuleus",
      he: "סוסון רמך",
    },
    description: {
      ru: "Экуллеус — альтернативное написание созвездия Малый Конь; слабые звёзды использовались для уточнения положения осенних ориентиров.",
      en: "Equuleus is an alternative spelling for the Little Horse constellation; its faint stars were used to refine the position of autumn landmarks.",
      he: "סוסון רמך (אקוולאוס) — כתיב חלופי לקבוצת הכוכבים הסוסון; כוכביה החיוורים שימשו לדיוק מיקומן של נקודות ציון בסתיו.",
    },
  },
  {
    id: "Equuleus",
    name: {
      ru: "Экуллеус",
      en: "Equuleus",
      he: "סוסון רמך",
    },
    description: {
      ru: "Экуллеус (Малый Конь) — одно из самых маленьких созвездий на небе; его звёзды служили тихим ориентиром между более яркими областями.",
      en: "Equuleus (Little Horse) is one of the smallest constellations in the sky; its stars served as a quiet landmark between brighter regions.",
      he: "סוסון רמך (הסוס הקטן) היא אחת מקבוצות הכוכבים הקטנות ביותר בשמיים; כוכביה שימשו כנקודת ציון שקטה בין אזורים בהירים יותר.",
    },
  },
];

export function getLocalizedStarName(
  star: StarInfo | undefined | null,
  locale: StarLocale = "ru"
): string {
  if (!star) return "";
  return star.name[locale] || star.name.ru || "";
}

export function getLocalizedStarDescription(
  star: StarInfo | undefined | null,
  locale: StarLocale = "ru"
): string {
  if (!star) return "";
  return star.description[locale] || star.description.ru || "";
}

export function findStarInfo(id: string): StarInfo | undefined {
  const normalized = id === "Dubhe-Star" ? "Dubhe" : id;
  const exact = starInfoList.find((star) => star.id === normalized || star.id === id);
  if (exact) return exact;

  const caseInsensitiveId = normalized.toLocaleLowerCase("en-US");
  return starInfoList.find(
    (star) => star.id.toLocaleLowerCase("en-US") === caseInsensitiveId,
  );
}

export function formatLocalizedStarFact(
  id: string,
  locale: StarLocale,
  speaker: string,
): string | null {
  const star = findStarInfo(id);
  if (!star) return null;

  const openQuote = locale === "ru" ? "«" : "“";
  const closeQuote = locale === "ru" ? "»" : "”";
  return `${speaker}: ${openQuote}${formatLocalizedStarFactText(id, locale)}${closeQuote}`;
}

export function formatLocalizedStarFactText(
  id: string,
  locale: StarLocale,
): string | null {
  const star = findStarInfo(id);
  if (!star) return null;
  return `${getLocalizedStarName(star, locale)}. ${getLocalizedStarDescription(star, locale)}`;
}
