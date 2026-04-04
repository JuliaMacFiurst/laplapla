import type { Lang } from "@/i18n";

export type FlightDialogueStep = {
  id: string;
  speaker: "roland" | "logan";
  text: string;
  condition: "straight" | "arc" | "zigzag" | "afterCorrect";
};

export type SeaDialogueStep = {
  id: string;
  speaker: "roland" | "logan";
  text: string;
};

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

const flightDialogs: Record<Lang, FlightDialogueStep[]> = {
  ru: [
    { id: "straight_1", speaker: "logan", text: "Ты провёл прямую линию. Выглядит красиво… но так будет дольше!", condition: "straight" },
    { id: "straight_2", speaker: "roland", text: "Это совершенно нелогично! Прямой путь всегда самый быстрый!", condition: "straight" },
    { id: "straight_3", speaker: "logan", text: "Только если Земля — лист бумаги. Но она круглая! На шарике прямые превращаются в дуги.", condition: "straight" },
    { id: "straight_4", speaker: "roland", text: "То есть… “у-прямая линия” не хочет гнуться и не огибает землю по-дуге?", condition: "straight" },
    { id: "straight_5", speaker: "logan", text: "Верно! А ещё эта прямая называется локсодромия — линия, которая упрямо идёт под одним углом. Удобная, но НЕ самая короткая.", condition: "straight" },
    { id: "arc_1", speaker: "roland", text: "Вот это уже похоже на настоящий авиамаршрут.", condition: "arc" },
    { id: "arc_2", speaker: "logan", text: "Это ортодромия — коротчайший путь по круглой Земле!", condition: "arc" },
    { id: "arc_3", speaker: "roland", text: "Кривая, но быстрая. Как будто Земля сама говорит: «Иди по дуге — я же круглая!»", condition: "arc" },
    { id: "zigzag_1", speaker: "logan", text: "Ух ты! Маршрут для самолёта, у которого сломался навигатор и приходится спрашивать дорогу, приземляясь в аэропортах!", condition: "zigzag" },
    { id: "zigzag_2", speaker: "roland", text: "Зигзаг хорош, если хочешь лететь три года…", condition: "zigzag" },
    { id: "zigzag_3", speaker: "logan", text: "Но если хочешь добраться быстро — выбирай дугу!", condition: "zigzag" },
    { id: "afterCorrect_1", speaker: "logan", text: "Ты выбрал самый быстрый путь для самолёта!", condition: "afterCorrect" },
    { id: "afterCorrect_2", speaker: "roland", text: "Теперь мы готовы поделиться с тобой нашими секретами.", condition: "afterCorrect" },
    { id: "afterCorrect_3", speaker: "logan", text: "Жми на штурвалы под нами, чтобы узнать больше!", condition: "afterCorrect" },
  ],
  en: [
    { id: "straight_1", speaker: "logan", text: "You drew a straight line. It looks neat... but it will take longer!", condition: "straight" },
    { id: "straight_2", speaker: "roland", text: "That makes no sense at all! A straight path is always the fastest!", condition: "straight" },
    { id: "straight_3", speaker: "logan", text: "Only if Earth were a sheet of paper. But it is round. On a sphere, the shortest paths curve.", condition: "straight" },
    { id: "straight_4", speaker: "roland", text: "So... an ordinary straight line does not bend and follow Earth in an arc?", condition: "straight" },
    { id: "straight_5", speaker: "logan", text: "Exactly. And that straight line has a name: a rhumb line, a route that stubbornly keeps one angle. Handy, but NOT the shortest.", condition: "straight" },
    { id: "arc_1", speaker: "roland", text: "Now that looks like a real flight route.", condition: "arc" },
    { id: "arc_2", speaker: "logan", text: "That is an orthodrome, the shortest path over a round Earth!", condition: "arc" },
    { id: "arc_3", speaker: "roland", text: "Curved, but fast. As if Earth itself says, 'Take the arc, I am round!'", condition: "arc" },
    { id: "zigzag_1", speaker: "logan", text: "Wow! A route for an airplane with a broken navigator that has to ask for directions by landing at airports!", condition: "zigzag" },
    { id: "zigzag_2", speaker: "roland", text: "A zigzag is great if you want to fly for three years...", condition: "zigzag" },
    { id: "zigzag_3", speaker: "logan", text: "But if you want to arrive quickly, choose the arc!", condition: "zigzag" },
    { id: "afterCorrect_1", speaker: "logan", text: "You chose the fastest route for an airplane!", condition: "afterCorrect" },
    { id: "afterCorrect_2", speaker: "roland", text: "Now we are ready to share our secrets with you.", condition: "afterCorrect" },
    { id: "afterCorrect_3", speaker: "logan", text: "Press the yokes below us to learn more!", condition: "afterCorrect" },
  ],
  he: [
    { id: "straight_1", speaker: "logan", text: "ציירת קו ישר. זה נראה יפה... אבל זה יהיה ארוך יותר!", condition: "straight" },
    { id: "straight_2", speaker: "roland", text: "זה בכלל לא הגיוני! דרך ישרה תמיד הכי מהירה!", condition: "straight" },
    { id: "straight_3", speaker: "logan", text: "רק אם כדור הארץ היה דף נייר. אבל הוא עגול. על כדור, המסלול הקצר ביותר נראה כמו קשת.", condition: "straight" },
    { id: "straight_4", speaker: "roland", text: "כלומר... קו ישר רגיל לא מתכופף ולא עוקב אחרי כדור הארץ בקשת?", condition: "straight" },
    { id: "straight_5", speaker: "logan", text: "בדיוק. והקו הזה נקרא לוקסודרום, מסלול ששומר בעקשנות על אותה זווית. נוח, אבל לא הכי קצר.", condition: "straight" },
    { id: "arc_1", speaker: "roland", text: "זה כבר נראה כמו מסלול טיסה אמיתי.", condition: "arc" },
    { id: "arc_2", speaker: "logan", text: "זו אורתודרומיה, הדרך הקצרה ביותר על פני כדור הארץ!", condition: "arc" },
    { id: "arc_3", speaker: "roland", text: "עקום, אבל מהיר. כאילו כדור הארץ עצמו אומר: 'לך בקשת, אני הרי עגול!'", condition: "arc" },
    { id: "zigzag_1", speaker: "logan", text: "וואו! מסלול למטוס שהנווט שלו התקלקל והוא צריך לשאול דרך בכל שדה תעופה!", condition: "zigzag" },
    { id: "zigzag_2", speaker: "roland", text: "זיגזג מצוין אם רוצים לטוס שלוש שנים...", condition: "zigzag" },
    { id: "zigzag_3", speaker: "logan", text: "אבל אם רוצים להגיע מהר, בוחרים בקשת!", condition: "zigzag" },
    { id: "afterCorrect_1", speaker: "logan", text: "בחרת את המסלול המהיר ביותר למטוס!", condition: "afterCorrect" },
    { id: "afterCorrect_2", speaker: "roland", text: "עכשיו אנחנו מוכנים לשתף אותך בסודות שלנו.", condition: "afterCorrect" },
    { id: "afterCorrect_3", speaker: "logan", text: "לחץ על ההגאים מתחתינו כדי ללמוד עוד!", condition: "afterCorrect" },
  ],
};

