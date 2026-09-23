import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";

import BedtimeStoryReaderModal from "@/components/bedtime/BedtimeStoryReaderModal";
import SEO from "@/components/SEO";
import { dictionaries, type Lang } from "@/i18n";
import type { BedtimeStory } from "@/lib/bedtimeStories";
import { BASE_URL } from "@/lib/config";
import { buildCanonicalUrl, buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { trackEvent } from "@/lib/analytics/client";

export type BedtimeStoriesLibraryProps = {
  lang: Lang;
  stories: BedtimeStory[];
  selectedStory?: BedtimeStory | null;
};

export function buildBedtimeStoryPath(slug: string) {
  return `/bedtime-stories/${slug}`;
}

export function buildBedtimeStoryDescription(story: BedtimeStory, lang: Lang) {
  if (lang === "en") return `${story.title} — an illustrated bedtime story on LapLapLa.`;
  if (lang === "he") return `${story.title} — סיפור לילה מאויר ב־LapLapLa.`;
  return `${story.title} — иллюстрированная история для чтения перед сном на LapLapLa.`;
}

export default function BedtimeStoriesLibrary({ lang, stories, selectedStory = null }: BedtimeStoriesLibraryProps) {
  const router = useRouter();
  const t = dictionaries[lang].bedtimeStories;
  const librarySeo = dictionaries[lang].seo.bedtimeStories;
  const storyPath = selectedStory ? buildBedtimeStoryPath(selectedStory.slug) : null;
  const seoTitle = selectedStory ? `${selectedStory.title} — LapLapLa` : librarySeo.title;
  const seoDescription = selectedStory ? buildBedtimeStoryDescription(selectedStory, lang) : librarySeo.description;

  const trackStoryOpen = (story: BedtimeStory) => {
    trackEvent({
      eventName: "bedtime_story_opened",
      entityType: "story",
      entityId: story.slug,
      entityTitle: story.title,
      lang,
      properties: {
        section: "bedtime_stories",
        content_type: "bedtime_story",
        content_id: story.slug,
        content_slug: story.slug,
        content_title: story.title,
        language: lang,
        total_steps: story.pageUrls.length,
      },
    });
    trackEvent("content_open", {
      section: "bedtime_stories",
      content_type: "bedtime_story",
      content_id: story.slug,
      content_slug: story.slug,
      content_title: story.title,
      language: lang,
      total_steps: story.pageUrls.length,
    });
  };

  return (
    <>
      <SEO
        title={seoTitle}
        description={seoDescription}
        path={storyPath || "/bedtime-stories"}
        lang={lang}
        type={selectedStory ? "article" : "website"}
        image={selectedStory?.previewUrl}
        jsonLd={selectedStory && storyPath ? {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: selectedStory.title,
          description: seoDescription,
          image: [selectedStory.previewUrl],
          url: buildCanonicalUrl(BASE_URL, storyPath, lang),
          inLanguage: lang,
        } : undefined}
      />
      <main className="bedtime-stories-page" dir={lang === "he" ? "rtl" : "ltr"}>
        <header className="bedtime-stories-header">
          <Link className="bedtime-stories-home-link" href={buildLocalizedPublicPath("/", lang)}>
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
                <Link
                  href={buildLocalizedPublicPath(buildBedtimeStoryPath(story.slug), lang)}
                  onClick={() => trackStoryOpen(story)}
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
                </Link>
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
          lang={lang}
          ui={t}
          onClose={() => void router.push(buildLocalizedPublicPath("/bedtime-stories", lang))}
        />
      ) : null}
    </>
  );
}
