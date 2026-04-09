import { useRouter } from "next/router";
import SEO from "@/components/SEO";
import { dictionaries, Lang } from "../i18n";
import { buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";

// /pages/dog.tsx



const categorySlugs = [
  'cartoon-characters',
  'kawaii',
  'nature-scenes',
  'botanical',
  'desserts',
  'zodiac',
  'faces',
  'outfits',
  'mandala',
  'motion',
  'dinosaurs',
  'animals',
  'memes',
  'anime-faces',
  'hands',
  'cityscapes',
] as const;

const categoryIcons = [
  'cartoon.webp',
  'kawaii.webp',
  'nature.webp',
  'botanic.webp',
  'dessert.webp',
  'zodiac.webp',
  'faces.webp',
  'outfits.webp',
  'mandala.webp',
  'motion.webp',
  'dino.webp',
  'animals.webp',
  'memes.webp',
  'anime.webp',
  'hands.webp',
  'city.webp',
];

export default function DogPage() {
  const router = useRouter();
  const lang = getCurrentLang(router) as Lang;
  const dict = dictionaries[lang] || dictionaries["ru"];
  const t = dict.dogs.dogsPage;
  const seo = dict.seo.dogs.index;
  const seoPath = router.asPath.split("#")[0]?.split("?")[0] || "/dog";
  return (
    <>
      <SEO title={seo.title} description={seo.description} path={seoPath} />
      <main>
      <div className="dog-header-container">
        <img src="/dog/frank.webp" alt="Фрэнк" className="dog-header-image" />
        <div className="dog-header-wrapper">
          <h1 className="dog-page-title page-title">{t.title}</h1>
          <h2 className="dog-page-subtitle">{t.subtitle}</h2>
        </div>
        <img src="/dog/fibi.webp" alt="Фиби" className="dog-header-image" />
      </div>

      <div className="dog-category-grid">
        {categorySlugs.map((slug, index) => (
          <button
            key={slug}
            onClick={() =>
              router.push(
                {
                  pathname: "/dog/lessons",
                  query: buildLocalizedQuery(lang, { category: slug }),
                },
                undefined,
                { locale: lang },
              )
            }
            className={`dog-category-button dog-category-color-${(index % 8) + 1}`}
          >
            <img src={`/icons/drawing-lessons-icons/${categoryIcons[index]}`} alt={t.categories[slug]} className="dog-category-icon" />
            <span>{t.categories[slug]}</span>
          </button>
        ))}
      </div>
      </main>
    </>
  );
}
