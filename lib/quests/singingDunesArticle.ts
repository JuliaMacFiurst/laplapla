import type { Lang } from "@/i18n";

export const SINGING_DUNES_ARTICLE_ROUTE = "/quests/sound-case-001/singing-dunes";

const STICKER_BASE = "https://media.laplapla.com/stickers/singing-dune-stickers";
const stickerFileNames = [
  "1-sticker-1.webp",
  ...Array.from({ length: 23 }, (_, index) => `singing-dune-stickers-sticker-${index + 2}.webp`),
] as const;

export const SINGING_DUNE_STICKERS = stickerFileNames.map((fileName) => ({
  fileName,
  url: `${STICKER_BASE}/${fileName}`,
}));

export const SINGING_DUNE_ARTICLE_COVER_URL = SINGING_DUNE_STICKERS[2]!.url;

export const SINGING_DUNE_SOURCES = [
  {
    href: "https://www.nps.gov/places/kelso-dunes.htm",
    label: "National Park Service — Kelso Dunes",
  },
  {
    href: "https://doi.org/10.1029/2007GL030276",
    label: "Vriend et al. — Solving the mystery of booming sand dunes",
  },
  {
    href: "https://doi.org/10.1063/1.3435411",
    label: "Vriend & Hunt — The waveguide theory for booming sand dunes",
  },
  {
    href: "https://doi.org/10.1088/0034-4885/75/2/026602",
    label: "Bruno Andreotti — The song of dunes as a wave-particle mode locking",
  },
  {
    href: "https://www.caltech.edu/about/news/science-seat-pants-880",
    label: "Caltech — Science by the Seat of the Pants",
  },
] as const;

export type SingingDunesSection = {
  id: string;
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
  note?: string;
  stickerIndices: readonly number[];
};

export type SingingDunesArticleCopy = {
  pageTitle: string;
  metaDescription: string;
  back: string;
  eyebrow: string;
  title: string;
  dek: string;
  boom: string;
  audio: {
    title: string;
    note: string;
    caption: string;
    playLabel: string;
    pauseLabel: string;
    error: string;
  };
  sections: readonly SingingDunesSection[];
  chainTitle: string;
  chain: readonly string[];
  finale: readonly string[];
  readMore: string;
};

