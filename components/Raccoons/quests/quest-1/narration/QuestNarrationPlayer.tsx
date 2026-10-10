import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Lang } from "@/i18n";
import type { Quest1PageId } from "../progress";
import {
  isQuest1NarrationEnabled,
  resolveQuest1NarrationUrl,
  type NarrationBlockId,
} from "./catalog";
import { adjacentNarrationBlock, selectNarrationBlock } from "./context";
import { QUEST_1_NARRATION_LABELS } from "./labels";
import {
  DEFAULT_QUEST_1_NARRATION_SETTINGS,
  persistQuest1NarrationSettings,
  readQuest1NarrationSettings,
} from "./settings";
import { playQuestNarrationAudio, stopQuestNarrationAudio } from "./audioRuntime";

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export default function QuestNarrationPlayer({ pageId, locale, availableBlockIds }: {
  pageId: Quest1PageId;
  locale: Lang;
  availableBlockIds: readonly NarrationBlockId[];
}) {
  const available = availableBlockIds;
  const labels = QUEST_1_NARRATION_LABELS[locale];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const localeRef = useRef(locale);
  const availableRef = useRef(available);
  const selectedRef = useRef<NarrationBlockId | null>(available[0] ?? null);
  const userStartedRef = useRef(false);
  const enabledRef = useRef(true);
  const playbackAttemptRef = useRef(0);
  const [selected, setSelected] = useState<NarrationBlockId | null>(available[0] ?? null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_QUEST_1_NARRATION_SETTINGS);
  const [settingsHydrated, setSettingsHydrated] = useState(false);

  const stop = useCallback(() => {
    playbackAttemptRef.current += 1;
    const audio = audioRef.current;
    stopQuestNarrationAudio(audio);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const playBlock = useCallback(async (blockId: NarrationBlockId) => {
    const attempt = playbackAttemptRef.current + 1;
    playbackAttemptRef.current = attempt;
    const url = resolveQuest1NarrationUrl(blockId, localeRef.current);
    const audio = audioRef.current;
    if (!url || !audio || !enabledRef.current) {
      setLoadFailed(true);
      return false;
    }

    setLoadFailed(false);
    try {
      await playQuestNarrationAudio(audio, url);
      if (attempt !== playbackAttemptRef.current) {
        audio.pause();
        return false;
      }
      userStartedRef.current = true;
      setPlaying(true);
      return true;
    } catch {
      setPlaying(false);
      return false;
    }
  }, []);

  useEffect(() => {
    const stored = readQuest1NarrationSettings(browserStorage());
    enabledRef.current = stored.enabled;
    setSettings(stored);
    setSettingsHydrated(true);
  }, []);

  useEffect(() => {
    if (!settingsHydrated) return;
    enabledRef.current = settings.enabled;
    persistQuest1NarrationSettings(browserStorage(), settings);
    if (!settings.enabled) stop();
  }, [settings, settingsHydrated, stop]);

  useEffect(() => {
    availableRef.current = available;
    const nextSelected = selectNarrationBlock(available, selectedRef.current);
    if (nextSelected === selectedRef.current) return;
    selectedRef.current = nextSelected;
    setSelected(nextSelected);
    userStartedRef.current = false;
    setLoadFailed(false);
    stop();
  }, [available, pageId, stop]);

  useEffect(() => {
    if (localeRef.current === locale) return;
    localeRef.current = locale;
    userStartedRef.current = false;
    setLoadFailed(false);
    stop();
  }, [locale, stop]);

  useEffect(() => () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
  }, []);

  const previous = useMemo(
    () => adjacentNarrationBlock(available, selected, -1),
    [available, selected],
  );
  const next = useMemo(
    () => adjacentNarrationBlock(available, selected, 1),
    [available, selected],
  );

  const choose = useCallback((blockId: NarrationBlockId) => {
    stop();
    selectedRef.current = blockId;
    setSelected(blockId);
    setLoadFailed(false);
  }, [stop]);

  if (!isQuest1NarrationEnabled || available.length === 0) return null;

  if (settings.collapsed) {
    return (
      <button
        type="button"
        className="quest-narration-launcher"
        aria-label={labels.expand}
        title={labels.expand}
        onClick={() => setSettings((current) => ({ ...current, collapsed: false }))}
      >
        <span aria-hidden>🔊</span>
      </button>
    );
  }

  return (
    <section className="quest-narration-player" aria-label={labels.expand} dir={locale === "he" ? "rtl" : "ltr"}>
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onError={() => {
          setPlaying(false);
          setLoadFailed(true);
        }}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
          const following = adjacentNarrationBlock(
            availableRef.current,
            selectedRef.current,
            1,
          );
          if (!following || !userStartedRef.current || !enabledRef.current) return;
          selectedRef.current = following;
          setSelected(following);
          void playBlock(following);
        }}
      />
      <button
        type="button"
        className="quest-narration-button"
        aria-label={settings.enabled ? labels.disable : labels.enable}
        title={settings.enabled ? labels.disable : labels.enable}
        aria-pressed={settings.enabled}
        onClick={() => setSettings((current) => ({ ...current, enabled: !current.enabled }))}
      >
        <span aria-hidden>{settings.enabled ? "🔊" : "🔇"}</span>
      </button>
      <button
        type="button"
        className="quest-narration-button"
        aria-label={labels.previous}
        title={labels.previous}
        disabled={!previous}
        onClick={() => previous && choose(previous)}
      >
        <span aria-hidden>⏮</span>
      </button>
      <button
        type="button"
        className="quest-narration-button quest-narration-button--primary"
        aria-label={playing ? labels.pause : labels.play}
        title={playing ? labels.pause : labels.play}
        disabled={!settings.enabled || !selected}
        onClick={() => {
          if (playing) {
            audioRef.current?.pause();
          } else if (selected) {
            void playBlock(selected);
          }
        }}
      >
        <span aria-hidden>{playing ? "⏸" : "▶"}</span>
      </button>
      <button
        type="button"
        className="quest-narration-button"
        aria-label={labels.next}
        title={labels.next}
        disabled={!next}
        onClick={() => next && choose(next)}
      >
        <span aria-hidden>⏭</span>
      </button>
      <output className="quest-narration-time" aria-live="off">
        {formatTime(currentTime)} / {formatTime(duration)}
      </output>
      {loadFailed ? <span className="quest-narration-status" role="status">{labels.unavailable}</span> : null}
      <button
        type="button"
        className="quest-narration-collapse"
        aria-label={labels.collapse}
        title={labels.collapse}
        onClick={() => setSettings((current) => ({ ...current, collapsed: true }))}
      >
        <span aria-hidden>×</span>
      </button>
    </section>
  );
}
