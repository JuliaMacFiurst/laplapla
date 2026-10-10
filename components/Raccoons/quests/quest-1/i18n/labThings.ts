import type { Lang } from "@/i18n";
import type { LabThing } from "../logic/lab-game/types";
import rawThings from "../logic/lab-game/lab-things.json";

type Copy = [label: string, comment: string];

const en: Record<string, Copy> = {
  underwear: ["Thermal underwear", "Oh yes! Even my tail would freeze without it."],
  "warm-boots": ["Polar boots", "Excellent! Your toes will thank you."],
  "sleeping-bag": ["Warm sleeping bag", "Sleeping warmly is half the success of an expedition!"],
  tent: ["Polar tent", "A reliable home in the middle of the snow. Take it!"],
  burner: ["Camping stove", "Hot tea can save even a raccoon."], thermos: ["Thermos", "Mmm… warm and comforting!"],
  "high-calorie-food": ["High-calorie food", "Now that is fuel for a long journey!"],
  "navigator-map": ["GPS and map", "Without a map, we will go the wrong way. Trust me."],
  "first-aid-kit": ["First-aid kit", "Hopefully we will not need it, but it must come with us."],
  headlamp: ["Headlamp", "Light in the darkness is a true hero!"], sunglasses: ["Sunglasses", "Snow glare is blinding. Smart choice."],
  "satellite-phone": ["Satellite phone", "If anything happens, we can call for help."], shovel: ["Lightweight shovel", "The snow will not clear itself."],
  notebook: ["Notebook and pencil", "Scientists write everything down. Even raccoons do."],
  "signaling-instruments": ["Signaling equipment", "Let everyone know where we are!"],
  "inflatable-ring": ["Inflatable swim ring", "Swimming? Here?! Bold choice…"], "flip-flops": ["Beach flip-flops", "That is a very cold idea."],
  umbrella: ["Umbrella", "The wind will carry it away in a flash."], "swim-wear": ["Swimsuit", "Brave. But no."],
  microwave: ["Microwave", "Did you bring a power outlet too?"], cactus: ["Cactus", "It will not survive the Arctic. Neither will I."],
  rollers: ["Roller skates", "This is definitely the wrong kind of ice."], "teddy-bear": ["Teddy bear", "The real bears might take offense."],
  "hair-drawer": ["Hair dryer", "The wind will do a better job."], lampshade: ["Table lamp", "Cozy, but useless."],
  sambrero: ["Sombrero", "There is sun, but no warmth."], balloons: ["Balloons", "They will fly beautifully—and never come back."],
  aquarium: ["Aquarium", "The fish would not like it here."],
};

const he: Record<string, Copy> = {
  underwear: ["לבנים תרמיים", "בהחלט! בלי זה אפילו הזנב שלי יקפא."], "warm-boots": ["מגפיים לקוטב", "מצוין! אצבעות הרגליים יודו לך."],
  "sleeping-bag": ["שק שינה חם", "שינה בחום היא חצי מההצלחה של המשלחת!"], tent: ["אוהל לקוטב", "בית אמין בלב השלג. לוקחים!"],
  burner: ["גזייה", "תה חם מציל אפילו דביבונים."], thermos: ["תרמוס", "מממ… חם ונעים!"],
  "high-calorie-food": ["מזון עתיר קלוריות", "זה בדיוק הדלק למסע ארוך!"], "navigator-map": ["נווט ומפה", "בלי מפה נלך לכיוון הלא נכון. מניסיון."],
  "first-aid-kit": ["ערכת עזרה ראשונה", "עדיף שלא נצטרך אותה, אבל חשוב שתהיה."], headlamp: ["פנס ראש", "אור בחשכה הוא גיבור אמיתי!"],
  sunglasses: ["משקפי שמש", "השלג מסנוור. בחירה חכמה."], "satellite-phone": ["טלפון לווייני", "אם יקרה משהו, נוכל להזעיק עזרה."],
  shovel: ["את חפירה קל", "השלג לא יפנה את עצמו."], notebook: ["מחברת ועיפרון", "מדענים רושמים הכול. גם דביבונים."],
  "signaling-instruments": ["אמצעי איתות", "שכולם ידעו איפה אנחנו!"], "inflatable-ring": ["גלגל ים מתנפח", "לשחות? כאן?! אמיץ…"],
  "flip-flops": ["כפכפי חוף", "רעיון קר מאוד."], umbrella: ["מטרייה", "הרוח תעיף אותה כהרף עין."],
  "swim-wear": ["בגד ים", "אמיץ. אבל לא."], microwave: ["מיקרוגל", "הבאת גם שקע חשמל?"],
  cactus: ["קקטוס", "הוא לא ישרוד באזור הארקטי. וגם אני לא."], rollers: ["גלגיליות", "זה ממש לא הקרח המתאים."],
  "teddy-bear": ["דובון צעצוע", "הדובים האמיתיים עוד עלולים להיעלב."], "hair-drawer": ["מייבש שיער", "הרוח תעשה עבודה טובה יותר."],
  lampshade: ["מנורת שולחן", "נעים, אבל לא שימושי."], sambrero: ["סומבררו", "יש שמש. אין חום."],
  balloons: ["בלונים", "הם יעופו יפה—ולא יחזרו."], aquarium: ["אקווריום", "לדגים לא יהיה נעים כאן."],
};

export function getLabThings(lang: Lang): LabThing[] {
  return rawThings.map((thing) => {
    if (lang === "ru") return thing;
    const copy = (lang === "en" ? en : he)[thing.id];
    if (!copy) throw new Error(`Missing ${lang} lab translation for ${thing.id}`);
    return { ...thing, label: copy[0], loganComment: copy[1] };
  });
}
