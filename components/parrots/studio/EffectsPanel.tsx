type EffectsState = {
  echo: boolean;
  reverb: boolean;
  speed: boolean;
};

type Props = {
  effects: EffectsState;
  onToggle: (effect: keyof EffectsState) => void;
};

const EFFECTS: Array<{ key: keyof EffectsState; label: string; hint: string }> = [
  { key: "echo", label: "Echo", hint: "A roomy bounce" },
  { key: "reverb", label: "Reverb", hint: "Soft hall shine" },
  { key: "speed", label: "Speed", hint: "A faster playful take" },
];

export default function EffectsPanel({ effects, onToggle }: Props) {
  return (
    <div className="effects-panel">
      {EFFECTS.map((effect) => (
        <button
          key={effect.key}
          type="button"
          className={`effects-panel__item ${effects[effect.key] ? "is-active" : ""}`}
          onClick={() => onToggle(effect.key)}
        >
          <strong>{effect.label}</strong>
          <span>{effect.hint}</span>
        </button>
      ))}

      <style jsx>{`
        .effects-panel {
          display: grid;
          gap: 0.75rem;
        }

        .effects-panel__item {
          min-height: 74px;
          border: none;
          border-radius: 22px;
          padding: 0.9rem 1rem;
          background: linear-gradient(180deg, #fff5e8 0%, #eeddff 100%);
          color: #2b231b;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          gap: 0.25rem;
          text-align: left;
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }

        .effects-panel__item.is-active {
          background: linear-gradient(180deg, #fff0d4 0%, #fff 100%);
          box-shadow: 0 0 0 2px rgba(255, 145, 77, 0.28);
        }

        .effects-panel__item:hover {
          transform: translateY(-1px);
          filter: saturate(1.05);
          box-shadow: 0 14px 24px rgba(255, 182, 214, 0.2);
        }

        .effects-panel__item strong {
          font-size: 1rem;
        }

        .effects-panel__item span {
          font-size: 0.84rem;
          color: rgba(43, 35, 27, 0.68);
        }
      `}</style>
    </div>
  );
}
