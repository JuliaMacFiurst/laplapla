import { AMATIC_FONT_FAMILY } from "@/lib/fonts";

export type ParrotStudioDockTab = "loops" | "voice" | "effects" | "save" | "preview";

type DockCopy = {
  title: string;
  subtitle: string;
  cta: string;
  tipsTitle: string;
  creditTitle: string;
  creditBody: string;
  extraHint: string;
  tabs: Record<ParrotStudioDockTab, string>;
  tabDescriptions: Record<ParrotStudioDockTab, string>;
};

type Props = {
  copy: DockCopy;
  loopNames: string[];
  activeTab: ParrotStudioDockTab;
  onTabChange?: (tab: ParrotStudioDockTab) => void;
  onOpenStudio?: () => void;
  accentColor?: string;
};

const TAB_ORDER: ParrotStudioDockTab[] = ["loops", "voice", "effects", "save", "preview"];

export default function ParrotStudioDock({
  copy,
  loopNames,
  activeTab,
  onTabChange,
  onOpenStudio,
  accentColor = "#ff8f4d",
}: Props) {
  const activeDescription = copy.tabDescriptions[activeTab];

  return (
    <section className="parrot-studio-dock">
      <div className="parrot-studio-dock__panel">
        <div className="parrot-studio-dock__eyebrow">{copy.tipsTitle}</div>
        <h2 className="parrot-studio-dock__title">{copy.title}</h2>
        <p className="parrot-studio-dock__subtitle">{copy.subtitle}</p>

        <div className="parrot-studio-dock__loops">
          {loopNames.map((loopName) => (
            <span key={loopName} className="parrot-studio-dock__loop-chip">
              {loopName}
            </span>
          ))}
        </div>

        <div className="parrot-studio-dock__detail">
          <strong>{copy.tabs[activeTab]}</strong>
          <p>{activeDescription}</p>
        </div>

        <button type="button" className="parrot-studio-dock__cta" onClick={onOpenStudio}>
          {copy.cta}
        </button>

        <div className="parrot-studio-dock__credit">
          <strong>{copy.creditTitle}</strong>
          <p>{copy.creditBody}</p>
          <span>{copy.extraHint}</span>
        </div>
      </div>

      <nav className="parrot-studio-dock__nav" aria-label="Parrot studio controls">
        {TAB_ORDER.map((tab) => {
          const isActive = tab === activeTab;

          return (
            <button
              key={tab}
              type="button"
              className={`parrot-studio-dock__tab ${isActive ? "is-active" : ""}`}
              onClick={() => onTabChange?.(tab)}
              aria-pressed={isActive}
            >
              <span className="parrot-studio-dock__tab-label">{copy.tabs[tab]}</span>
            </button>
          );
        })}
      </nav>

      <style jsx>{`
        .parrot-studio-dock {
          position: relative;
          width: 100%;
          padding-bottom: calc(92px + env(safe-area-inset-bottom));
        }

        .parrot-studio-dock__panel {
          position: relative;
          overflow: hidden;
          border-radius: 28px;
          padding: 1.15rem 1rem 1.1rem;
          background:
            radial-gradient(circle at top right, rgba(255, 237, 191, 0.95), transparent 34%),
            linear-gradient(180deg, #fffef8 0%, #fff7ef 100%);
          border: 1px solid rgba(70, 44, 27, 0.1);
          box-shadow: 0 18px 38px rgba(115, 64, 18, 0.14);
        }

        .parrot-studio-dock__eyebrow {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 0.35rem 0.7rem;
          background: rgba(255, 255, 255, 0.76);
          font-size: 0.76rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #8b5a2b;
        }

        .parrot-studio-dock__title {
          margin: 0.7rem 0 0;
          font-family: ${AMATIC_FONT_FAMILY};
          font-size: clamp(2rem, 7vw, 2.8rem);
          line-height: 0.92;
          color: #2d241b;
        }

        .parrot-studio-dock__subtitle {
          margin: 0.55rem 0 0;
          font-size: 0.98rem;
          line-height: 1.5;
          color: rgba(45, 36, 27, 0.84);
        }

        .parrot-studio-dock__loops {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .parrot-studio-dock__loop-chip {
          display: inline-flex;
          align-items: center;
          min-height: 36px;
          padding: 0.45rem 0.8rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(45, 36, 27, 0.08);
          font-size: 0.88rem;
          color: #3d2c1d;
        }

        .parrot-studio-dock__detail {
          margin-top: 1rem;
          border-radius: 22px;
          padding: 0.95rem 0.95rem 0.9rem;
          background: rgba(255, 255, 255, 0.76);
          border: 1px solid rgba(45, 36, 27, 0.08);
        }

        .parrot-studio-dock__detail strong {
          display: block;
          font-size: 0.92rem;
          color: #2d241b;
        }

        .parrot-studio-dock__detail p {
          margin: 0.45rem 0 0;
          font-size: 0.9rem;
          line-height: 1.5;
          color: rgba(45, 36, 27, 0.78);
        }

        .parrot-studio-dock__cta {
          width: 100%;
          margin-top: 1rem;
          min-height: 52px;
          border: none;
          border-radius: 18px;
          background: ${accentColor};
          color: #fff;
          font-family: ${AMATIC_FONT_FAMILY};
          font-size: 1.6rem;
          letter-spacing: 0.03em;
          box-shadow: 0 14px 24px rgba(255, 143, 77, 0.26);
        }

        .parrot-studio-dock__credit {
          margin-top: 0.95rem;
          padding: 0.85rem 0.9rem;
          border-radius: 18px;
          background: rgba(61, 44, 29, 0.06);
          color: #4f3b27;
        }

        .parrot-studio-dock__credit strong {
          display: block;
          font-size: 0.86rem;
        }

        .parrot-studio-dock__credit p,
        .parrot-studio-dock__credit span {
          display: block;
          margin: 0.45rem 0 0;
          font-size: 0.77rem;
          line-height: 1.45;
        }

        .parrot-studio-dock__nav {
          position: fixed;
          left: 0.75rem;
          right: 0.75rem;
          bottom: calc(0.75rem + env(safe-area-inset-bottom));
          z-index: 50;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 0.45rem;
          padding: 0.55rem;
          border-radius: 24px;
          background: rgba(33, 26, 18, 0.92);
          backdrop-filter: blur(16px);
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.28);
        }

        .parrot-studio-dock__tab {
          min-height: 54px;
          border: none;
          border-radius: 18px;
          background: transparent;
          color: rgba(255, 255, 255, 0.72);
          padding: 0.45rem 0.3rem;
        }

        .parrot-studio-dock__tab.is-active {
          background: rgba(255, 255, 255, 0.12);
          color: #fff3d8;
        }

        .parrot-studio-dock__tab-label {
          display: block;
          font-family: ${AMATIC_FONT_FAMILY};
          font-size: 1.22rem;
          line-height: 1;
        }
      `}</style>
    </section>
  );
}
