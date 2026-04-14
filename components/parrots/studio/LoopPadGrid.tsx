type LoopPad = {
  id: string;
  label: string;
  iconSrc: string;
  type: "beat" | "melody" | "fx" | "vocal";
  isActive: boolean;
  variantLabel: string;
  variantIndex: number | null;
  variantCount: number;
};

type Props = {
  loops: LoopPad[];
  onCycleVariant: (loopId: string) => void;
  onDisable: (loopId: string) => void;
};

const TYPE_LABEL: Record<LoopPad["type"], string> = {
  beat: "Beat",
  melody: "Melody",
  fx: "FX",
  vocal: "Vocal",
};

const TYPE_TINT: Record<LoopPad["type"], string> = {
  beat: "#ffcf8b",
  melody: "#b7f0cf",
  fx: "#ffd3e8",
  vocal: "#cfc6ff",
};

export default function LoopPadGrid({ loops, onCycleVariant, onDisable }: Props) {
  return (
    <div className="loop-pad-grid">
      {loops.map((loop) => (
        <div
          key={loop.id}
          className={`loop-pad-grid__pad ${loop.isActive ? "is-active" : "is-disabled"}`}
        >
          <div className="loop-pad-grid__media-wrap">
            <img
              src={loop.iconSrc}
              alt=""
              className={`loop-pad-grid__icon ${loop.isActive ? "is-bouncing" : ""}`}
            />
            <span className="loop-pad-grid__type" style={{ background: TYPE_TINT[loop.type] }}>
              {TYPE_LABEL[loop.type]}
            </span>
          </div>

          <strong>{loop.label}</strong>
          <span className="loop-pad-grid__variant">
            {loop.isActive ? `${loop.variantLabel} · ${loop.variantIndex! + 1}/${loop.variantCount}` : "Disabled"}
          </span>

          <div className="loop-pad-grid__actions">
            <button
              type="button"
              className="loop-pad-grid__action loop-pad-grid__action--cycle"
              onClick={() => onCycleVariant(loop.id)}
            >
              {loop.isActive ? "Next loop" : "Enable"}
            </button>
            <button
              type="button"
              className="loop-pad-grid__action loop-pad-grid__action--off"
              onClick={() => onDisable(loop.id)}
              disabled={!loop.isActive}
            >
              Off
            </button>
          </div>
        </div>
      ))}

      <style jsx>{`
        .loop-pad-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }

        .loop-pad-grid__pad {
          min-height: 112px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 0.85rem;
          background: linear-gradient(180deg, #fff8e8 0%, #ffe7f3 100%);
          color: #2b231b;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: space-between;
          box-shadow: 0 10px 22px rgba(122, 76, 20, 0.1);
          text-align: left;
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }

        .loop-pad-grid__pad.is-active {
          background: linear-gradient(180deg, #fff0a6 0%, #ffc9ea 52%, #d7d0ff 100%);
          box-shadow: 0 0 0 2px rgba(255, 145, 77, 0.4), 0 16px 28px rgba(255, 145, 77, 0.18);
        }

        .loop-pad-grid__pad.is-disabled {
          background: linear-gradient(180deg, #47484d 0%, #2d2f35 100%);
          color: #f2f2f2;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
        }

        .loop-pad-grid__pad:hover {
          transform: translateY(-1px);
          filter: saturate(1.05);
          box-shadow: 0 14px 28px rgba(255, 174, 210, 0.2);
        }

        .loop-pad-grid__media-wrap {
          width: 100%;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .loop-pad-grid__icon {
          width: 56px;
          height: 56px;
          object-fit: contain;
          flex: 0 0 auto;
        }

        .loop-pad-grid__pad.is-disabled .loop-pad-grid__icon {
          filter: grayscale(1) contrast(0.92) brightness(1.18);
          opacity: 0.86;
        }

        .loop-pad-grid__icon.is-bouncing {
          animation: loop-pad-bounce 0.95s ease-in-out infinite;
          transform-origin: center bottom;
        }

        .loop-pad-grid__type {
          min-height: 28px;
          padding: 0.35rem 0.6rem;
          border-radius: 999px;
          font-size: 0.72rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .loop-pad-grid__pad strong {
          font-size: 1rem;
          line-height: 1.2;
        }

        .loop-pad-grid__variant {
          font-size: 0.8rem;
          opacity: 0.76;
        }

        .loop-pad-grid__actions {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 0.5rem;
        }

        .loop-pad-grid__action {
          min-height: 38px;
          border: none;
          border-radius: 14px;
          padding: 0.55rem 0.75rem;
          font-size: 0.82rem;
        }

        .loop-pad-grid__action--cycle {
          background: rgba(255, 255, 255, 0.72);
          color: #2b231b;
        }

        .loop-pad-grid__action--off {
          background: rgba(44, 34, 27, 0.12);
          color: inherit;
          min-width: 58px;
        }

        .loop-pad-grid__action--off:disabled {
          opacity: 0.4;
        }

        @keyframes loop-pad-bounce {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-4px) scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}
