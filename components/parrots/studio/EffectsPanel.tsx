type VoiceEffects = {
  child: boolean;
  echo: boolean;
  reverb: boolean;
  robot: boolean;
  whisper: boolean;
  mega: boolean;
  radio: boolean;
};

type LoopFx = {
  echo: boolean;
  reverb: boolean;
  boost: boolean;
  soft: boolean;
};

type LoopOption = {
  id: string;
  label: string;
  isActive: boolean;
};

type Props = {
  activeCategory: "voice" | "loops";
  voiceEffects: VoiceEffects;
  loopEffects: {
    speed: boolean;
    targetLoopId: string | null;
    byLoop: Record<string, LoopFx>;
  };
  loopOptions: LoopOption[];
  onCategoryChange: (category: "voice" | "loops") => void;
  onToggleVoiceEffect: (effect: keyof VoiceEffects) => void;
  onToggleLoopEffect: (effect: keyof LoopFx | "speed") => void;
  onSelectLoop: (loopId: string) => void;
};

const VOICE_EFFECTS: Array<{ key: keyof VoiceEffects; label: string; hint: string }> = [
  { key: "child", label: "Child", hint: "Higher playful pitch" },
  { key: "echo", label: "Echo", hint: "A roomy bounce" },
  { key: "reverb", label: "Reverb", hint: "Soft hall shine" },
  { key: "robot", label: "Robot", hint: "Sharper synthetic tone" },
  { key: "whisper", label: "Whisper", hint: "Quiet airy voice" },
  { key: "mega", label: "Mega", hint: "Bigger deeper voice" },
  { key: "radio", label: "Radio", hint: "Small speaker color" },
];

const LOOP_EFFECTS: Array<{ key: keyof LoopFx | "speed"; label: string; hint: string }> = [
  { key: "speed", label: "Speed", hint: "A faster playful take" },
  { key: "echo", label: "Echo", hint: "Adds trailing repeats" },
  { key: "reverb", label: "Reverb", hint: "More room and glow" },
  { key: "boost", label: "Boost", hint: "Push this loop forward" },
  { key: "soft", label: "Soft", hint: "A gentler rounded tone" },
];

export default function EffectsPanel({
  activeCategory,
  voiceEffects,
  loopEffects,
  loopOptions,
  onCategoryChange,
  onToggleVoiceEffect,
  onToggleLoopEffect,
  onSelectLoop,
}: Props) {
  const activeLoopFx = loopEffects.targetLoopId
    ? loopEffects.byLoop[loopEffects.targetLoopId]
    : null;

  return (
    <div className="effects-panel">
      <div className="effects-panel__switcher">
        <button
          type="button"
          className={activeCategory === "voice" ? "is-active" : ""}
          onClick={() => onCategoryChange("voice")}
        >
          Voice
        </button>
        <button
          type="button"
          className={activeCategory === "loops" ? "is-active" : ""}
          onClick={() => onCategoryChange("loops")}
        >
          Loops
        </button>
      </div>

      {activeCategory === "voice" ? (
        <div className="effects-panel__grid">
          {VOICE_EFFECTS.map((effect) => (
            <button
              key={effect.key}
              type="button"
              className={`effects-panel__item ${voiceEffects[effect.key] ? "is-active" : ""}`}
              onClick={() => onToggleVoiceEffect(effect.key)}
            >
              <strong>{effect.label}</strong>
              <span>{effect.hint}</span>
            </button>
          ))}
        </div>
      ) : null}

      {activeCategory === "loops" ? (
        <>
          <div className="effects-panel__chips">
            {loopOptions.map((loop) => (
              <button
                key={loop.id}
                type="button"
                className={`effects-panel__chip ${loop.id === loopEffects.targetLoopId ? "is-active" : ""}`}
                onClick={() => onSelectLoop(loop.id)}
                disabled={!loop.isActive}
              >
                {loop.label}
              </button>
            ))}
          </div>

          <div className="effects-panel__grid">
            {LOOP_EFFECTS.map((effect) => {
              const isActive = effect.key === "speed"
                ? loopEffects.speed
                : Boolean(activeLoopFx?.[effect.key]);

              return (
                <button
                  key={effect.key}
                  type="button"
                  className={`effects-panel__item ${isActive ? "is-active" : ""}`}
                  onClick={() => onToggleLoopEffect(effect.key)}
                  disabled={effect.key !== "speed" && !loopEffects.targetLoopId}
                >
                  <strong>{effect.label}</strong>
                  <span>{effect.hint}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      <style jsx>{`
        .effects-panel {
          display: grid;
          gap: 0.85rem;
        }

        .effects-panel__switcher {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.6rem;
        }

        .effects-panel__switcher button,
        .effects-panel__chip {
          min-height: 42px;
          border: none;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 244, 232, 0.84);
        }

        .effects-panel__switcher button.is-active,
        .effects-panel__chip.is-active {
          background: linear-gradient(180deg, #fff0be 0%, #ffd1eb 100%);
          color: #2b231b;
        }

        .effects-panel__chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .effects-panel__chip {
          padding: 0.55rem 0.8rem;
        }

        .effects-panel__chip:disabled {
          opacity: 0.32;
        }

        .effects-panel__grid {
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
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease, opacity 0.18s ease;
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

        .effects-panel__item:disabled {
          opacity: 0.42;
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
