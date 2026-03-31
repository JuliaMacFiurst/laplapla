import React, { useRef } from "react";
import { useRouter } from "next/router";
import { Quest } from "@/components/Raccoons/QuestSection";
import { FeaturedQuestCard } from "@/components/Raccoons/QuestSection";
import { dictionaries } from "@/i18n";
import { getCurrentLang } from "@/lib/i18n/routing";

interface QuestCarouselProps {
  quests: Quest[];
}

/**
 * QuestCarousel
 * Горизонтальная полка афиш квестов.
 * Одна афиша — один фокус.
 * Без автопрокрутки. Управляется пользователем.
 */
export const QuestCarousel: React.FC<QuestCarouselProps> = ({ quests }) => {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const t = dictionaries[lang].raccoons.quests;
  const trackRef = useRef<HTMLDivElement | null>(null);

  const scrollBySlide = (direction: "left" | "right") => {
    if (!trackRef.current) return;

    const slide = trackRef.current.querySelector(
      ".quest-carousel-slide"
    ) as HTMLElement;

    if (!slide) return;

    const slideWidth = slide.offsetWidth + 14; // gap
    trackRef.current.parentElement?.scrollBy({
      left: direction === "left" ? -slideWidth : slideWidth,
      behavior: "smooth",
    });
  };

  return (
    <div className="quest-carousel">
      <button
        className="quest-carousel-nav left"
        onClick={() => scrollBySlide("left")}
        aria-label={t.previousQuest}
      >
        ‹
      </button>

      <div className="quest-carousel-viewport">
        <div className="quest-carousel-track" ref={trackRef}>
          {quests.map((quest) => (
            <div className="quest-carousel-slide" key={quest.id}>
              {/* Афиша квеста */}
              <div className="quest-poster">
                <FeaturedQuestCard quest={quest} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        className="quest-carousel-nav right"
        onClick={() => scrollBySlide("right")}
        aria-label={t.nextQuest}
      >
        ›
      </button>
    </div>
  );
};
