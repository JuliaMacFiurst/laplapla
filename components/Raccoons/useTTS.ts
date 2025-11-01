import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * useTTS — универсальный хук управления аудио-озвучкой (без прямых вызовов TTS API).
 *
 * БЕЗОПАСНОСТЬ И АРХИТЕКТУРА:
 * - Хук НИКОГДА не делает синтез сам и не обращается к внешним TTS (Gemini/OpenAI/Google).
 * - Он получает единственный источник правды — функцию `getUrl()`,
 *   которая ДОЛЖНА работать ТОЛЬКО на серверной стороне (ваш API-обработчик) и:
 *     1) проверять Supabase: есть ли уже готовый аудиофайл;
 *     2) если файла нет — синтезировать на сервере и сохранить в Supabase;
 *     3) вернуть публичный URL на mp3.
 *
 * ФУНКЦИОНАЛ:
 * - Управляет PLAY / PAUSE / STOP.
 * - Следит за сменой `cacheKey`: останавливает прежнее аудио и готовит новое.
 * - Жёсткая очистка при unmount, закрытии попапа и др.
 * - Сохраняет флаг `enabled` в localStorage ("ttsEnabled").
 * - Возвращает компактный и предсказуемый API для компонентов.
 */

export interface UseTTSOptions {
  /** Уникальный ключ текущего контента, например `${type}:${id}:ru` */
  cacheKey: string;
  /** Возвращает готовый публичный audio URL; выполняется ТОЛЬКО на сервере через ваш API */
  getUrl: () => Promise<string>;
  /** Начальный URL (если уже известен из БД) */
  initialAudioUrl?: string | null;
  /** Громкость 0..1 */
  volume?: number;
  /** Автостоп при смене cacheKey (по умолчанию true) */
  autoStopOnKeyChange?: boolean;
  /** Callback-и на ключевые события плеера */
  onStart?: (url: string) => void;
  onStop?: () => void;
  onEnded?: () => void;
  onError?: (err: unknown) => void;
  onAudioReady?: (url: string) => void;
}

export interface UseTTSResult {
  /** Включена ли в принципе озвучка (user toggle), хранится в localStorage */
  enabled: boolean;
  setEnabled: (v: boolean) => void;

  /** Текущее состояние проигрывания/загрузки */
  isPlaying: boolean;
  isLoading: boolean;
  error: unknown;

  /** Текущий URL (если получен) */
  currentUrl: string | null;

  /** Управление плеером */
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;

  /** Гарантированное воспроизведение: при отсутствии URL дернёт getUrl(), кэширует и запустит */
  ensureAndPlay: () => Promise<void>;
}

export function useTTS({
  cacheKey,
  getUrl,
  initialAudioUrl = null,
  volume = 1,
  autoStopOnKeyChange = true,
  onStart,
  onStop,
  onEnded,
  onError,
  onAudioReady,
}: UseTTSOptions): UseTTSResult {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = window.localStorage.getItem("ttsEnabled");
    return v === null ? true : v === "true";
  });

  const [isPlaying, setPlaying] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(initialAudioUrl);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lockRef = useRef<boolean>(false); // защита от двойных запросов getUrl()
  const lastKeyRef = useRef<string>(cacheKey);

  // Синхронизируем localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ttsEnabled", String(enabled));
    }
  }, [enabled]);

  // Слежение за сменой cacheKey: останавливаем и сбрасываем URL (но не загружаем автоматически)
  useEffect(() => {
    if (lastKeyRef.current !== cacheKey) {
      lastKeyRef.current = cacheKey;
      if (autoStopOnKeyChange) stop();
      setCurrentUrl(initialAudioUrl ?? null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, initialAudioUrl, autoStopOnKeyChange]);

  // Ленивая инициализация элемента <audio>
  const ensureAudio = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) {
      const a = new Audio();
      a.preload = "auto";
      a.volume = Math.min(Math.max(volume, 0), 1);
      a.addEventListener("ended", () => {
        setPlaying(false);
        onEnded?.();
      });
      a.addEventListener("pause", () => {
        setPlaying(false);
      });
      a.addEventListener("play", () => {
        setPlaying(true);
      });
      a.addEventListener("error", () => {
        const err = new Error("Audio playback error");
        setError(err);
        onError?.(err);
        setPlaying(false);
      });
      audioRef.current = a;
    } else {
      audioRef.current.volume = Math.min(Math.max(volume, 0), 1);
    }
    return audioRef.current;
  }, [onEnded, onError, volume]);

  // STOP — полностью глушит и возвращает к началу
  const stop = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      try {
        a.pause();
        a.currentTime = 0;
      } catch {}
    }
    setPlaying(false);
    onStop?.();
  }, [onStop]);

  // PAUSE
  const pause = useCallback(() => {
    const a = audioRef.current;
    if (a) a.pause();
    setPlaying(false);
  }, []);

  // Получить URL при необходимости и запустить
  const ensureAndPlay = useCallback(async () => {
    if (!enabled) return; // уважаем тумблер пользователя
    setError(null);

    // Если URL уже есть — просто проигрываем
    if (currentUrl) {
      const a = ensureAudio();
      if (a.src !== currentUrl) a.src = currentUrl;
      await a.play();
      onStart?.(currentUrl);
      return;
    }

    // Иначе — запрашиваем URL один раз (c lock)
    if (lockRef.current) return;
    lockRef.current = true;
    setLoading(true);
    try {
      const url = await getUrl(); // <<< только ваш сервер
      setCurrentUrl(url);
      onAudioReady?.(url);
      const a = ensureAudio();
      if (a.src !== url) a.src = url;
      await a.play();
      onStart?.(url);
    } catch (e) {
      setError(e);
      onError?.(e);
    } finally {
      setLoading(false);
      lockRef.current = false;
    }
  }, [currentUrl, enabled, ensureAudio, getUrl, onError, onStart, onAudioReady]);

  // Явный PLAY: если уже играем — делает паузу; если нет — запускает ensureAndPlay
  const play = useCallback(async () => {
    if (isPlaying) {
      pause();
      return;
    }
    await ensureAndPlay();
  }, [ensureAndPlay, isPlaying, pause]);

  // Жёсткая очистка при размонтаже (закрытие попапа и т.п.)
  useEffect(() => {
    return () => {
      try {
        const a = audioRef.current;
        if (a) {
          a.pause();
          a.src = "";
          a.load();
        }
      } catch {}
      audioRef.current = null;
      setPlaying(false);
    };
  }, []);

  const result: UseTTSResult = useMemo(
    () => ({
      enabled,
      setEnabled: setEnabledState,
      isPlaying,
      isLoading,
      error,
      currentUrl,
      play,
      pause,
      stop,
      ensureAndPlay,
    }),
    [enabled, isPlaying, isLoading, error, currentUrl, play, pause, stop, ensureAndPlay]
  );

  return result;
}

export default useTTS;