"use client";
import { useQuest1I18n } from "../../i18n";

interface RunResultsOverlayProps {
  stars: number;
  crashes: number;
  onRetry: () => void;
  onExit?: () => void;
}

export default function RunResultsOverlay({
  stars,
  crashes,
  onRetry,
  onExit,
}: RunResultsOverlayProps) {
  const { t } = useQuest1I18n();
  const copy = t.day5Garage.run;
  return (
    <div className="dog-sled-results-overlay">
      <div className="dog-sled-results-card">
        <h2>{copy.result}</h2>

        <div className="dog-sled-results-row">
          <span>⭐ {copy.stars}</span>
          <strong>{stars}</strong>
        </div>

        <div className="dog-sled-results-row">
          <span>💥 {copy.crashes}</span>
          <strong>{crashes}</strong>
        </div>

        <div className="dog-sled-results-actions">
          <button onClick={onRetry}>{copy.retry}</button>
          {onExit && (
            <button className="ghost" onClick={onExit}>
              ← {copy.back}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