const seaDialogs: Record<Lang, SeaDialogueStep[]> = {
  ru: [
    { id: "intro_1", speaker: "roland", text: "Логан, я думал, что море — это просто большая лужа. Плывёшь себе по прямой — и всё." },
    { id: "intro_2", speaker: "logan", text: "Это если в ванне плыть. А в северных морях всё меняется каждую неделю. Маршрут — как пазл." },
    { id: "ice_1", speaker: "roland", text: "Ты про айсберги говоришь? Они ведь плавают сами по себе." },
    { id: "ice_2", speaker: "logan", text: "Не только. В Баренцевом и Гренландском морях есть дрейфующие льды. Они закрывают привычные пути, и капитаны каждый раз строят маршрут заново." },
    { id: "ice_3", speaker: "roland", text: "То есть океан — живой? Типа сам двигает стены лабиринта?" },
    { id: "ice_4", speaker: "logan", text: "Именно. И иногда стена быстрее тебя. Поэтому лучший путь бывает там, где неделю назад был тупик." },
    { id: "current_1", speaker: "roland", text: "А почему опытные моряки не плывут по прямой? Это же короче." },
    { id: "current_2", speaker: "logan", text: "Потому что прямой путь может быть медленнее. Есть морские течения — такие подводные дороги. Сядешь на Норвежское течение, и корабль идёт быстрее, чем по прямой траектории." },
    { id: "current_3", speaker: "roland", text: "То есть море само помогает толкать корабль? Бесплатное топливо?" },
    { id: "current_4", speaker: "logan", text: "Вот именно. Умный капитан выбирает путь по течениям, а не по линейке." },
    { id: "storm_1", speaker: "roland", text: "А если просто держаться берега? Так безопаснее?" },
    { id: "storm_2", speaker: "logan", text: "Зависит от берега. В Северной Атлантике шторма такие, что корабли специально уходят подальше — там волны предсказуемее." },
    { id: "storm_3", speaker: "roland", text: "Значит, иногда лучше обойти шторм по огромной дуге, чем пробиваться через него?" },
    { id: "storm_4", speaker: "logan", text: "Конечно. Капитан выбирает не самый короткий, а самый безопасный маршрут." },
    { id: "depth_1", speaker: "roland", text: "А глубины тоже влияют на маршрут?" },
    { id: "depth_2", speaker: "logan", text: "Очень. В Баренцевом море есть подводные банки — мелкие места. Если не знать карту — сядешь на мель быстрее, чем приготовишь чай." },
    { id: "final_1", speaker: "roland", text: "Выходит, маршрут — это не линия, а решение капитана?" },
    { id: "final_2", speaker: "logan", text: "Точно. В море каждый маршрут — уникален. Даже если ты плывёшь туда же, куда вчера." },
    { id: "final_3", speaker: "roland", text: "Тогда я готов! Показывай, какие моря мы пройдём на нашем пути к Шпицбергену!" },
  ],
  en: [
    { id: "intro_1", speaker: "roland", text: "Logan, I thought the sea was just one giant puddle. You sail in a straight line and that is it." },
    { id: "intro_2", speaker: "logan", text: "Maybe in a bathtub. In northern seas, everything changes every week. A route is like a puzzle." },
    { id: "ice_1", speaker: "roland", text: "You mean icebergs? They drift on their own anyway." },
    { id: "ice_2", speaker: "logan", text: "Not only them. The Barents and Greenland Seas have drifting ice. It closes familiar paths, so captains rebuild the route every time." },
    { id: "ice_3", speaker: "roland", text: "So the ocean is alive? Like it moves the maze walls by itself?" },
    { id: "ice_4", speaker: "logan", text: "Exactly. And sometimes the wall moves faster than you. That is why the best path may be where there was a dead end a week ago." },
    { id: "current_1", speaker: "roland", text: "Why do experienced sailors not just go in a straight line? That should be shorter." },
    { id: "current_2", speaker: "logan", text: "Because a straight path may be slower. There are sea currents, underwater roads of a sort. Catch the Norwegian Current and the ship can move faster than on a direct line." },
    { id: "current_3", speaker: "roland", text: "So the sea itself helps push the ship along? Free fuel?" },
    { id: "current_4", speaker: "logan", text: "Exactly. A smart captain follows the currents, not a ruler." },
    { id: "storm_1", speaker: "roland", text: "What if we just stay close to shore? Would that be safer?" },
    { id: "storm_2", speaker: "logan", text: "It depends on the shore. In the North Atlantic, storms can be so fierce that ships go farther out because the waves are more predictable there." },
    { id: "storm_3", speaker: "roland", text: "So sometimes it is better to go around a storm in a huge arc than to push right through it?" },
    { id: "storm_4", speaker: "logan", text: "Of course. A captain chooses not the shortest route, but the safest one." },
    { id: "depth_1", speaker: "roland", text: "Do depths affect the route too?" },
    { id: "depth_2", speaker: "logan", text: "Very much. The Barents Sea has underwater banks, shallow places. If you do not know the map, you can run aground before you finish making tea." },
    { id: "final_1", speaker: "roland", text: "So a route is not a line, but the captain’s decision?" },
    { id: "final_2", speaker: "logan", text: "Exactly. At sea, every route is unique, even if you sail to the same place as yesterday." },
    { id: "final_3", speaker: "roland", text: "Then I am ready! Show me which seas we will cross on our way to Spitsbergen!" },
  ],
  he: [
    { id: "intro_1", speaker: "roland", text: "לוגן, חשבתי שהים הוא רק שלולית ענקית. מפליגים ישר וזהו." },
    { id: "intro_2", speaker: "logan", text: "אולי באמבטיה. בימים הצפוניים הכול משתנה כל שבוע. מסלול הוא כמו פאזל." },
    { id: "ice_1", speaker: "roland", text: "אתה מדבר על קרחונים? הרי הם צפים לבד." },
    { id: "ice_2", speaker: "logan", text: "לא רק. בים ברנץ ובים גרינלנד יש קרח נסחף. הוא סוגר נתיבים מוכרים, ולכן הקברניטים בונים את המסלול מחדש בכל פעם." },
    { id: "ice_3", speaker: "roland", text: "אז האוקיינוס חי? כאילו הוא מזיז את קירות המבוך בעצמו?" },
    { id: "ice_4", speaker: "logan", text: "בדיוק. ולפעמים הקיר נע מהר יותר ממך. לכן המסלול הכי טוב יכול להיות במקום שלפני שבוע היה מבוי סתום." },
    { id: "current_1", speaker: "roland", text: "ולמה מלחים מנוסים לא מפליגים ישר? זה הרי קצר יותר." },
    { id: "current_2", speaker: "logan", text: "כי לפעמים דרך ישרה איטית יותר. יש זרמי ים, כמו כבישים תת-ימיים. אם תתפוס את הזרם הנורווגי, הספינה תנוע מהר יותר מאשר בקו ישר." },
    { id: "current_3", speaker: "roland", text: "כלומר הים עצמו עוזר לדחוף את הספינה? דלק בחינם?" },
    { id: "current_4", speaker: "logan", text: "בדיוק. קפטן חכם בוחר מסלול לפי הזרמים, לא לפי סרגל." },
    { id: "storm_1", speaker: "roland", text: "ואם פשוט נישאר קרוב לחוף? זה לא בטוח יותר?" },
    { id: "storm_2", speaker: "logan", text: "זה תלוי בחוף. בצפון האוקיינוס האטלנטי יש סערות כל כך חזקות שספינות דווקא מתרחקות, כי שם הגלים צפויים יותר." },
    { id: "storm_3", speaker: "roland", text: "אז לפעמים עדיף לעקוף סערה בקשת גדולה מאשר לנסות לעבור דרכה?" },
    { id: "storm_4", speaker: "logan", text: "כמובן. קפטן בוחר לא את הדרך הקצרה ביותר, אלא את הבטוחה ביותר." },
    { id: "depth_1", speaker: "roland", text: "גם העומק משפיע על המסלול?" },
    { id: "depth_2", speaker: "logan", text: "מאוד. בים ברנץ יש שרטונים, אזורים רדודים. אם לא מכירים את המפה, אפשר להיתקע לפני שמספיקים להכין תה." },
    { id: "final_1", speaker: "roland", text: "אז מסלול הוא לא קו, אלא החלטה של הקפטן?" },
    { id: "final_2", speaker: "logan", text: "בדיוק. בים כל מסלול הוא ייחודי, אפילו אם מפליגים לאותו מקום כמו אתמול." },
    { id: "final_3", speaker: "roland", text: "אז אני מוכן! תראה לי דרך אילו ימים נעבור במסע שלנו לשפיצברגן!" },
  ],
};

