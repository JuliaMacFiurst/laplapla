import type { GetStaticProps } from "next";
import Image from "next/image";
import { useRouter } from "next/router";
import CorePageLinks from "@/components/CorePageLinks";
import SEO from "@/components/SEO";
import { dictionaries, Lang } from "../i18n";
import { buildLocalizedQuery, DEFAULT_LANG, getCurrentLang, isLang } from "@/lib/i18n/routing";

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

const visuallyHiddenStyle = {
  position: "absolute" as const,
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap" as const,
  border: 0,
};

export default function DogPage({ lang: providedLang }: { lang?: Lang }) {
  const router = useRouter();
  const lang = providedLang ?? (getCurrentLang(router) as Lang);
  const dict = dictionaries[lang] || dictionaries["ru"];
  const t = dict.dogs.dogsPage;
  const seo = dict.seo.dogs.index;
  const seoPath = router.asPath.split("#")[0]?.split("?")[0] || "/dog";
  return (
    <>
      <SEO title={seo.title} description={seo.description} path={seoPath} />
      <main className="dog-page">
      <div className="dog-header-container">
        <Image src="/dog/frank.webp" alt="Фрэнк" className="dog-header-image" width={220} height={220} />
        <div className="dog-header-wrapper">
          <h1 className="dog-page-title page-title">{t.title}</h1>
          <p style={visuallyHiddenStyle}>
            {seo.description}
          </p>
          <h2 className="dog-page-subtitle">{t.subtitle}</h2>
          <CorePageLinks current="dog" lang={lang} related={["home", "cats", "book"]} />
        </div>
        <Image src="/dog/fibi.webp" alt="Фиби" className="dog-header-image" width={220} height={220} />
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
            <Image
              src={`/icons/drawing-lessons-icons/${categoryIcons[index]}`}
              alt={t.categories[slug]}
              className="dog-category-icon"
              width={120}
              height={120}
            />
            <span>{t.categories[slug]}</span>
          </button>
        ))}
      </div>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps<{ lang: Lang }> = async ({ locale }) => {
  const lang = isLang(locale) ? locale : DEFAULT_LANG;

  return {
    props: {
      lang,
    },
  };
};
