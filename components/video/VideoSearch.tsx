
export function VideoSearch() {
  return (
    <div className="video-search">
      <input
        type="text"
        className="video-search-input"
        placeholder="Найти видео или тему…"
        disabled
      />
      <div className="video-search-hint">
        🔍 Поиск скоро станет доступен
      </div>
    </div>
  );
}