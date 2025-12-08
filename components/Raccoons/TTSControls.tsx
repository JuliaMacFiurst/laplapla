import {useCallback, useMemo } from "react";
import useTTS from "./useTTS";

/**
 * TTSControls
 * - Кнопка PLAY (круглая neo) — если аудио уже есть, сразу играет; если нет — дергает синтез и после — играет
 * - Кнопка STOP (круглая neo) — мгновенная остановка и сброс в начало
 * - Во время генерации показывает спиннер поверх PLAY
 *
 * Ожидается, что стили для .mixer-card.mixer-play.play-neo и .mixer-card.mixer-stop.play-neo
 * уже подключены (как в Parrots). Мы лишь отрисовываем нужную DOM-структуру:
 *  - для PLAY: внутри есть .play-tri и .pulse
 *  - для STOP: внутри .pause-bars с двумя <span/>
 *  - спиннер: .tts-spinner (микро-оверлей)
 */

export interface TTSControlsProps {
  /** Текст для озвучки (сырой, без HTML) */
  text: string | null;
  /** Уникальный ключ кэша, например: `${type}:${id}:ru` */
  cacheKey: string;
  /** Если аудио уже сгенерировано и сохранено — можно передать URL */
  initialAudioUrl?: string | null;
  /** Язык для синтеза, напр.: "ru-RU" | "en-US" | "he-IL" */
  languageCode?: "ru-RU" | "en-US" | "he-IL";
  /** Имя голоса (Google TTS), напр.: "ru-RU-Wavenet-C" */
  voiceName?: string;
  /** Опционально: callback при получении/обновлении url */
  onAudioReady?: (url: string) => void;
}

const TTSControls: React.FC<TTSControlsProps> = ({
  text,
  cacheKey,
  initialAudioUrl = null,
  languageCode = "ru-RU",
  voiceName = "ru-RU-Wavenet-C",
  onAudioReady,
}) => {
  const getUrl = useCallback(async () => {
    if (!text || text.trim().length < 2) {
      throw new Error("Пустой текст для озвучки");
    }
    const res = await fetch("/api/tts-synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cacheKey,
        text,
        languageCode,
        voiceName,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || "Синтез не удался");
    }
    const { audioUrl: url } = (await res.json()) as { audioUrl: string };
    if (!url) throw new Error("Сервер не вернул audioUrl");
    return url;
  }, [cacheKey, languageCode, text, voiceName]);

  const onError = useCallback(() => {
    // noop or could be extended to handle errors if needed
  }, []);

  const {
    ensureAndPlay,
    stop,
    isPlaying,
    isLoading,
    error,
  }: {
    ensureAndPlay: () => void,
    stop: () => void,
    isPlaying: boolean,
    isLoading: boolean,
    error: unknown,
  } = useTTS({
    cacheKey,
    getUrl,
    initialAudioUrl,
    onAudioReady,
    onError,
  });

  // Доступные ярлыки для screen readers
  const playLabel = useMemo(
    () => (isLoading ? "Генерирую озвучку…" : isPlaying ? "Пауза" : "Воспроизвести"),
    [isLoading, isPlaying]
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {/* PLAY */}
      <button
        type="button"
        className="mixer-card mixer-play play-neo"
        aria-label={playLabel}
        onClick={isPlaying ? stop : ensureAndPlay}
        disabled={isLoading || !text}
        style={{ position: "relative" }}
      >
        {/* Треугольник Play (виден, когда НЕ проигрывается) */}
        {!isPlaying && <span className="play-tri" aria-hidden="true" />}
        {/* Пауза-иконка (видна, когда проигрывается) */}
        {isPlaying && (
          <span className="pause-bars" aria-hidden="true">
            <span />
            <span />
          </span>
        )}
        {/* Пульс-свечение */}
        <span className="pulse" aria-hidden="true" />

        {/* Спиннер поверх при генерации */}
        {isLoading && (
          <span
            className="tts-spinner"
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              borderRadius: "50%",
              background:
                "radial-gradient(120% 120% at 30% 20%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.5) 55%, rgba(238,241,255,0.45) 100%)",
              backdropFilter: "blur(1px)",
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              role="img"
              aria-label="Генерация"
            >
              <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.2)" strokeWidth="3" fill="none" />
              <path
                d="M22 12a10 10 0 0 1-10 10"
                stroke="rgba(0,0,0,0.65)"
                strokeWidth="3"
                fill="none"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 12 12"
                  to="360 12 12"
                  dur="0.9s"
                  repeatCount="indefinite"
                />
              </path>
            </svg>
          </span>
        )}
        <span className="mixer-play-label">Play / Pause</span>
      </button>

      {/* STOP — отдельная кнопка */}
      <button
        type="button"
        className="mixer-card mixer-stop play-neo"
        aria-label="Стоп"
        onClick={stop}
      >
        <span className="pause-bars" aria-hidden="true">
          <span />
          <span />
        </span>
        <span className="pulse" aria-hidden="true" />
        <span className="mixer-play-label">Stop</span>
      </button>

      {/* Ошибки компактно */}
      {error ? (
        <span style={{ color: "crimson", fontSize: 12, maxWidth: 320 }}>
          {String(error ?? "")}
        </span>
      ) : null}
    </div>
  );
};

export default TTSControls;