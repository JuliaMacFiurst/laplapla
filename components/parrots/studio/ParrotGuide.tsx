import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { buildSupabasePublicUrl } from "@/lib/publicAssetUrls";

type Props = {
  title: string;
  text: string;
  youtubeLabel: string;
  googleLabel: string;
  storyLabel: string;
  onOpenYouTube: () => void;
  onOpenGoogle: () => void;
  onOpenStory: () => void;
};

export default function ParrotGuide({
  title,
  text,
  youtubeLabel,
  googleLabel,
  storyLabel,
  onOpenYouTube,
  onOpenGoogle,
  onOpenStory,
}: Props) {
  const baseParrot = buildSupabasePublicUrl("characters", "parrots/blue_parrot");
  const animatedMedia = [
    `${baseParrot}/blue-parrot1.gif`,
    `${baseParrot}/blue-parrot2.gif`,
    `${baseParrot}/blue-parrot3.gif`,
  ];
  const [showAnimated, setShowAnimated] = useState(false);
  const [animatedIndex, setAnimatedIndex] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const schedulePhase = (isAnimatedPhase: boolean) => {
      const timeout = isAnimatedPhase ? 5000 : 10000;
      timerRef.current = window.setTimeout(() => {
        if (cancelled) return;

        if (!isAnimatedPhase) {
          setAnimatedIndex((current) => {
            let next = Math.floor(Math.random() * animatedMedia.length);
            if (animatedMedia.length > 1 && next === current) {
              next = (next + 1) % animatedMedia.length;
            }
            return next;
          });
        }

        setShowAnimated(!isAnimatedPhase);
        schedulePhase(!isAnimatedPhase);
      }, timeout);
    };

    schedulePhase(false);

    return () => {
      cancelled = true;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [animatedMedia.length]);

  const mediaSrc = showAnimated
    ? animatedMedia[animatedIndex]
    : `${baseParrot}/blue-parrot.png`;

  return (
    <section className="parrot-guide">
      <div className="parrot-guide__header">
        <div className="parrot-guide__avatar" aria-hidden="true">
          <Image src={mediaSrc} alt="" className="parrot-guide__avatar-media" width={180} height={180} unoptimized />
        </div>
        <div>
          <strong>{title}</strong>
          <p>{text}</p>
        </div>
      </div>

      <div className="parrot-guide__actions">
        <button type="button" onClick={onOpenYouTube}>{youtubeLabel}</button>
        <button type="button" onClick={onOpenGoogle}>{googleLabel}</button>
        <button type="button" onClick={onOpenStory}>{storyLabel}</button>
      </div>

      <style jsx>{`
        .parrot-guide {
          display: grid;
          gap: 0.85rem;
          padding: 1rem;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 18px 34px rgba(0, 0, 0, 0.26);
        }

        .parrot-guide__header {
          display: grid;
          grid-template-columns: 72px minmax(0, 1fr);
          gap: 0.8rem;
          align-items: start;
        }

        .parrot-guide__avatar {
          width: 72px;
          height: 72px;
          border-radius: 22px;
          overflow: hidden;
          position: relative;
          background: linear-gradient(180deg, rgba(255, 220, 192, 0.16) 0%, rgba(192, 220, 255, 0.12) 100%);
        }

        .parrot-guide__avatar-media {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .parrot-guide__header strong {
          display: block;
          font-size: 1rem;
          color: #fff4e8;
        }

        .parrot-guide__header p {
          margin: 0.4rem 0 0;
          font-size: 0.92rem;
          line-height: 1.45;
          color: rgba(255, 244, 232, 0.72);
        }

        .parrot-guide__actions {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.6rem;
        }

        .parrot-guide__actions button {
          min-height: 46px;
          border: none;
          border-radius: 16px;
          background: linear-gradient(180deg, #fff0d8 0%, #ffd7f0 100%);
          color: #3f2d18;
          font-size: 0.88rem;
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }

        .parrot-guide__actions button:hover {
          transform: translateY(-1px);
          filter: saturate(1.08);
          box-shadow: 0 10px 18px rgba(255, 175, 211, 0.22);
        }
      `}</style>
    </section>
  );
}
