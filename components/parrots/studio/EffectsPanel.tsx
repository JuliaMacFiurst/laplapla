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
  hasVoice: boolean;
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
  onPreviewVoiceEffect: (effect: keyof VoiceEffects) => void;
  onPreviewLoopEffect: (effect: keyof LoopFx | "speed") => void;
  activePreviewKey: string | null;
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
  hasVoice,
  loopEffects,
  loopOptions,
  onCategoryChange,
  onToggleVoiceEffect,
  onToggleLoopEffect,
  onSelectLoop,
  onPreviewVoiceEffect,
  onPreviewLoopEffect,
  activePreviewKey,
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
        <>
          {!hasVoice ? <p className="effects-panel__hint">Record a voice first</p> : null}
          <div className="effects-panel__grid">
            {VOICE_EFFECTS.map((effect) => (
              <div
                key={effect.key}
                className={`effects-panel__item ${voiceEffects[effect.key] ? "is-active" : ""}`}
              >
                <button
                  type="button"
                  className="effects-panel__main"
                  onClick={() => onToggleVoiceEffect(effect.key)}
                >
                  <strong>{effect.label}</strong>
                  <span>{effect.hint}</span>
                </button>
                <button
                  type="button"
                  className={`effects-panel__preview ${activePreviewKey === `voice:${effect.key}` ? "is-previewing" : ""}`}
                  onClick={() => onPreviewVoiceEffect(effect.key)}
                  aria-label={`Preview ${effect.label}`}
                  disabled={!hasVoice}
                >
                  ▶
                </button>
              </div>
            ))}
          </div>
        </>
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
                <div
                  key={effect.key}
                  className={`effects-panel__item ${isActive ? "is-active" : ""}`}
                >
                  <button
                    type="button"
                    className="effects-panel__main"
                    onClick={() => onToggleLoopEffect(effect.key)}
                    disabled={effect.key !== "speed" && !loopEffects.targetLoopId}
                  >
                    <strong>{effect.label}</strong>
                    <span>{effect.hint}</span>
                  </button>
                  <button
                    type="button"
                    className={`effects-panel__preview ${activePreviewKey === `loop:${effect.key}` ? "is-previewing" : ""}`}
                    onClick={() => onPreviewLoopEffect(effect.key)}
                    disabled={effect.key !== "speed" && !loopEffects.targetLoopId}
                    aria-label={`Preview ${effect.label}`}
                  >
                    ▶
                  </button>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      <style jsx>{`
        .effects-panel {
          display: grid;
          gap: 0.85rem;
          min-height: 0;
          height: 100%;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding-right: 0.1rem;
        }

        .effects-panel__switcher {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.6rem;
          position: sticky;
          top: 0;
          z-index: 2;
          padding-bottom: 0.2rem;
          background: linear-gradient(180deg, rgba(28, 30, 36, 0.98) 0%, rgba(28, 30, 36, 0.86) 100%);
        }

        .effects-panel__hint {
          margin: -0.15rem 0 0.05rem;
          color: rgba(255, 244, 232, 0.68);
          font-size: 0.84rem;
          text-align: center;
        }

        .effects-panel__switcher button,
        .effects-panel__chip {
          min-height: 42px;
          border: none;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 244, 232, 0.84);
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, color 0.18s ease;
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
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 22px;
          padding: 0.45rem;
          background: linear-gradient(180deg, rgba(47, 50, 58, 0.96) 0%, rgba(32, 34, 40, 0.96) 100%);
          color: #fff4e8;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: stretch;
          gap: 0.55rem;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease, opacity 0.18s ease, background 0.18s ease;
        }

        .effects-panel__item.is-active {
          background: linear-gradient(180deg, #fff0ba 0%, #ffc4e9 52%, #d6cfff 100%);
          box-shadow:
            0 0 0 1px rgba(255, 245, 228, 0.52),
            0 0 0 3px rgba(255, 177, 86, 0.22),
            0 18px 28px rgba(255, 149, 119, 0.22),
            inset 0 0 24px rgba(255, 255, 255, 0.34);
          transform: scale(1.01);
          animation: effects-panel-glow 1.9s ease-in-out infinite;
        }

        .effects-panel__main,
        .effects-panel__preview {
          border: none;
          border-radius: 18px;
          background: transparent;
          color: inherit;
        }

        .effects-panel__main {
          min-height: 64px;
          padding: 0.45rem 0.5rem;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          gap: 0.25rem;
          text-align: left;
        }

        .effects-panel__preview {
          width: 48px;
          min-height: 64px;
          align-self: center;
          background: rgba(255, 255, 255, 0.1);
          font-size: 1.05rem;
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }

        .effects-panel__item.is-active .effects-panel__preview {
          background: rgba(255, 255, 255, 0.38);
          color: #372617;
        }

        .effects-panel__preview.is-previewing {
          background: linear-gradient(180deg, #fff8de 0%, #fff 100%);
          box-shadow: 0 0 0 2px rgba(255, 160, 94, 0.28);
        }

        .effects-panel__item:hover {
          transform: translateY(-1px);
          filter: saturate(1.05);
          box-shadow: 0 14px 24px rgba(255, 182, 214, 0.16);
        }

        .effects-panel__main:disabled,
        .effects-panel__preview:disabled,
        .effects-panel__item:has(.effects-panel__main:disabled) {
          opacity: 0.42;
        }

        .effects-panel__item strong {
          font-size: 1rem;
        }

        .effects-panel__item span {
          font-size: 0.84rem;
          color: rgba(255, 244, 232, 0.68);
        }

        .effects-panel__item.is-active span {
          color: rgba(55, 38, 23, 0.72);
        }

        @keyframes effects-panel-glow {
          0%, 100% {
            box-shadow:
              0 0 0 1px rgba(255, 245, 228, 0.52),
              0 0 0 3px rgba(255, 177, 86, 0.18),
              0 18px 28px rgba(255, 149, 119, 0.18),
              inset 0 0 24px rgba(255, 255, 255, 0.26);
          }
          50% {
            box-shadow:
              0 0 0 1px rgba(255, 247, 232, 0.66),
              0 0 0 3px rgba(255, 177, 86, 0.28),
              0 20px 32px rgba(255, 149, 119, 0.24),
              inset 0 0 28px rgba(255, 255, 255, 0.38);
          }
        }
      `}</style>
    </div>
  );
}
