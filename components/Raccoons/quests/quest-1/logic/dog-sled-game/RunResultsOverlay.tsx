"use client";

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
  return (
    <div className="dog-sled-results-overlay">
      <div className="dog-sled-results-card">
        <h2>Результат</h2>

        <div className="dog-sled-results-row">
          <span>⭐ </span>
          <strong>{stars}</strong>
        </div>

        <div className="dog-sled-results-row">
          <span>💥 Аварии</span>
          <strong>{crashes}</strong>
        </div>

        <div className="dog-sled-results-actions">
          <button onClick={onRetry}>Ещё раз</button>
          {onExit && (
            <button className="ghost" onClick={onExit}>
              ← Назад
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
