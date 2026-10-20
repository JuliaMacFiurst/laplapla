import type { Lang } from "@/i18n";
import { localizedString, type LocalizedString, type ProductCategory } from "./types";

export type ShopFreeExperience = {
  id: string;
  title: LocalizedString;
  description: LocalizedString;
  label: LocalizedString;
  cta: LocalizedString;
  age: LocalizedString;
  durationLabel: LocalizedString;
  duration: LocalizedString;
  format: LocalizedString;
  priceLabel: LocalizedString;
  priceValue: LocalizedString;
  category: ProductCategory;
  href: string;
  image: string;
};

export const SVALBARD_FREE_EXPERIENCE: ShopFreeExperience = {
  id: "svalbard-quest-1",
  title: localizedString("Экспедиция на Шпицберген", "Svalbard Expedition", "משלחת לסבאלברד"),
  description: localizedString(
    "Отправься в Арктику, найди дорогу по звёздам, исследуй научную станцию и раскрой тайну Всемирного семенохранилища.",
    "Travel to the Arctic, navigate by the stars, explore a research station, and uncover the secrets of the Global Seed Vault.",
    "צאו למסע אל האזור הארקטי, נווטו בעזרת הכוכבים, חקרו תחנת מחקר וגלו את סודות כספת הזרעים העולמית.",
  ),
  label: localizedString("Бесплатно", "Free", "חינם"),
  cta: localizedString("Начать приключение", "Start the adventure", "מתחילים בהרפתקה"),
  age: localizedString("7+", "7+", "7+"),
  durationLabel: localizedString("Время прохождения", "Playtime", "משך המשחק"),
  duration: localizedString(
    "От 25 минут. Продолжительность зависит от времени, проведённого в мини-играх, и повторных попыток.",
    "25 minutes or more. Playtime depends on how long you spend on mini-games and retries.",
    "25 דקות ומעלה. משך המשחק תלוי בזמן שמקדישים למשחקונים ולניסיונות חוזרים.",
  ),
  format: localizedString(
    "Интерактивный онлайн-квест, без печатных материалов",
    "Interactive online quest, with no printed materials",
    "משימת הרפתקה אינטראקטיבית אונליין, ללא חומרי הדפסה",
  ),
  priceLabel: localizedString("Стоимость", "Price", "מחיר"),
  priceValue: localizedString("Полностью бесплатно", "Completely free", "חינם לגמרי"),
  category: "games",
  href: "/quests/quest-1",
  image: "/supabase-storage/quests/1_quest/images/first-quest-afisha.webp",
};

export const SHOP_FREE_EXPERIENCES: readonly ShopFreeExperience[] = [SVALBARD_FREE_EXPERIENCE];

export function getLocalizedFreeExperience(
  experience: ShopFreeExperience,
  lang: Lang,
) {
  return {
    title: experience.title[lang],
    description: experience.description[lang],
    label: experience.label[lang],
    cta: experience.cta[lang],
    age: experience.age[lang],
    durationLabel: experience.durationLabel[lang],
    duration: experience.duration[lang],
    format: experience.format[lang],
    priceLabel: experience.priceLabel[lang],
    priceValue: experience.priceValue[lang],
  };
}
