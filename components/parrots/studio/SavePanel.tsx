type Props = {
  title: string;
  subtitle: string;
  isRendering: boolean;
  isSaved: boolean;
  exportUrl: string | null;
  loadingLabel: string;
  exportLabel: string;
  savedLabel: string;
  listenLabel: string;
  clearLabel: string;
  onRender: () => void;
  onListen: () => void;
  onClearAll: () => void;
};

export default function SavePanel({
  title,
  subtitle,
  isRendering,
  isSaved,
  exportUrl,
  loadingLabel,
  exportLabel,
  savedLabel,
  listenLabel,
  clearLabel,
  onRender,
  onListen,
  onClearAll,
}: Props) {
  return (
    <div className="save-panel">
      <div className="save-panel__copy">
        <strong>{title}</strong>
        <p>{subtitle}</p>
      </div>

      <button type="button" className="save-panel__primary" onClick={onRender} disabled={isRendering || isSaved}>
        {isRendering ? loadingLabel : isSaved ? savedLabel : exportLabel}
      </button>

      <button type="button" className="save-panel__secondary" onClick={onListen} disabled={!exportUrl || isRendering}>
        {listenLabel}
      </button>

      <div className="save-panel__danger">
        <span>Dangerous zone</span>
        <button type="button" className="save-panel__danger-button" onClick={onClearAll}>
          {clearLabel}
        </button>
      </div>

      <style jsx>{`
        .save-panel {
          display: grid;
          gap: 0.9rem;
        }

        .save-panel__copy {
          padding: 1rem;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .save-panel__copy strong {
          display: block;
          color: #fff4e8;
          font-size: 1rem;
        }

        .save-panel__copy p {
          margin: 0.45rem 0 0;
          color: rgba(255, 244, 232, 0.72);
          line-height: 1.45;
          font-size: 0.9rem;
        }

        .save-panel__primary,
        .save-panel__secondary,
        .save-panel__danger-button {
          min-height: 52px;
          border: none;
          border-radius: 18px;
          padding: 0.8rem 1rem;
          font-size: 0.94rem;
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease, opacity 0.18s ease;
        }

        .save-panel__primary {
          background: linear-gradient(180deg, #fff0b4 0%, #ffcfe9 100%);
          color: #2f2118;
          box-shadow: 0 14px 26px rgba(255, 176, 208, 0.22);
        }

        .save-panel__secondary {
          background: linear-gradient(180deg, #fff5e5 0%, #eadcff 100%);
          color: #32251b;
        }

        .save-panel__primary:hover,
        .save-panel__secondary:hover,
        .save-panel__danger-button:hover {
          transform: translateY(-1px);
          filter: saturate(1.05);
          box-shadow: 0 12px 22px rgba(255, 176, 208, 0.18);
        }

        .save-panel__primary:disabled,
        .save-panel__secondary:disabled {
          opacity: 0.46;
        }

        .save-panel__danger {
          margin-top: 0.3rem;
          padding: 1rem;
          border-radius: 22px;
          background: rgba(255, 112, 112, 0.08);
          border: 1px solid rgba(255, 112, 112, 0.16);
          display: grid;
          gap: 0.8rem;
        }

        .save-panel__danger span {
          color: rgba(255, 200, 200, 0.92);
          font-size: 0.9rem;
        }

        .save-panel__danger-button {
          background: linear-gradient(180deg, #ffd5d5 0%, #ffabab 100%);
          color: #4f1212;
        }
      `}</style>
    </div>
  );
}
