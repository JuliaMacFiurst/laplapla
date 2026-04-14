type Props = {
  loopsVolume: number;
  voiceVolume: number;
  onLoopsVolumeChange: (value: number) => void;
  onVoiceVolumeChange: (value: number) => void;
};

export default function MixPanel({
  loopsVolume,
  voiceVolume,
  onLoopsVolumeChange,
  onVoiceVolumeChange,
}: Props) {
  return (
    <div className="mix-panel">
      <label className="mix-panel__row">
        <span>Loops Volume</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={loopsVolume}
          onChange={(event) => onLoopsVolumeChange(Number(event.target.value))}
        />
      </label>

      <label className="mix-panel__row">
        <span>Voice Volume</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={voiceVolume}
          onChange={(event) => onVoiceVolumeChange(Number(event.target.value))}
        />
      </label>

      <style jsx>{`
        .mix-panel {
          display: grid;
          gap: 1rem;
        }

        .mix-panel__row {
          display: grid;
          gap: 0.6rem;
          padding: 0.95rem 1rem;
          border-radius: 22px;
          background: linear-gradient(180deg, #fff5e3 0%, #ffe7f4 100%);
          color: #2b231b;
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }

        .mix-panel__row:hover {
          transform: translateY(-1px);
          filter: saturate(1.05);
          box-shadow: 0 14px 24px rgba(255, 178, 211, 0.18);
        }

        .mix-panel__row span {
          font-size: 0.96rem;
          font-weight: 600;
        }

        .mix-panel__row input {
          width: 100%;
          accent-color: #ff914d;
        }
      `}</style>
    </div>
  );
}
