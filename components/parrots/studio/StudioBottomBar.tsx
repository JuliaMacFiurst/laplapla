type Mode = "loops" | "voice" | "effects" | "mix" | "save";

type Props = {
  activeMode: Mode;
  labels: Record<Mode, string>;
  onModeChange: (mode: Mode) => void;
};

const ITEMS: Array<{ key: Mode }> = [
  { key: "loops" },
  { key: "voice" },
  { key: "effects" },
  { key: "mix" },
  { key: "save" },
];

export default function StudioBottomBar({ activeMode, labels, onModeChange }: Props) {
  return (
    <nav className="studio-bottom-bar" aria-label="Studio navigation">
      {ITEMS.map((item) => (
        <button
          key={item.key}
          type="button"
          className={item.key === activeMode ? "is-active" : ""}
          onClick={() => onModeChange(item.key)}
        >
          {labels[item.key]}
        </button>
      ))}

      <style jsx>{`
        .studio-bottom-bar {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 0.45rem;
          padding: 0.6rem 0.75rem calc(0.65rem + env(safe-area-inset-bottom));
          background: rgba(22, 23, 28, 0.96);
          backdrop-filter: blur(16px);
          border-top: 1px solid rgba(255, 255, 255, 0.07);
        }

        .studio-bottom-bar button {
          min-height: 54px;
          border: none;
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(255, 240, 218, 0.96) 0%, rgba(243, 220, 255, 0.92) 100%);
          color: #3c2c1c;
          font-size: 0.92rem;
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }

        .studio-bottom-bar button.is-active {
          background: linear-gradient(180deg, #fff38d 0%, #ffb7ea 48%, #d5c7ff 100%);
          color: #24160e;
          box-shadow: 0 0 0 2px rgba(255, 192, 96, 0.48), 0 14px 24px rgba(255, 159, 214, 0.24);
        }

        .studio-bottom-bar button:hover {
          transform: translateY(-1px);
          filter: saturate(1.05);
          box-shadow: 0 12px 22px rgba(255, 174, 206, 0.18);
        }
      `}</style>
    </nav>
  );
}
