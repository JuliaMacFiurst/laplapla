

export function ShortsRow() {
  return (
    <div className="shorts-row">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="short-card">
          <div className="short-thumbnail">
            <span className="short-placeholder-icon">▶</span>
          </div>
          <div className="short-title">
            Видео-объяснялка
          </div>
        </div>
      ))}
    </div>
  );
}