const copy: Record<Lang, SingingDunesArticleCopy> = {
  ru: {
    pageTitle: "Почему дюна поёт?",
    metaDescription: "Весёлая научная история о поющих дюнах, песчаных лавинах и миллионах зёрен, которые внезапно начинают звучать вместе.",
    back: "Назад в Хаб",
    eyebrow: "ПОЛЕВАЯ ТЕТРАДЬ · SOUND CASE #001",
    title: "ПОЧЕМУ ДЮНА ПОЁТ?",
    dek: "Короткий ответ: потому что миллионы песчинок умеют устроить очень странный хор. Длинный ответ намного веселее.",
    boom: "У-У-У-У-УМ",
    audio: {
      title: "ПОСЛУШАТЬ ДЮНУ",
      note: "«Да. Она действительно так делает.»",
      caption: "Настоящая запись поющей дюны",
      playLabel: "Включить запись поющей дюны",
      pauseLabel: "Поставить запись поющей дюны на паузу",
      error: "Не удалось включить запись. Попробуйте ещё раз.",
    },
    sections: [
      {
        id: "hello",
        title: "Пустыня включила бас",
        paragraphs: [
          "Представьте пустыню. Жара. Ветер. Песок. Вы съезжаете с огромной дюны, и земля вдруг начинает гудеть.",
          "Не шуршать. Не «ш-ш-ш». Именно гудеть. Поздравляем: вы нашли поющую дюну. И нет, внутри никто не забыл выключить колонку.",
          "Учёные называют это booming sand — гудящий, или «гремящий», песок. У исследованных дюн основной тон часто лежит примерно между 70 и 110 Hz. Сверху к нему добавляются гармоники, поэтому целая гора звучит как огромный низкий инструмент.",
        ],
        note: "70–110 Hz — это очень низко. Такой звук слышат ушами и иногда чувствуют всем телом.",
        stickerIndices: [0, 7],
      },
      {
        id: "where",
        title: "Где песок даёт концерты?",
        paragraphs: [
          "Такие места редкие. Научные обзоры описывают десятки известных поющих дюн, но список не высечен в камне — новые места находят, а старые не всегда звучат при любой погоде.",
          "Известные сцены пустынного турне: Kelso Dunes и Eureka Dunes в California, Sand Mountain в Nevada, Dumont Dunes, дюны Morocco, China и Gobi, Chile и другие документированные места.",
        ],
        bullets: ["Kelso · California", "Eureka · California", "Sand Mountain · Nevada", "Dumont · California", "Morocco", "China · Gobi", "Chile"],
        note: "У дюны нет расписания концертов. Влажность, ветер и состояние склона могут отменить выступление.",
        stickerIndices: [3, 12, 18],
      },
      {
        id: "recipe",
        title: "Рецепт певучего песка",
        paragraphs: [
          "Одного красивого песка мало. Нужен сухой верхний слой, подходящий крутой склон и много песка, движущегося с подходящей скоростью. Зёрна часто хорошо отсортированы, близки по размеру и довольно округлые или сглаженные.",
          "В нескольких известных измерениях характерные размеры зёрен были порядка долей миллиметра — примерно 0.18–0.32 mm. Это пример, а не паспортный контроль: не все поющие пески мира обязаны строго попасть в этот диапазон.",
        ],
        bullets: ["сухой песок", "много движущихся зёрен", "похожие размеры", "округлая поверхность", "подходящий склон", "правильная скорость лавины"],
        note: "Можно принести домой прекрасный мешок песка. Поставить на кухне. Ждать концерт. Песок ответит: «мешок».",
        stickerIndices: [1, 5, 10],
      },
      {
        id: "how",
        title: "Почему он звучит?",
        paragraphs: [
          "Одна песчинка — ничего особенного. Миллионы зёрен в лавине движутся, сталкиваются и частично синхронизируются. Возникают колебания, а песчаная масса и строение сухого поверхностного слоя помогают некоторым из них усилиться.",
          "Поэтому объяснение не сводится к фразе «песчинки просто трутся». Важны коллективное движение, волны и устройство самой дюны.",
          "Один ребёнок топнул: топ. Тысяча детей топает как попало: шум. Тысяча детей вдруг топает вместе: ТОП. ТОП. ТОП. Вот теперь здание заметило.",
        ],
        note: "Главный трюк природы — не одна громкая песчинка, а множество маленьких движений, которые начинают работать вместе.",
        stickerIndices: [6, 8, 13],
      },
      {
        id: "scientists",
        title: "Учёные спорят. Дюна гудит.",
        paragraphs: [
          "Bruno Andreotti, Stéphane Douady и коллеги исследовали коллективное движение и синхронизацию зёрен. Nathalie Vriend, Melany Hunt и команда Caltech изучали внутреннюю структуру дюны и распространение волн в сухом поверхностном слое.",
          "Ralph Bagnold задолго до этого стал одной из ключевых фигур физики песка и дюн. Но история не свелась к одной волшебной формуле: детали моделей проверяли, обсуждали и оспаривали разные группы.",
          "Учёный: «Дюна работает вот так». Другой учёный: «Не совсем. Вот мои измерения». Первый: «А вот мои». Дюна: «У-У-У-У-УМ».",
        ],
        stickerIndices: [9, 14],
      },
      {
        id: "legends",
        title: "Демон или гранулярная физика?",
        paragraphs: [
          "Путешественники слышали пустынные звуки задолго до микрофонов. Марко Поло писал о загадочных звуках Gobi, которые связывали с духами, барабанами и странной музыкой. Charles Darwin тоже упоминал звучащий песок во время путешествий в Chile.",
          "Год примерно 1275. Ночь. Пустыня. Физики гранулированных сред ещё не родились. YouTube почему-то не грузится. Из темноты: УУУУУУУУМ.",
          "Версия A: коллективное движение гранул и упругие волны. Версия B: ДЕМОН. Для XIII века версия B выглядит подозрительно конкурентоспособно.",
        ],
        stickerIndices: [4, 15, 19],
      },
      {
        id: "why",
        title: "Зачем это науке?",
        paragraphs: [
          "Песок — гранулярный материал: огромная толпа отдельных частиц. Так же устроены зерно, сахар, порошки, руда, строительные смеси и фармацевтические гранулы. Они могут течь как жидкость, держаться как твёрдое тело и внезапно устраивать лавину.",
          "Поющие дюны помогают изучать трение, столкновения, коллективное движение, granular avalanches, распространение волн и внутреннюю структуру песчаных слоёв. Эти идеи интересны и planetary science, но дюна пока не стала волшебным прибором для чтения других планет.",
        ],
        stickerIndices: [11, 16, 20],
      },
    ],
    chainTitle: "Как собрать песчаный БУМ",
    chain: ["сухой песок", "лавина", "миллионы похожих зёрен движутся", "движение частично синхронизируется", "возникают колебания", "структура слоя влияет на звук", "БУУУУУУУУУМ 🏜️🎵"],
    finale: [
      "По отдельности каждая песчинка умеет примерно ничего. Но миллионы песчинок вместе могут превратить целую гору в музыкальный инструмент.",
      "Так что если однажды капибара вытряхнет песок из кармана, а он вдруг запоёт, не паникуйте. Сначала исключите демонов. А потом зовите физика.",
    ],
    readMore: "Почитать дальше",
  },
  en: {
    pageTitle: "Why Does a Dune Sing?",
    metaDescription: "A funny science story about booming dunes, sand avalanches, and millions of grains that suddenly find the beat.",
    back: "Back to the Hub",
    eyebrow: "FIELD NOTEBOOK · SOUND CASE #001",
    title: "WHY DOES A DUNE SING?",
    dek: "Short answer: millions of sand grains can form a very strange choir. The long answer is much more fun.",
    boom: "BOOOOOOOOM",
    audio: {
      title: "LISTEN TO THE DUNE",
      note: "“Yes. It really does that.”",
      caption: "A real recording of a singing dune",
      playLabel: "Play the singing dune recording",
      pauseLabel: "Pause the singing dune recording",
      error: "The recording could not be played. Please try again.",
    },
    sections: [
      { id: "hello", title: "The desert turns up the bass", paragraphs: ["Picture a desert. Heat. Wind. Sand. You slide down a giant dune—and the ground starts to hum.", "Not rustle. Not shhh. Hum. Congratulations: you found a singing dune. And no, nobody left a speaker on inside it.", "Scientists call this booming sand. In well-studied dunes, the main note is often around 70–110 Hz, with higher harmonics above it. A whole hill becomes one enormous low instrument."], note: "70–110 Hz is low. You can hear it with your ears—and sometimes feel it in your body.", stickerIndices: [0, 7] },
      { id: "where", title: "Where does sand give concerts?", paragraphs: ["These places are rare. Scientific reviews describe dozens of known booming sites, but the list is not forever fixed. New sites appear, and a famous dune will not sing in every kind of weather.", "The desert tour includes Kelso and Eureka Dunes in California, Sand Mountain in Nevada, Dumont Dunes, dunes in Morocco, China and the Gobi, Chile, and other documented sites."], bullets: ["Kelso · California", "Eureka · California", "Sand Mountain · Nevada", "Dumont · California", "Morocco", "China · Gobi", "Chile"], note: "Dunes do not publish concert times. Moisture, wind, and the condition of the slope may cancel the show.", stickerIndices: [3, 12, 18] },
      { id: "recipe", title: "A recipe for musical sand", paragraphs: ["Pretty sand is not enough. You need a dry upper layer, the right steep slope, and lots of sand moving at the right speed. The grains are often well sorted, close in size, and fairly round or smooth.", "Measurements at several famous dunes found grain sizes on the scale of fractions of a millimetre—roughly 0.18–0.32 mm. That is an example, not a passport rule for every singing sand on Earth."], bullets: ["dry sand", "many moving grains", "similar sizes", "smooth grains", "the right slope", "the right avalanche speed"], note: "You can bring home a beautiful bag of sand. Put it in the kitchen. Wait for the concert. The sand replies: “bag.”", stickerIndices: [1, 5, 10] },
      { id: "how", title: "So why does it make a sound?", paragraphs: ["One grain is no big deal. Millions of grains in an avalanche move, collide, and partly synchronize. Vibrations appear. The moving mass and the structure of the dry surface layer help some vibrations grow stronger.", "So the answer is not simply “the grains rub together.” Collective motion, waves, and the inside of the dune all matter.", "One child stomps: thump. A thousand children stomp randomly: noise. A thousand children suddenly stomp together: THUMP. THUMP. THUMP. Now the building notices."], note: "Nature’s trick is not one loud grain. It is many tiny movements beginning to work together.", stickerIndices: [6, 8, 13] },
      { id: "scientists", title: "Scientists argue. The dune booms.", paragraphs: ["Bruno Andreotti, Stéphane Douady, and colleagues studied collective grain motion and synchronization. Nathalie Vriend, Melany Hunt, and the Caltech team investigated the dune’s inner structure and waves in its dry surface layer.", "Ralph Bagnold had already become a key figure in the physics of sand and dunes. But the story never collapsed into one magic formula. Different teams tested, debated, and refined the details.", "Scientist: “I think the dune works like this.” Another scientist: “Not quite. Here are my measurements.” The first: “Here are mine.” Dune: “BOOOOOOM.”"], stickerIndices: [9, 14] },
      { id: "legends", title: "A demon, or granular physics?", paragraphs: ["Travellers heard desert sounds long before microphones. Marco Polo described mysterious sounds in the Gobi and linked them to spirits, drums, and strange music. Charles Darwin also wrote about sounding sand during his travels in Chile.", "The year is about 1275. Night. Desert. Granular physicists have not been invented. YouTube refuses to load. From the dark: BOOOOOOOOM.", "Option A: collective grain motion and elastic waves. Option B: DEMON. In the thirteenth century, option B is suspiciously competitive."], stickerIndices: [4, 15, 19] },
      { id: "why", title: "Why should science care?", paragraphs: ["Sand is a granular material: a huge crowd of separate particles. So are grain, sugar, powders, ore, building mixes, and pharmaceutical granules. They can flow like a liquid, hold like a solid, and suddenly avalanche.", "Booming dunes help researchers study friction, collisions, collective motion, granular avalanches, wave travel, and the inner structure of sand layers. The ideas also interest planetary science—but booming dunes are not a magic tool for reading other planets."], stickerIndices: [11, 16, 20] },
    ],
    chainTitle: "How to build a sandy BOOM",
    chain: ["dry sand", "an avalanche", "millions of similar grains move", "their motion partly synchronizes", "vibrations appear", "the sand layer shapes the sound", "BOOOOOOOOM 🏜️🎵"],
    finale: ["Alone, each grain of sand can do approximately nothing. Together, millions of grains can turn a whole mountain into a musical instrument.", "So if a capybara ever shakes sand from a pocket and it starts to sing, do not panic. Rule out demons first. Then call a physicist."],
    readMore: "Read more",
  },
  he: {
    pageTitle: "למה הדיונה שרה?",
    metaDescription: "סיפור מדעי מצחיק על דיונות מזמרות, מפולות חול ומיליוני גרגרים שפתאום מוצאים קצב משותף.",
    back: "חזרה להאב",
    eyebrow: "מחברת שטח · SOUND CASE #001",
    title: "למה הדיונה שרה?",
    dek: "התשובה הקצרה: מיליוני גרגרי חול יודעים להקים מקהלה ממש מוזרה. התשובה הארוכה הרבה יותר כיפית.",
    boom: "בוווווווום",
    audio: {
      title: "להקשיב לדיונה",
      note: "״כן. היא באמת עושה את זה.״",
      caption: "הקלטה אמיתית של דיונה מזמרת",
      playLabel: "להשמיע הקלטה של דיונה מזמרת",
      pauseLabel: "להשהות את ההקלטה של הדיונה",
      error: "לא הצלחנו להשמיע את ההקלטה. נסו שוב.",
    },
    sections: [
      { id: "hello", title: "המדבר מגביר את הבס", paragraphs: ["דמיינו מדבר. חום. רוח. חול. אתם גולשים מדיונה ענקית—ופתאום האדמה מתחילה לזמזם.", "לא רשרוש. לא ששש. ממש זמזום עמוק. מזל טוב: מצאתם דיונה מזמרת. ולא, אף אחד לא שכח רמקול בפנים.", "המדענים קוראים לזה booming sand. בדיונות שנחקרו היטב, הצליל הראשי נמצא לעיתים קרובות סביב 70–110 Hz, ומעליו נשמעות הרמוניות. הר שלם הופך לכלי נגינה נמוך ועצום."], note: "70–110 Hz הוא צליל נמוך מאוד. שומעים אותו באוזניים—ולפעמים מרגישים אותו בכל הגוף.", stickerIndices: [0, 7] },
      { id: "where", title: "איפה החול נותן הופעות?", paragraphs: ["המקומות האלה נדירים. סקירות מדעיות מתארות עשרות אתרים מוכרים, אבל הרשימה לא קבועה לנצח. מגלים מקומות חדשים, וגם דיונה מפורסמת לא שרה בכל מזג אוויר.", "בסיבוב ההופעות המדברי נמצאות Kelso ו־Eureka ב־California, ‏Sand Mountain ב־Nevada, ‏Dumont Dunes, דיונות ב־Morocco, ב־China וב־Gobi, ב־Chile ועוד אתרים מתועדים."], bullets: ["Kelso · California", "Eureka · California", "Sand Mountain · Nevada", "Dumont · California", "Morocco", "China · Gobi", "Chile"], note: "לדיונות אין לוח הופעות. לחות, רוח ומצב המדרון עלולים לבטל את הקונצרט.", stickerIndices: [3, 12, 18] },
      { id: "recipe", title: "מתכון לחול מוזיקלי", paragraphs: ["חול יפה לא מספיק. צריך שכבה עליונה יבשה, מדרון תלול ומתאים, והרבה חול שנע במהירות הנכונה. הגרגרים בדרך כלל ממוינים היטב, דומים בגודל, ועגולים או חלקים למדי.", "בכמה דיונות מפורסמות נמדדו גרגרים בגודל של שברי מילימטר—בערך 0.18–0.32 mm. זו דוגמה, לא ביקורת דרכונים לכל חולות העולם."], bullets: ["חול יבש", "המון גרגרים בתנועה", "גדלים דומים", "גרגרים חלקים", "מדרון מתאים", "מהירות מפולת מתאימה"], note: "אפשר להביא הביתה שק חול נהדר. להניח במטבח. לחכות לקונצרט. החול יענה: ״שק״.", stickerIndices: [1, 5, 10] },
      { id: "how", title: "אז למה שומעים צליל?", paragraphs: ["גרגר אחד לא עושה הרבה. מיליוני גרגרים במפולת נעים, מתנגשים ומסתנכרנים חלקית. נוצרות תנודות, ומסת החול והמבנה של השכבה היבשה עוזרים לחלק מהן להתחזק.", "לכן התשובה אינה רק ״הגרגרים מתחככים״. התנועה המשותפת, הגלים והמבנה הפנימי של הדיונה חשובים כולם.", "ילד אחד דורך: בום קטן. אלף ילדים דורכים בלי סדר: רעש. אלף ילדים דורכים יחד: בום. בום. בום. עכשיו הבניין שם לב."], note: "הטריק של הטבע הוא לא גרגר אחד רועש. אלה המון תנועות קטנות שמתחילות לעבוד יחד.", stickerIndices: [6, 8, 13] },
      { id: "scientists", title: "המדענים מתווכחים. הדיונה מזמזמת.", paragraphs: ["Bruno Andreotti, ‏Stéphane Douady ועמיתיהם חקרו תנועה משותפת וסנכרון של גרגרים. Nathalie Vriend, ‏Melany Hunt וצוות Caltech חקרו את המבנה הפנימי של הדיונה ואת הגלים בשכבת החול היבשה.", "Ralph Bagnold היה עוד קודם דמות חשובה בפיזיקה של חול ודיונות. אבל הסיפור לא הצטמצם לנוסחת קסם אחת. קבוצות שונות בדקו, התווכחו ושיפרו את הפרטים.", "מדען: ״לדעתי הדיונה עובדת ככה״. מדען אחר: ״לא בדיוק. הנה המדידות שלי״. הראשון: ״והנה שלי״. הדיונה: ״בוווווווום״."], stickerIndices: [9, 14] },
      { id: "legends", title: "שד או פיזיקה גרגרית?", paragraphs: ["נוסעים שמעו קולות במדבר הרבה לפני שהיו מיקרופונים. Marco Polo תיאר קולות מסתוריים ב־Gobi וקישר אותם לרוחות, תופים ומוזיקה מוזרה. גם Charles Darwin כתב על חול משמיע קול במסעותיו ב־Chile.", "השנה בערך 1275. לילה. מדבר. פיזיקאים של חומרים גרגריים עוד לא נולדו. YouTube משום מה לא נטען. מתוך החושך: בוווווווום.", "אפשרות א׳: תנועה משותפת של גרגרים וגלים אלסטיים. אפשרות ב׳: שד. במאה ה־13 אפשרות ב׳ נראית תחרותית באופן חשוד."], stickerIndices: [4, 15, 19] },
      { id: "why", title: "למה זה מעניין את המדע?", paragraphs: ["חול הוא חומר גרגרי: קהל ענקי של חלקיקים נפרדים. כך גם דגנים, סוכר, אבקות, עפרות, תערובות בנייה וגרגרים לתרופות. הם יכולים לזרום כמו נוזל, להחזיק כמו מוצק ופתאום להפוך למפולת.", "דיונות מזמרות עוזרות לחקור חיכוך, התנגשויות, תנועה משותפת, מפולות גרגריות, התפשטות גלים והמבנה הפנימי של שכבות חול. זה מעניין גם את מדעי כוכבי הלכת—אבל הדיונה עדיין אינה מכשיר קסם לקריאת כוכבים אחרים."], stickerIndices: [11, 16, 20] },
    ],
    chainTitle: "כך בונים בום מחול",
    chain: ["חול יבש", "מפולת", "מיליוני גרגרים דומים נעים", "התנועה מסתנכרנת חלקית", "נוצרות תנודות", "שכבת החול מעצבת את הצליל", "בוווווווום 🏜️🎵"],
    finale: ["לבד, כל גרגר חול יודע לעשות בערך כלום. יחד, מיליוני גרגרים יכולים להפוך הר שלם לכלי נגינה.", "אז אם קפיברה תנער יום אחד חול מהכיס והוא יתחיל לשיר, אל תיבהלו. קודם שוללים שדים. אחר כך קוראים לפיזיקאי או לפיזיקאית."],
    readMore: "רוצים לקרוא עוד?",
  },
};

export function getSingingDunesArticleCopy(lang: Lang) {
  return copy[lang];
}
