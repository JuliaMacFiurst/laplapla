import type { Lang } from "@/i18n";

const takeoffHints: Record<Lang, Record<string, string>> = {
  ru: {
    "switcher-on-1": "Перед взлётом пилоты проверяют приборы, положение штурвала и полосу. Если что‑то не так, взлёт отменяют.",
    "switcher-on-2": "Самолёт отрывается от земли благодаря подъёмной силе крыла. Воздух сверху идёт быстрее, и крыло начинает поднимать самолёт.",
    "switcher-on-3": "При взлёте штурвал тянут плавно. Резкий рывок может привести к потере подъёмной силы.",
    "switcher-on-4": "Для отрыва нужна определённая скорость. Пока её нет, самолёт должен оставаться на земле.",
    "switcher-on-5": "Руль высоты поднимает или опускает нос самолёта. Нос вверх — самолёт идёт выше, нос вниз — опускается.",
    "switcher-on-6": "Педали управляют рулём направления и помогают держать самолёт ровно по оси полосы.",
    "switcher-on-7": "Закрылки слегка выпускают на взлёте, чтобы крыло поднимало самолёт уже на меньшей скорости.",
    "switcher-on-8": "Встречный ветер помогает взлёту, а попутный делает разбег длиннее и сложнее.",
    "switcher-on-9": "После отрыва пилоты держат правильный угол набора. Слишком круто нельзя — скорость упадёт.",
    "switcher-on-10": "Тропосфера — дом облаков и погоды. Выше находится стратосфера, где воздух спокойнее, и самолёты летят мягче.",
    "switcher-on-11": "Во время шторма пилот держит самолёт ровно и спокойно, обходя самые тяжёлые облака.",
    "switcher-on-12": "Автопилот включают не сразу. Сначала пилот должен стабилизировать самолёт вручную.",
    "switcher-on-13": "Если двигатель ведёт себя странно, пилот может прервать взлёт. В авиации вовремя остановиться тоже смелость.",
    "switcher-on-14": "Северное сияние — это свет заряженных частиц в небе. Для пилотов на севере это красивое, но обычное зрелище.",
  },
  en: {
    "switcher-on-1": "Before takeoff, pilots check the instruments, the yoke position, and the runway. If something is wrong, the takeoff is canceled.",
    "switcher-on-2": "An airplane leaves the ground because the wing creates lift. Air moves faster above the wing, and the wing starts lifting the plane.",
    "switcher-on-3": "During takeoff, the yoke is pulled back smoothly. A sudden jerk can make the wing lose lift.",
    "switcher-on-4": "The plane needs a specific speed to lift off. Until it reaches that speed, it must stay on the ground.",
    "switcher-on-5": "The elevator raises or lowers the airplane’s nose. Nose up means climbing, nose down means descending.",
    "switcher-on-6": "The pedals control the rudder and help keep the airplane aligned with the runway centerline.",
    "switcher-on-7": "Flaps are slightly extended for takeoff so the wing can lift the airplane at a lower speed.",
    "switcher-on-8": "A headwind helps takeoff, while a tailwind makes the takeoff roll longer and harder.",
    "switcher-on-9": "After liftoff, pilots keep the right climb angle. Too steep and the speed drops.",
    "switcher-on-10": "The troposphere is where clouds and weather live. Above it is the calmer stratosphere, where planes fly more smoothly.",
    "switcher-on-11": "In a storm, a pilot keeps the aircraft steady and avoids the darkest clouds.",
    "switcher-on-12": "Autopilot is not turned on immediately. First, the pilot stabilizes the airplane by hand.",
    "switcher-on-13": "If an engine behaves strangely, a pilot may abort the takeoff. In aviation, stopping in time is also courage.",
    "switcher-on-14": "The aurora is light from charged particles in the sky. For pilots flying north, it is a beautiful but familiar sight.",
  },
  he: {
    "switcher-on-1": "לפני המראה הטייסים בודקים את המכשירים, את מצב ההגה ואת המסלול. אם משהו לא תקין, מבטלים את ההמראה.",
    "switcher-on-2": "מטוס מתרומם מהקרקע כי הכנף יוצרת כוח עילוי. האוויר עובר מהר יותר מעל הכנף והיא מתחילה להרים את המטוס.",
    "switcher-on-3": "בהמראה מושכים את ההגה בעדינות. משיכה חדה מדי עלולה לגרום לכנף לאבד עילוי.",
    "switcher-on-4": "כדי להתרומם צריך מהירות מסוימת. עד שהמטוס מגיע אליה, הוא חייב להישאר על הקרקע.",
    "switcher-on-5": "הגה הגובה מרים או מוריד את אף המטוס. אף למעלה פירושו עלייה, אף למטה פירושו ירידה.",
    "switcher-on-6": "הדוושות שולטות בהגה הכיוון ועוזרות לשמור את המטוס ישר על ציר המסלול.",
    "switcher-on-7": "מדפים נפתחים מעט בזמן ההמראה כדי שהכנף תוכל להרים את המטוס גם במהירות נמוכה יותר.",
    "switcher-on-8": "רוח נגדית עוזרת להמראה, ורוח גבית הופכת את הריצה על המסלול לארוכה וקשה יותר.",
    "switcher-on-9": "אחרי הניתוק מהקרקע הטייסים שומרים על זווית טיפוס נכונה. אם הזווית חדה מדי, המהירות תרד.",
    "switcher-on-10": "הטרופוספירה היא הבית של העננים ומזג האוויר. מעליה נמצאת הסטרטוספירה השקטה יותר, שבה המטוסים טסים בצורה חלקה יותר.",
    "switcher-on-11": "בסערה הטייס שומר על המטוס יציב ונמנע מהעננים הכבדים ביותר.",
    "switcher-on-12": "לא מפעילים טייס אוטומטי מיד. קודם הטייס מייצב את המטוס ידנית.",
    "switcher-on-13": "אם מנוע מתנהג בצורה מוזרה, הטייס יכול להפסיק את ההמראה. בתעופה גם לדעת לעצור בזמן זו אומץ.",
    "switcher-on-14": "הזוהר הצפוני הוא אור של חלקיקים טעונים בשמיים. לטייסים שטסים צפונה זה מראה יפה ומוכר.",
  },
};

export function getTakeoffHints(lang: Lang) {
  return takeoffHints[lang] ?? takeoffHints.ru;
}