const starDialogs: Record<Lang, StarDialogueStep[]> = {
  ru: [
    { id: "intro_1", speaker: "svensen", text: "Логан, я смотрю на небо… и вижу просто россыпь блёсток! Как можно что‑то понять в этом хаосе?", condition: "intro" },
    { id: "intro_2", speaker: "logan", text: "Это только сначала хаос. Есть звёзды‑подсказки. Они помогут найти север лучше любого компаса.", condition: "intro" },
    { id: "intro_3", speaker: "svensen", text: "Подсказки? У звёзд есть подсказки?! Покажи, какие именно!", condition: "intro" },
    { id: "intro_4", speaker: "logan", text: "Иногда достаточно трёх. Найди (1) Мерак и (2) Дубхе на карте звёздного неба и соедини их прямой линией — она укажет направление ⬆️!", condition: "intro" },
    { id: "wrong_merak_no_id", speaker: "logan", text: "Найди на карте звезду, которая называется Мерак, и кликни по ней.", condition: "wrong-star:merak_no_id" },
    { id: "wrong_merak_wrong_id", speaker: "logan", text: "Это #id, а мы ищем Мерак. Попробуй ещё раз!", condition: "wrong-star:merak_wrong_id" },
    { id: "wrong_dubhe_no_id", speaker: "logan", text: "Найди на карте звезду, которая называется Дубхе, и кликни по ней.", condition: "wrong-star:dubhe_no_id" },
    { id: "wrong_dubhe_wrong_id", speaker: "logan", text: "Это #id, а мы ищем Дубхе. Попробуй ещё раз.", condition: "wrong-star:dubhe_wrong_id" },
    { id: "merak_1", speaker: "logan", text: "Отлично! Мерак — первая указательная звезда. Молодец! Теперь найди звезду под названием Дубхе.", condition: "click_merak" },
    { id: "dubhe_1", speaker: "logan", text: "А вот и Дубхе! Теперь мы соединим её линией с Мераком — они показывают направление к Полярной звезде. Продолжи рисовать прямую линию вниз и посмотри, куда она ведёт.", condition: "click_dubhe" },
    { id: "wrong_1", speaker: "logan", text: "Посмотри ещё раз — линия должна идти от ковша в сторону Полярной, вниз по карте.", condition: "wrong_line" },
    { id: "polaris_1", speaker: "logan", text: "Вот она — Полярная! Она почти не двигается на небе, как настоящий небесный якорь.", condition: "click_polaris" },
    { id: "finish_1", speaker: "logan", text: "Ты справился! Теперь ты знаешь, как ориентироваться по звёздам — даже если компас танцует ламбаду.", condition: "finish" },
    { id: "finish_2", speaker: "svensen", text: "Йеее! Теперь я морской пёс со звёздным навигатором!", condition: "finish" },
  ],
  en: [
    { id: "intro_1", speaker: "svensen", text: "Logan, I look at the sky... and all I see is a glittery mess! How can anyone understand anything in this chaos?", condition: "intro" },
    { id: "intro_2", speaker: "logan", text: "It only looks like chaos at first. There are guide stars. They can show north better than any compass.", condition: "intro" },
    { id: "intro_3", speaker: "svensen", text: "Guide stars? Stars have clues?! Show me which ones!", condition: "intro" },
    { id: "intro_4", speaker: "logan", text: "Sometimes three are enough. Find (1) Merak and (2) Dubhe on the sky map and connect them with a straight line, it will point the way ⬆️!", condition: "intro" },
    { id: "wrong_merak_no_id", speaker: "logan", text: "Find the star called Merak on the map and click it.", condition: "wrong-star:merak_no_id" },
    { id: "wrong_merak_wrong_id", speaker: "logan", text: "That is #id, but we are looking for Merak. Try again!", condition: "wrong-star:merak_wrong_id" },
    { id: "wrong_dubhe_no_id", speaker: "logan", text: "Find the star called Dubhe on the map and click it.", condition: "wrong-star:dubhe_no_id" },
    { id: "wrong_dubhe_wrong_id", speaker: "logan", text: "That is #id, but we are looking for Dubhe. Try again.", condition: "wrong-star:dubhe_wrong_id" },
    { id: "merak_1", speaker: "logan", text: "Great! Merak is the first pointer star. Well done! Now find the star called Dubhe.", condition: "click_merak" },
    { id: "dubhe_1", speaker: "logan", text: "And there is Dubhe! Now we connect it with Merak. Together they point toward Polaris. Keep drawing the straight line and see where it leads.", condition: "click_dubhe" },
    { id: "wrong_1", speaker: "logan", text: "Look again. The line should go from the Big Dipper toward Polaris, down the map.", condition: "wrong_line" },
    { id: "polaris_1", speaker: "logan", text: "There it is, Polaris! It barely moves in the sky, like a true celestial anchor.", condition: "click_polaris" },
    { id: "finish_1", speaker: "logan", text: "You did it! Now you know how to navigate by the stars, even if the compass decides to dance.", condition: "finish" },
    { id: "finish_2", speaker: "svensen", text: "Yay! Now I am a sea dog with a star navigator!", condition: "finish" },
  ],
  he: [
    { id: "intro_1", speaker: "svensen", text: "לוגן, אני מסתכל על השמיים... וכל מה שאני רואה זה נצנוצים מפוזרים! איך אפשר להבין משהו מהכאוס הזה?", condition: "intro" },
    { id: "intro_2", speaker: "logan", text: "בהתחלה זה באמת נראה כמו כאוס. אבל יש כוכבי רמז. הם יעזרו למצוא את הצפון טוב יותר מכל מצפן.", condition: "intro" },
    { id: "intro_3", speaker: "svensen", text: "רמזים? לכוכבים יש רמזים?! תראה לי אילו!", condition: "intro" },
    { id: "intro_4", speaker: "logan", text: "לפעמים שלושה מספיקים. מצא את (1) מראק ואת (2) דובהה במפת השמיים וחבר ביניהם בקו ישר, והוא יראה את הכיוון ⬆️!", condition: "intro" },
    { id: "wrong_merak_no_id", speaker: "logan", text: "מצא במפה את הכוכב שנקרא מראק ולחץ עליו.", condition: "wrong-star:merak_no_id" },
    { id: "wrong_merak_wrong_id", speaker: "logan", text: "זה #id, אבל אנחנו מחפשים את מראק. נסה שוב!", condition: "wrong-star:merak_wrong_id" },
    { id: "wrong_dubhe_no_id", speaker: "logan", text: "מצא במפה את הכוכב שנקרא דובהה ולחץ עליו.", condition: "wrong-star:dubhe_no_id" },
    { id: "wrong_dubhe_wrong_id", speaker: "logan", text: "זה #id, אבל אנחנו מחפשים את דובהה. נסה שוב.", condition: "wrong-star:dubhe_wrong_id" },
    { id: "merak_1", speaker: "logan", text: "מעולה! מראק הוא כוכב ההכוונה הראשון. כל הכבוד! עכשיו מצא את הכוכב שנקרא דובהה.", condition: "click_merak" },
    { id: "dubhe_1", speaker: "logan", text: "והנה דובהה! עכשיו נחבר אותו למראק, יחד הם מצביעים לכיוון כוכב הצפון. המשך לצייר את הקו וראה לאן הוא מוביל.", condition: "click_dubhe" },
    { id: "wrong_1", speaker: "logan", text: "תסתכל שוב. הקו צריך לצאת מהעגלה הגדולה לכיוון כוכב הצפון, כלפי מטה במפה.", condition: "wrong_line" },
    { id: "polaris_1", speaker: "logan", text: "הנה הוא, כוכב הצפון! הוא כמעט לא זז בשמיים, כמו עוגן שמימי אמיתי.", condition: "click_polaris" },
    { id: "finish_1", speaker: "logan", text: "הצלחת! עכשיו אתה יודע לנווט לפי הכוכבים, גם אם המצפן מחליט לרקוד.", condition: "finish" },
    { id: "finish_2", speaker: "svensen", text: "יש! עכשיו אני כלב ים עם נווט כוכבים!", condition: "finish" },
  ],
};

export function getFlightRouteDialogs(lang: Lang) {
  return flightDialogs[lang] ?? flightDialogs.ru;
}

export function getSeaRouteDialogs(lang: Lang) {
  return seaDialogs[lang] ?? seaDialogs.ru;
}

export function getStarRouteDialogs(lang: Lang) {
  return starDialogs[lang] ?? starDialogs.ru;
}
