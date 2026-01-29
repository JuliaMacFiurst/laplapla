

export function VideosRow() {
  return (
    <div className="videos-row">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="video-card">
          <div className="video-thumbnail">
            <span className="video-placeholder-icon">▶</span>
          </div>

          <div className="video-info">
            <div className="video-title">
              Простое объяснение сложной темы
            </div>
            <div className="video-meta">
              6–10 минут · образовательное видео
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}