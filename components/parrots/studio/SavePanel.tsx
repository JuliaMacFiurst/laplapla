import { useState } from "react";
import { isParrotExportComplete } from "@/lib/parrots/exportDiagnostics";

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
  dangerousZoneLabel: string;
  confirmClearTitle: string;
  confirmClearBody: string;
  confirmClearConfirmLabel: string;
  confirmClearCancelLabel: string;
  errorMessage: string | null;
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
  dangerousZoneLabel,
  confirmClearTitle,
  confirmClearBody,
  confirmClearConfirmLabel,
  confirmClearCancelLabel,
  errorMessage,
  onRender,
  onListen,
  onClearAll,
}: Props) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  // TEMP_PARROT_EXPORT_DIAGNOSTICS: remove with the temporary export diagnostics.
  const [diagnosticCopyStatus, setDiagnosticCopyStatus] = useState("Copy diagnostics");
  const isExportComplete = isParrotExportComplete(isSaved, exportUrl);

  const copyDiagnostics = async () => {
    if (!errorMessage || typeof document === "undefined") return;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(errorMessage);
        setDiagnosticCopyStatus("Copied");
        return;
      }
    } catch {
      // Fall through to the selection-based copy path used by older WebViews.
    }

    const textarea = document.createElement("textarea");
    textarea.value = errorMessage;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);

    try {
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      const copied = typeof document.execCommand === "function" && document.execCommand("copy");
      setDiagnosticCopyStatus(copied ? "Copied" : "Copy failed");
    } catch {
      setDiagnosticCopyStatus("Copy failed");
    } finally {
      textarea.remove();
    }
  };

  return (
    <div className="save-panel">
      <div className="save-panel__copy">
        <strong>{title}</strong>
        <p>{subtitle}</p>
      </div>

      <button type="button" className="save-panel__primary" onClick={onRender} disabled={isRendering || isExportComplete}>
        {isRendering ? loadingLabel : isExportComplete ? savedLabel : exportLabel}
      </button>

      <button type="button" className="save-panel__secondary" onClick={onListen} disabled={!exportUrl || isRendering}>
        {listenLabel}
      </button>

      {/* TEMP_PARROT_EXPORT_DIAGNOSTICS: mobile-safe scroll/copy surface. */}
      {errorMessage ? (
        <section className="save-panel__diagnostic" aria-label="Temporary export diagnostics">
          <div className="save-panel__diagnostic-actions">
            <button type="button" onClick={() => void copyDiagnostics()}>
              {diagnosticCopyStatus}
            </button>
          </div>
          <pre className="save-panel__error" role="alert">{errorMessage}</pre>
        </section>
      ) : null}

      <div className="save-panel__danger">
        <span>{dangerousZoneLabel}</span>
        <button type="button" className="save-panel__danger-button" onClick={() => setIsConfirmOpen(true)}>
          {clearLabel}
        </button>
      </div>

      {isConfirmOpen ? (
        <div className="save-panel__confirm-overlay" role="dialog" aria-modal="true">
          <div className="save-panel__confirm-card">
            <strong>{confirmClearTitle}</strong>
            <p>{confirmClearBody}</p>
            <div className="save-panel__confirm-actions">
              <button
                type="button"
                className="save-panel__confirm-button save-panel__confirm-button--danger"
                onClick={() => {
                  setIsConfirmOpen(false);
                  onClearAll();
                }}
              >
                {confirmClearConfirmLabel}
              </button>
              <button
                type="button"
                className="save-panel__confirm-button"
                onClick={() => setIsConfirmOpen(false)}
              >
                {confirmClearCancelLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .save-panel {
          display: grid;
          gap: 0.9rem;
          position: relative;
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

        .save-panel__diagnostic {
          max-height: min(58dvh, 520px);
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          scroll-padding-bottom: calc(104px + env(safe-area-inset-bottom, 0px));
          padding: 0 0 calc(104px + env(safe-area-inset-bottom, 0px));
          border-radius: 16px;
          background: rgba(30, 8, 12, 0.42);
        }

        .save-panel__diagnostic-actions {
          position: sticky;
          top: 0;
          z-index: 1;
          display: flex;
          justify-content: flex-end;
          padding: 0.55rem;
          background: rgba(30, 8, 12, 0.94);
        }

        .save-panel__diagnostic-actions button {
          min-height: 40px;
          border: 1px solid rgba(255, 180, 171, 0.55);
          border-radius: 12px;
          padding: 0.45rem 0.7rem;
          background: #fff0ed;
          color: #551a16;
          font-weight: 800;
        }

        .save-panel__error {
          margin: 0;
          padding: 0.7rem;
          color: #ffb4ab;
          font-weight: 700;
          font: inherit;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
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

        .save-panel__confirm-overlay {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          background: rgba(10, 10, 16, 0.86);
          display: grid;
          place-items: center;
          padding: 1rem;
          z-index: 2;
        }

        .save-panel__confirm-card {
          width: 100%;
          border-radius: 22px;
          background: linear-gradient(180deg, #fff5ec 0%, #ffe3eb 100%);
          color: #2b1e18;
          padding: 1rem;
          box-shadow: 0 18px 30px rgba(0, 0, 0, 0.24);
          display: grid;
          gap: 0.8rem;
        }

        .save-panel__confirm-card strong {
          font-size: 1rem;
        }

        .save-panel__confirm-card p {
          margin: 0;
          line-height: 1.45;
          font-size: 0.92rem;
        }

        .save-panel__confirm-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.6rem;
        }

        .save-panel__confirm-button {
          min-height: 46px;
          border: none;
          border-radius: 16px;
          background: rgba(43, 30, 24, 0.1);
          color: #2b1e18;
        }

        .save-panel__confirm-button--danger {
          background: linear-gradient(180deg, #ffcdcd 0%, #ff9c9c 100%);
          color: #5a1515;
        }
      `}</style>
    </div>
  );
}
