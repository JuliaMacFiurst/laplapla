import { AMATIC_FONT_FAMILY } from "@/lib/fonts";

type PresetItem = {
  id: string;
  localizedTitle: string;
};

type Props = {
  lang: "ru" | "en" | "he";
  title: string;
  subtitle: string;
  presets: PresetItem[];
  onOpenPreset: (id: string) => void;
  imageForPreset: (id: string) => string;
};

export default function ParrotMobileExperience({
  lang,
  title,
  subtitle,
  presets,
  onOpenPreset,
  imageForPreset,
}: Props) {
  return (
    <div className={`parrot-mobile-experience ${lang === "he" ? "is-rtl" : ""}`}>
      <section className="parrot-mobile-experience__hero">
        <h1 className="parrot-mobile-experience__title page-title">{title}</h1>
        <p className="parrot-mobile-experience__subtitle">{subtitle}</p>

        <div className="style-presets-row parrot-mobile-experience__presets">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onOpenPreset(preset.id)}
              className="style-preset-btn"
              style={{ backgroundImage: `url(${imageForPreset(preset.id)})` }}
              title={preset.localizedTitle}
            >
              <span className="style-preset-label">{preset.localizedTitle}</span>
            </button>
          ))}
        </div>
      </section>

      <style jsx>{`
        .parrot-mobile-experience {
          width: 100%;
          padding: 0 0.75rem 1.25rem;
          box-sizing: border-box;
        }

        .parrot-mobile-experience.is-rtl {
          direction: rtl;
        }

        .parrot-mobile-experience__hero {
          padding-top: 0.35rem;
          text-align: center;
        }

        .parrot-mobile-experience__title {
          margin: 0;
          font-family: ${AMATIC_FONT_FAMILY};
          font-size: clamp(2.8rem, 10vw, 3.5rem);
          line-height: 0.88;
          color: #24180f;
        }

        .parrot-mobile-experience__subtitle {
          margin: 0.65rem auto 0;
          max-width: 30rem;
          font-size: clamp(1rem, 4.2vw, 1.18rem);
          line-height: 1.5;
          color: rgba(36, 24, 15, 0.8);
        }

        .parrot-mobile-experience__presets {
          margin-top: 1rem;
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
}
