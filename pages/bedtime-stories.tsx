import { useState } from "react";
import type { GetServerSideProps } from "next";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";

import BedtimeStoryReaderModal from "@/components/bedtime/BedtimeStoryReaderModal";
import SEO from "@/components/SEO";
import { dictionaries, type Lang } from "@/i18n";
import { loadBedtimeStories, type BedtimeStory } from "@/lib/bedtimeStories";
import { buildLocalizedPublicPath, DEFAULT_LANG, getCurrentLang, isLang } from "@/lib/i18n/routing";
import { trackEvent } from "@/lib/analytics/client";

type BedtimeStoriesPageProps = {
  lang: Lang;
  stories: BedtimeStory[];
};

export default function BedtimeStoriesPage({ lang, stories }: BedtimeStoriesPageProps) {
  const router = useRouter();
  const resolvedLang = lang ?? getCurrentLang(router);
  const t = dictionaries[resolvedLang].bedtimeStories;
  const seo = dictionaries[resolvedLang].seo.bedtimeStories;
  const [selectedStory, setSelectedStory] = useState<BedtimeStory | null>(null);

  return (
    <>
      <SEO title={seo.title} description={seo.description} path="/bedtime-stories" lang={resolvedLang} />
      <main className="bedtime-stories-page" dir={resolvedLang === "he" ? "rtl" : "ltr"}>
        <header className="bedtime-stories-header">
          <Link className="bedtime-stories-home-link" href={buildLocalizedPublicPath("/", resolvedLang)}>
            {t.backHome}
          </Link>
          <p>{t.kicker}</p>
          <h1>{t.title}</h1>
          <div>{t.subtitle}</div>
        </header>

        {stories.length > 0 ? (
          <section className="bedtime-stories-shelf" aria-label={t.title}>
            {stories.map((story, index) => (
              <article className="bedtime-story-card" key={story.id}>
                <button
                  type="button"
                  onClick={() => {
                    trackEvent({
                      eventName: "bedtime_story_opened",
                      entityType: "story",
                      entityId: story.slug || story.id,
                      entityTitle: story.title,
                      lang: resolvedLang,
                      properties: {
                        section: "bedtime_stories",
                        content_type: "bedtime_story",
                        content_id: story.slug || story.id,
                        content_slug: story.slug || story.id,
                        content_title: story.title,
                        language: resolvedLang,
                        total_steps: story.pageUrls.length,
                      },
                    });
                    setSelectedStory(story);
                  }}
                  aria-label={`${t.readStory}: ${story.title}`}
                >
                  <span className="bedtime-story-poster">
                    <Image
                      src={story.previewUrl}
                      alt={story.title}
                      fill
                      sizes="(max-width: 767px) 76vw, 320px"
                      loading={index === 0 ? "eager" : "lazy"}
                      unoptimized
                    />
                  </span>
                  <span className="bedtime-story-copy">
                    <strong>{story.title}</strong>
                    <span>{t.readStory}</span>
                  </span>
                </button>
              </article>
            ))}
          </section>
        ) : (
          <p className="bedtime-stories-empty">{t.empty}</p>
        )}
      </main>

      {selectedStory ? (
        <BedtimeStoryReaderModal
          story={selectedStory}
          lang={resolvedLang}
          ui={t}
          onClose={() => setSelectedStory(null)}
        />
      ) : null}
    </>
  );
}

export const getServerSideProps: GetServerSideProps<BedtimeStoriesPageProps> = async ({ locale }) => {
  const lang = isLang(locale) ? locale : DEFAULT_LANG;
  const stories = await loadBedtimeStories(lang).catch((error) => {
    console.error("[bedtime-stories] failed to load stories", error);
    return [];
  });

  return {
    props: {
      lang,
      stories,
    },
  };
};
