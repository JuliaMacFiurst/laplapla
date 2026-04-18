import { useEffect, useMemo, useRef, useState } from "react";
import { dictionaries } from "@/i18n";
import { getMusicStyle } from "@/content/parrots/musicStyles";
import { PARROT_PRESETS, iconForInstrument, iconForMusicStyle, type ParrotLoop } from "@/utils/parrot-presets";
import type { ParrotStorySlide } from "@/lib/parrotStoryMedia";
import LoopPadGrid from "./LoopPadGrid";
import VoiceRecorder from "./VoiceRecorder";
import EffectsPanel from "./EffectsPanel";
import MixPanel from "./MixPanel";
import StudioBottomBar from "./StudioBottomBar";
import ParrotGuide from "./ParrotGuide";
import SavePanel from "./SavePanel";
import ParrotStoryOverlay from "./ParrotStoryOverlay";

type Mode = "loops" | "voice" | "effects" | "mix" | "save";
type PreviewKey = keyof VoiceEffectsState | keyof LoopEffectState | "speed";

type VoiceState = {
  audioUrl: string | null;
};

type VoiceEffectsState = {
  child: boolean;
  echo: boolean;
  reverb: boolean;
  robot: boolean;
  whisper: boolean;
  mega: boolean;
  radio: boolean;
};

type LoopEffectState = {
  echo: boolean;
  reverb: boolean;
  boost: boolean;
  soft: boolean;
};

type EffectsState = {
  activeCategory: "voice" | "loops";
  voice: VoiceEffectsState;
  loops: {
    speed: boolean;
    targetLoopId: string | null;
    byLoop: Record<string, LoopEffectState>;
  };
};

type CompositionState = {
  activeMode: Mode;
  activeLoops: string[];
  loopSelections: Record<string, number | null>;
  effects: EffectsState;
  voice: VoiceState;
  mix: {
    loopsVolume: number;
    voiceVolume: number;
  };
};

type StorySlide = {
  text: string;
  mediaUrl?: string;
  mediaType?: "gif" | "image" | "video";
};

type Props = {
  lang: "ru" | "en" | "he";
  initialStyleSlug: string;
  expectedStudioType?: "parrot";
  storySlides?: StorySlide[];
  onClose: () => void;
  onSwitchLanguage: (lang: "ru" | "en" | "he") => void;
  onOpenStory: (composition: {
    activeLoops: string[];
    voice: VoiceState;
    effects: EffectsState;
    loopsVolume: number;
    voiceVolume: number;
  }) => void;
};

function resolveLoopType(loop: ParrotLoop): "beat" | "melody" | "fx" | "vocal" {
  const source = `${loop.id} ${loop.label}`.toLowerCase();
  if (source.includes("beat") || source.includes("drum") || source.includes("perc")) return "beat";
  if (source.includes("fx") || source.includes("шум")) return "fx";
  if (source.includes("vocal") || source.includes("voice")) return "vocal";
  return "melody";
}

const openGoogle = (query: string) => {
  window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank");
};

const createEmptyLoopEffects = (loops: ParrotLoop[]) =>
  loops.reduce<Record<string, LoopEffectState>>((acc, loop) => {
    acc[loop.id] = {
      echo: false,
      reverb: false,
      boost: false,
      soft: false,
    };
    return acc;
  }, {});

const SESSION_STORAGE_KEY = "parrot-studio-mobile-v1";

const getVoiceGainMultiplier = (effects: VoiceEffectsState) =>
  effects.whisper ? 0.72 : effects.mega ? 1.22 : 1;

export default function ParrotStudioRoot({
  lang,
  initialStyleSlug,
  expectedStudioType,
  storySlides,
  onClose,
  onSwitchLanguage,
  onOpenStory: _onOpenStory,
}: Props) {
  if (typeof window !== "undefined" && expectedStudioType) {
    const routeType = new URLSearchParams(window.location.search).get("type");
    if (routeType !== expectedStudioType) {
      return null;
    }
  }

  const [selectedStyleSlug, setSelectedStyleSlug] = useState(initialStyleSlug);
  const [composition, setComposition] = useState<CompositionState>({
    activeMode: "loops",
    activeLoops: [],
    loopSelections: {},
    effects: {
      activeCategory: "voice",
      voice: {
        child: false,
        echo: false,
        reverb: false,
        robot: false,
        whisper: false,
        mega: false,
        radio: false,
      },
      loops: {
        speed: false,
        targetLoopId: null,
        byLoop: {},
      },
    },
    voice: {
      audioUrl: null,
    },
    mix: {
      loopsVolume: 0.8,
      voiceVolume: 1,
    },
  });
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [isCompositionPlaying, setIsCompositionPlaying] = useState(true);
  const [isRenderingSave, setIsRenderingSave] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [activePreviewKey, setActivePreviewKey] = useState<string | null>(null);
  const [renderedMixUrl, setRenderedMixUrl] = useState<string | null>(null);
  const [savedCompositionSnapshot, setSavedCompositionSnapshot] = useState<string | null>(null);
  const renderedMixAudioRef = useRef<HTMLAudioElement | null>(null);

  const audioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const styleMenuRef = useRef<HTMLDivElement | null>(null);
  const languageMenuRef = useRef<HTMLDivElement | null>(null);
  const previewContextRef = useRef<AudioContext | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimerRef = useRef<number | null>(null);
  const compositionVoiceContextRef = useRef<AudioContext | null>(null);
  const compositionVoiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const compositionVoiceGainRef = useRef<GainNode | null>(null);
  const compositionVoiceTimerRef = useRef<number | null>(null);
  const ownedVoiceBlobUrlRef = useRef<string | null>(null);
  const recordedVoiceBlobRef = useRef<Blob | null>(null);
  const hasRestoredSessionRef = useRef(false);
  const shouldSkipNextPresetInitRef = useRef(false);
  const hasPushedHistoryRef = useRef(false);
  const preset = useMemo(
    () => PARROT_PRESETS.find((item) => item.id === selectedStyleSlug) ?? PARROT_PRESETS[0],
    [selectedStyleSlug],
  );
  const musicStyle = useMemo(
    () => getMusicStyle(lang, selectedStyleSlug),
    [lang, selectedStyleSlug],
  );
  const languageCopySource = (dictionaries as unknown as Record<string, { language?: { title?: string; preview?: string } }>)[lang];
  const languageCopy = {
    title: languageCopySource?.language?.title ?? (lang === "ru" ? "Язык" : lang === "he" ? "שפה" : "Language"),
    preview: languageCopySource?.language?.preview ?? (
      lang === "ru"
        ? "Язык интерфейса можно сменить в любой момент."
        : lang === "he"
          ? "ניתן לשנות את שפת הממשק בכל עת."
          : "You can change the interface language at any time."
    ),
  };
  const uiCopy = {
    close: lang === "ru" ? "Закрыть" : lang === "he" ? "לסגור" : "Close",
    style: lang === "ru" ? "Стиль" : lang === "he" ? "סגנון" : "Style",
    play: lang === "ru" ? "Играть" : lang === "he" ? "נגן" : "Play",
    pause: lang === "ru" ? "Пауза" : lang === "he" ? "השהה" : "Pause",
    languages: lang === "ru" ? "Языки" : lang === "he" ? "שפות" : "Languages",
    youtube: "YouTube",
    google: "Google",
    story: lang === "ru" ? "История" : lang === "he" ? "סיפור" : "Story",
    bottomBar: {
      loops: lang === "ru" ? "Лупы" : lang === "he" ? "לופים" : "Loops",
      voice: lang === "ru" ? "Голос" : lang === "he" ? "קול" : "Voice",
      effects: lang === "ru" ? "Эффекты" : lang === "he" ? "אפקטים" : "Effects",
      mix: lang === "ru" ? "Микс" : lang === "he" ? "מיקס" : "Mix",
      save: lang === "ru" ? "Сохранить" : lang === "he" ? "שמור" : "Save",
    },
    voiceRecorder: {
      record: lang === "ru" ? "Запись" : lang === "he" ? "הקלט" : "Rec",
      stop: lang === "ru" ? "Стоп" : lang === "he" ? "עצור" : "Stop",
      childVoice: lang === "ru" ? "Детский голос" : lang === "he" ? "קול ילדי" : "Child Voice",
      hint: lang === "ru"
        ? "Запиши голос, и он появится здесь."
        : lang === "he"
          ? "הקליטו קול והוא יופיע כאן."
          : "Record a voice line and it will appear here.",
      micUnavailable: lang === "ru"
        ? "Микрофон недоступен в этом браузере."
        : lang === "he"
          ? "המיקרופון לא זמין בדפדפן הזה."
          : "Microphone is unavailable in this browser.",
      recordingFailed: lang === "ru"
        ? "Не удалось записать голос."
        : lang === "he"
          ? "לא הצלחנו להקליט את הקול."
          : "Could not record voice.",
      openMicFailed: lang === "ru"
        ? "Не удалось открыть микрофон."
        : lang === "he"
          ? "לא הצלחנו לפתוח את המיקרופון."
          : "Could not open the microphone.",
    },
    mix: {
      loopsVolume: lang === "ru" ? "Громкость лупов" : lang === "he" ? "עוצמת הלופים" : "Loops Volume",
      voiceVolume: lang === "ru" ? "Громкость голоса" : lang === "he" ? "עוצמת הקול" : "Voice Volume",
    },
    loopGrid: {
      typeLabels: {
        beat: lang === "ru" ? "Бит" : lang === "he" ? "ביט" : "Beat",
        melody: lang === "ru" ? "Мелодия" : lang === "he" ? "מלודיה" : "Melody",
        fx: "FX",
        vocal: lang === "ru" ? "Вокал" : lang === "he" ? "שירה" : "Vocal",
      } as Record<"beat" | "melody" | "fx" | "vocal", string>,
      disabled: lang === "ru" ? "Выключено" : lang === "he" ? "כבוי" : "Disabled",
      enable: lang === "ru" ? "Включить" : lang === "he" ? "הפעל" : "Enable",
      off: lang === "ru" ? "Выкл" : lang === "he" ? "כבוי" : "Off",
      changed: lang === "ru" ? "Луп изменён" : lang === "he" ? "הלופ הוחלף" : "Loop changed",
      current: lang === "ru" ? "Сейчас" : lang === "he" ? "עכשיו" : "Now",
      next: lang === "ru" ? "Дальше" : lang === "he" ? "הבא" : "Next",
    },
    effects: {
      voice: lang === "ru" ? "Голос" : lang === "he" ? "קול" : "Voice",
      loops: lang === "ru" ? "Лупы" : lang === "he" ? "לופים" : "Loops",
      recordVoiceFirst: lang === "ru"
        ? "Сначала запиши голос"
        : lang === "he"
          ? "קודם הקליטו קול"
          : "Record a voice first",
    },
    save: {
      title: lang === "ru" ? "Сохранение микса" : lang === "he" ? "שמירת המיקס" : "Save mix",
      subtitle: lang === "ru"
        ? "Соберём 30 секунд твоей музыки: активные лупы, эффекты, громкость и голос."
        : lang === "he"
          ? "נרכיב 30 שניות של המוזיקה שלך: לופים פעילים, אפקטים, עוצמה וקול."
          : "We will render 30 seconds of your music: active loops, effects, volume, and voice.",
      loading: lang === "ru" ? "Сохранение..." : lang === "he" ? "שומר..." : "Saving...",
      export: lang === "ru" ? "Сохранить 30 секунд" : lang === "he" ? "שמור 30 שניות" : "Save 30 seconds",
      saved: lang === "ru" ? "Сохранено" : lang === "he" ? "נשמר" : "Saved",
      listen: lang === "ru" ? "Прослушать" : lang === "he" ? "להאזין" : "Listen",
      clear: lang === "ru" ? "очистить все" : lang === "he" ? "לנקות הכול" : "clear all",
      danger: lang === "ru" ? "Опасная зона" : lang === "he" ? "אזור מסוכן" : "Dangerous zone",
      confirmTitle: lang === "ru" ? "Очистить всю студию?" : lang === "he" ? "לנקות את כל האולפן?" : "Clear the whole studio?",
      confirmBody: lang === "ru"
        ? "Будут удалены все лупы, голос, эффекты и сохранённый микс."
        : lang === "he"
          ? "כל הלופים, הקול, האפקטים והמיקס השמור יימחקו."
          : "This will remove all loops, voice, effects, and the saved mix.",
      confirm: lang === "ru" ? "Подтвердить" : lang === "he" ? "לאשר" : "Confirm",
      cancel: lang === "ru" ? "Отмена" : lang === "he" ? "ביטול" : "Cancel",
    },
  };
  const guideSlides = useMemo(
    () => (musicStyle?.slides?.length ? musicStyle.slides : storySlides ?? []),
    [musicStyle?.slides, storySlides],
  );
  const compositionSnapshot = useMemo(
    () =>
      JSON.stringify({
        styleSlug: selectedStyleSlug,
        activeLoops: composition.activeLoops,
        loopSelections: composition.loopSelections,
        effects: composition.effects,
        voice: composition.voice,
        mix: composition.mix,
      }),
    [composition, selectedStyleSlug],
  );
  const isSaved = Boolean(savedCompositionSnapshot && savedCompositionSnapshot === compositionSnapshot);
  const confirmExitMessage = lang === "ru"
    ? "Изменения не сохранятся. Выйти?"
    : lang === "he"
      ? "השינויים לא יישמרו. לצאת?"
      : "Changes will not be saved. Exit?";

  useEffect(() => {
    setSelectedStyleSlug(initialStyleSlug);
  }, [initialStyleSlug]);

  useEffect(() => {
    if (typeof window === "undefined" || hasRestoredSessionRef.current) return;

    hasRestoredSessionRef.current = true;

    try {
      const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        selectedStyleSlug?: string;
        composition?: CompositionState;
        savedCompositionSnapshot?: string | null;
      };

      if (!parsed?.composition) return;

      shouldSkipNextPresetInitRef.current = true;
      if (parsed.selectedStyleSlug) {
        setSelectedStyleSlug(parsed.selectedStyleSlug);
      }
      setComposition(parsed.composition);
      setSavedCompositionSnapshot(parsed.savedCompositionSnapshot ?? null);
      setIsCompositionPlaying(false);
    } catch (error) {
      console.error("Failed to restore parrot studio session", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        selectedStyleSlug,
        composition,
        savedCompositionSnapshot,
      }),
    );
  }, [composition, savedCompositionSnapshot, selectedStyleSlug]);

  useEffect(() => {
    const nextVoiceUrl = composition.voice.audioUrl;
    const previousVoiceUrl = ownedVoiceBlobUrlRef.current;

    if (
      previousVoiceUrl &&
      previousVoiceUrl.startsWith("blob:") &&
      nextVoiceUrl?.startsWith("blob:") &&
      previousVoiceUrl !== nextVoiceUrl
    ) {
      URL.revokeObjectURL(previousVoiceUrl);
    }

    ownedVoiceBlobUrlRef.current = nextVoiceUrl?.startsWith("blob:") ? nextVoiceUrl : null;
    if (!nextVoiceUrl?.startsWith("blob:")) {
      recordedVoiceBlobRef.current = null;
    }
  }, [composition.voice.audioUrl]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (isStyleMenuOpen && styleMenuRef.current && !styleMenuRef.current.contains(target)) {
        setIsStyleMenuOpen(false);
      }

      if (isLanguageMenuOpen && languageMenuRef.current && !languageMenuRef.current.contains(target)) {
        setIsLanguageMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isLanguageMenuOpen, isStyleMenuOpen]);

  useEffect(() => {
    if (shouldSkipNextPresetInitRef.current) {
      shouldSkipNextPresetInitRef.current = false;
      return;
    }

    const initialLoopEffects = createEmptyLoopEffects(preset.loops);

    const loopSelections = preset.loops.reduce<Record<string, number | null>>((acc, loop) => {
      acc[loop.id] = loop.defaultOn ? (loop.defaultIndex ?? 0) : null;
      return acc;
    }, {});
    const defaultLoops = Object.entries(loopSelections)
      .filter(([, value]) => value !== null)
      .map(([loopId]) => loopId);

    setComposition((current) => ({
      ...current,
      activeLoops: defaultLoops,
      loopSelections,
      effects: {
        ...current.effects,
        loops: {
          ...current.effects.loops,
          targetLoopId: defaultLoops[0] ?? preset.loops[0]?.id ?? null,
          byLoop: initialLoopEffects,
        },
      },
    }));
    setSavedCompositionSnapshot(null);
  }, [preset]);

  useEffect(() => {
    const nextAudioMap = new Map<string, HTMLAudioElement>();

    preset.loops.forEach((loop) => {
      const selectedIndex = composition.loopSelections[loop.id];
      const src = typeof selectedIndex === "number"
        ? (loop.variants[selectedIndex]?.src ?? loop.variants[0]?.src)
        : (loop.variants[loop.defaultIndex ?? 0]?.src ?? loop.variants[0]?.src);
      if (!src) return;

      const audio = new Audio(src);
      audio.loop = true;
      audio.preload = "auto";
      nextAudioMap.set(loop.id, audio);
    });

    const previousAudioMap = audioMapRef.current;
    previousAudioMap.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });

    audioMapRef.current = nextAudioMap;

    return () => {
      nextAudioMap.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    };
  }, [composition.loopSelections, preset]);

  useEffect(() => {
    audioMapRef.current.forEach((audio, loopId) => {
      if (isVoiceRecording || !isCompositionPlaying) {
        audio.pause();
        audio.currentTime = 0;
        return;
      }

      const isActive = composition.activeLoops.includes(loopId);
      const loopFx = composition.effects.loops.byLoop[loopId];
      const loopVolumeMultiplier = loopFx?.boost ? 1.2 : loopFx?.soft ? 0.72 : 1;
      audio.volume = Math.min(1, composition.mix.loopsVolume * loopVolumeMultiplier);
      audio.playbackRate = composition.effects.loops.speed ? 1.12 : 1;

      if (!isActive) {
        audio.pause();
        audio.currentTime = 0;
        return;
      }

      void audio.play().catch(() => {
        // The mobile browser may require a direct gesture before playback.
      });
    });
  }, [composition.activeLoops, composition.effects.loops, composition.mix.loopsVolume, isCompositionPlaying, isVoiceRecording]);

  useEffect(() => {
    return () => {
      audioMapRef.current.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
      if (previewTimerRef.current) {
        window.clearTimeout(previewTimerRef.current);
      }
      if (compositionVoiceTimerRef.current) {
        window.clearTimeout(compositionVoiceTimerRef.current);
      }
      compositionVoiceAudioRef.current?.pause();
      void previewContextRef.current?.close().catch(() => {});
      void compositionVoiceContextRef.current?.close().catch(() => {});
      if (ownedVoiceBlobUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(ownedVoiceBlobUrlRef.current);
        ownedVoiceBlobUrlRef.current = null;
      }
      recordedVoiceBlobRef.current = null;
      if (renderedMixUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(renderedMixUrl);
      }
    };
  }, [renderedMixUrl]);

  const loopPads = useMemo(
    () =>
      preset.loops.map((loop) => {
        const variantIndex = composition.loopSelections[loop.id] ?? null;
        const variant = typeof variantIndex === "number"
          ? loop.variants[variantIndex] ?? loop.variants[0]
          : null;
        const nextVariantIndex = typeof variantIndex === "number"
          ? (variantIndex + 1) % loop.variants.length
          : (loop.defaultIndex ?? 0);
        const nextVariant = loop.variants[nextVariantIndex] ?? loop.variants[0];

        return {
          id: loop.id,
          label: loop.label,
          iconSrc: iconForInstrument(`${loop.label} ${loop.id}`),
          type: resolveLoopType(loop),
          isActive: typeof variantIndex === "number",
          variantLabel: variant?.label ?? "Loop",
          nextVariantLabel: nextVariant?.label ?? "Loop",
          variantIndex,
          variantCount: loop.variants.length,
        };
      }),
    [composition.loopSelections, preset],
  );

  const syncActiveLoopsFromSelections = (loopSelections: Record<string, number | null>) =>
    Object.entries(loopSelections)
      .filter(([, value]) => value !== null)
      .map(([loopId]) => loopId);

  const handleCycleLoopVariant = (loopId: string) => {
    const loop = preset.loops.find((item) => item.id === loopId);
    if (!loop) return;

    setComposition((current) => ({
      ...current,
      loopSelections: (() => {
        const currentIndex = current.loopSelections[loopId];
        const nextIndex = typeof currentIndex === "number"
          ? (currentIndex + 1) % loop.variants.length
          : (loop.defaultIndex ?? 0);
        const nextSelections = {
          ...current.loopSelections,
          [loopId]: nextIndex,
        };
        return nextSelections;
      })(),
      activeLoops: (() => {
        const currentIndex = current.loopSelections[loopId];
        const nextIndex = typeof currentIndex === "number"
          ? (currentIndex + 1) % loop.variants.length
          : (loop.defaultIndex ?? 0);
        const nextSelections = {
          ...current.loopSelections,
          [loopId]: nextIndex,
        };
        return syncActiveLoopsFromSelections(nextSelections);
      })(),
    }));
  };

  const handleDisableLoop = (loopId: string) => {
    setComposition((current) => {
      const nextSelections = {
        ...current.loopSelections,
        [loopId]: null,
      };

      return {
        ...current,
        loopSelections: nextSelections,
        activeLoops: syncActiveLoopsFromSelections(nextSelections),
      };
    });
  };

  const handleSave = () => {
    const payload = {
      styleSlug: selectedStyleSlug,
      activeLoops: composition.activeLoops,
      effects: composition.effects,
      voice: composition.voice,
      mix: composition.mix,
      storySlidesCount: storySlides?.length ?? 0,
    };

    console.log("parrot-studio-save", payload);
  };

  const toggleVoiceEffect = (effect: keyof VoiceEffectsState) => {
    setComposition((current) => ({
      ...current,
      effects: {
        ...current.effects,
        activeCategory: "voice",
        voice: {
          ...current.effects.voice,
          [effect]: !current.effects.voice[effect],
        },
      },
    }));
  };

  const toggleLoopEffect = (effect: keyof LoopEffectState | "speed") => {
    setComposition((current) => {
      if (effect === "speed") {
        return {
          ...current,
          effects: {
            ...current.effects,
            activeCategory: "loops",
            loops: {
              ...current.effects.loops,
              speed: !current.effects.loops.speed,
            },
          },
        };
      }

      const targetLoopId = current.effects.loops.targetLoopId;
      if (!targetLoopId) return current;

      return {
        ...current,
        effects: {
          ...current.effects,
          activeCategory: "loops",
          loops: {
            ...current.effects.loops,
            byLoop: {
              ...current.effects.loops.byLoop,
              [targetLoopId]: {
                ...current.effects.loops.byLoop[targetLoopId],
                [effect]: !current.effects.loops.byLoop[targetLoopId]?.[effect],
              },
            },
          },
        },
      };
    });
  };

  const stopEffectPreview = () => {
    if (previewTimerRef.current) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current.onended = null;
    }
    previewAudioRef.current = null;

    const activeContext = previewContextRef.current;
    previewContextRef.current = null;
    setActivePreviewKey(null);

    if (activeContext) {
      void activeContext.close().catch(() => {});
    }
  };

  const stopCompositionVoice = () => {
    if (compositionVoiceTimerRef.current) {
      window.clearTimeout(compositionVoiceTimerRef.current);
      compositionVoiceTimerRef.current = null;
    }

    if (compositionVoiceAudioRef.current) {
      compositionVoiceAudioRef.current.pause();
      compositionVoiceAudioRef.current.currentTime = 0;
      compositionVoiceAudioRef.current.onended = null;
    }
    compositionVoiceAudioRef.current = null;
    compositionVoiceGainRef.current = null;
  };

  const bufferToWavBlob = (buffer: AudioBuffer) => {
    const channels = buffer.numberOfChannels;
    const length = buffer.length * channels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);

    let offset = 0;
    const writeString = (value: string) => {
      for (let index = 0; index < value.length; index += 1) {
        view.setUint8(offset, value.charCodeAt(index));
        offset += 1;
      }
    };

    writeString("RIFF");
    view.setUint32(offset, 36 + buffer.length * channels * 2, true);
    offset += 4;
    writeString("WAVE");
    writeString("fmt ");
    view.setUint32(offset, 16, true);
    offset += 4;
    view.setUint16(offset, 1, true);
    offset += 2;
    view.setUint16(offset, channels, true);
    offset += 2;
    view.setUint32(offset, buffer.sampleRate, true);
    offset += 4;
    view.setUint32(offset, buffer.sampleRate * channels * 2, true);
    offset += 4;
    view.setUint16(offset, channels * 2, true);
    offset += 2;
    view.setUint16(offset, 16, true);
    offset += 2;
    writeString("data");
    view.setUint32(offset, buffer.length * channels * 2, true);
    offset += 4;

    const channelData = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
    for (let sample = 0; sample < buffer.length; sample += 1) {
      for (let channel = 0; channel < channels; channel += 1) {
        const value = Math.max(-1, Math.min(1, channelData[channel][sample] ?? 0));
        view.setInt16(offset, value * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([view], { type: "audio/wav" });
  };

  const buildImpulseResponse = (context: BaseAudioContext) => {
    const duration = 1.8;
    const frameCount = Math.floor(context.sampleRate * duration);
    const impulse = context.createBuffer(2, frameCount, context.sampleRate);

    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const channelBuffer = impulse.getChannelData(channel);
      for (let i = 0; i < frameCount; i += 1) {
        channelBuffer[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frameCount, 2.4);
      }
    }

    return impulse;
  };

  const connectEffects = (
    context: BaseAudioContext,
    input: AudioNode,
    destination: AudioNode,
    effects: { echo: boolean; reverb: boolean },
  ) => {
    let tail: AudioNode = input;

    if (effects.echo) {
      const delay = context.createDelay(0.6);
      delay.delayTime.value = 0.28;
      const feedback = context.createGain();
      feedback.gain.value = 0.28;
      const wetGain = context.createGain();
      wetGain.gain.value = 0.32;
      tail.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wetGain);
      wetGain.connect(destination);
    }

    if (effects.reverb) {
      const convolver = context.createConvolver();
      convolver.buffer = buildImpulseResponse(context);
      const wetGain = context.createGain();
      wetGain.gain.value = 0.26;
      tail.connect(convolver);
      convolver.connect(wetGain);
      wetGain.connect(destination);
    }

    tail.connect(destination);
  };

  const connectVoiceEffects = (
    context: BaseAudioContext,
    input: AudioNode,
    destination: AudioNode,
    effects: VoiceEffectsState,
  ) => {
    let tail: AudioNode = input;

    if (effects.radio || effects.whisper) {
      const highpass = context.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = effects.radio ? 480 : 240;
      tail.connect(highpass);
      tail = highpass;
    }

    if (effects.radio) {
      const lowpass = context.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 2200;
      tail.connect(lowpass);
      tail = lowpass;
    }

    if (effects.robot) {
      const shaper = context.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < curve.length; i += 1) {
        const x = (i / (curve.length - 1)) * 2 - 1;
        curve[i] = Math.tanh(x * 4);
      }
      shaper.curve = curve;
      tail.connect(shaper);
      tail = shaper;
    }

    if (effects.echo || effects.reverb) {
      connectEffects(context, tail, destination, {
        echo: effects.echo,
        reverb: effects.reverb,
      });
      return;
    }

    tail.connect(destination);
  };

  const connectLoopEffects = (
    context: BaseAudioContext,
    input: AudioNode,
    destination: AudioNode,
    effects: LoopEffectState,
  ) => {
    let tail: AudioNode = input;

    if (effects.soft) {
      const lowpass = context.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 1800;
      tail.connect(lowpass);
      tail = lowpass;
    }

    if (effects.echo || effects.reverb) {
      connectEffects(context, tail, destination, {
        echo: effects.echo,
        reverb: effects.reverb,
      });
      return;
    }

    tail.connect(destination);
  };

  const playVoiceWithCurrentEffects = async () => {
    stopCompositionVoice();

    if (!composition.voice.audioUrl) {
      console.info("Parrot studio: no recorded voice for composition playback");
      return;
    }

    let context = compositionVoiceContextRef.current;
    if (!context || context.state === "closed") {
      context = new AudioContext();
      compositionVoiceContextRef.current = context;
    }
    const audio = new Audio(composition.voice.audioUrl);
    audio.preload = "auto";
    audio.currentTime = 0;
    audio.setAttribute("playsinline", "true");

    const source = context.createMediaElementSource(audio);
    const gain = context.createGain();
    gain.gain.value = Math.min(1.5, composition.mix.voiceVolume * getVoiceGainMultiplier(composition.effects.voice));

    let playbackRate = 1;
    if (composition.effects.voice.child) playbackRate *= 1.2;
    if (composition.effects.voice.robot) playbackRate *= 1.08;
    if (composition.effects.voice.mega) playbackRate *= 0.86;
    if (composition.effects.voice.whisper) playbackRate *= 1.03;
    audio.playbackRate = playbackRate;
    if ("preservesPitch" in audio) {
      try {
        (audio as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = false;
      } catch {}
    }

    source.connect(gain);
    connectVoiceEffects(context, gain, context.destination, composition.effects.voice);
    if (context.state !== "running") {
      await context.resume();
    }
    await audio.play();

    compositionVoiceAudioRef.current = audio;
    compositionVoiceGainRef.current = gain;
    compositionVoiceTimerRef.current = window.setTimeout(() => {
      stopCompositionVoice();
    }, 30000);
    audio.onended = () => {
      stopCompositionVoice();
    };
  };

  const handlePreviewVoiceEffect = async (effect: keyof VoiceEffectsState) => {
    if (!composition.voice.audioUrl) {
      console.info("Parrot studio: no recorded voice for voice preview");
      return;
    }

    stopCompositionVoice();
    stopEffectPreview();
    setIsCompositionPlaying(false);

    try {
      const context = new AudioContext();
      const audio = new Audio(composition.voice.audioUrl);
      audio.preload = "auto";
      audio.currentTime = 0;
      audio.setAttribute("playsinline", "true");

      const source = context.createMediaElementSource(audio);

      const previewEffects: VoiceEffectsState = {
        child: false,
        echo: false,
        reverb: false,
        robot: false,
        whisper: false,
        mega: false,
        radio: false,
      };
      previewEffects[effect] = true;

      let playbackRate = 1;
      if (previewEffects.child) playbackRate *= 1.2;
      if (previewEffects.robot) playbackRate *= 1.08;
      if (previewEffects.mega) playbackRate *= 0.86;
      if (previewEffects.whisper) playbackRate *= 1.03;
      audio.playbackRate = playbackRate;
      if ("preservesPitch" in audio) {
        try {
          (audio as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = false;
        } catch {}
      }

      const gain = context.createGain();
      const gainMultiplier = previewEffects.whisper ? 0.72 : previewEffects.mega ? 1.22 : 1;
      gain.gain.value = Math.min(1.5, composition.mix.voiceVolume * gainMultiplier);

      source.connect(gain);
      connectVoiceEffects(context, gain, context.destination, previewEffects);
      previewContextRef.current = context;
      previewAudioRef.current = audio;
      setActivePreviewKey(`voice:${effect}`);
      await context.resume();
      await audio.play();

      previewTimerRef.current = window.setTimeout(() => {
        stopEffectPreview();
      }, 2850);
      audio.onended = () => {
        stopEffectPreview();
      };
    } catch (error) {
      console.error("Failed to preview voice effect", error);
      stopEffectPreview();
    }
  };

  const handlePreviewLoopEffect = async (effect: PreviewKey) => {
    const targetLoopId = composition.effects.loops.targetLoopId;
    if (!targetLoopId) return;

    const loop = preset.loops.find((item) => item.id === targetLoopId);
    const selectedIndex = loop ? composition.loopSelections[targetLoopId] : null;
    if (!loop || typeof selectedIndex !== "number") return;

    const variant = loop.variants[selectedIndex] ?? loop.variants[0];
    if (!variant?.src) return;

    stopCompositionVoice();
    stopEffectPreview();
    setIsCompositionPlaying(false);

    try {
      const response = await fetch(variant.src);
      const arrayBuffer = await response.arrayBuffer();
      const context = new AudioContext();
      const buffer = await context.decodeAudioData(arrayBuffer.slice(0));
      const source = context.createBufferSource();
      source.buffer = buffer;

      const loopEffects: LoopEffectState = {
        echo: false,
        reverb: false,
        boost: false,
        soft: false,
      };
      if (effect !== "speed") {
        loopEffects[effect as keyof LoopEffectState] = true;
      }
      source.playbackRate.value = effect === "speed" ? 1.12 : 1;

      const gain = context.createGain();
      const gainMultiplier = loopEffects.boost ? 1.35 : loopEffects.soft ? 0.72 : 1;
      gain.gain.value = Math.min(1, composition.mix.loopsVolume * gainMultiplier);

      source.connect(gain);
      connectLoopEffects(context, gain, context.destination, loopEffects);
      previewContextRef.current = context;
      setActivePreviewKey(`loop:${effect}`);
      await context.resume();
      source.start(0, 0, 2.7);
      source.stop(2.7);

      previewTimerRef.current = window.setTimeout(() => {
        stopEffectPreview();
      }, 2850);
    } catch (error) {
      console.error("Failed to preview loop effect", error);
      stopEffectPreview();
    }
  };

  const handleToggleCompositionPlayback = async () => {
    stopEffectPreview();

    if (isCompositionPlaying) {
      setIsCompositionPlaying(false);
      stopCompositionVoice();
      return;
    }

    setIsCompositionPlaying(true);
    try {
      await playVoiceWithCurrentEffects();
    } catch (error) {
      console.error("Failed to play composition", error);
      stopCompositionVoice();
    }
  };

  useEffect(() => {
    const activeGain = compositionVoiceGainRef.current;
    if (!activeGain) return;

    activeGain.gain.value = Math.min(1.5, composition.mix.voiceVolume * getVoiceGainMultiplier(composition.effects.voice));
  }, [composition.mix.voiceVolume, composition.effects.voice]);

  useEffect(() => {
    if (!isCompositionPlaying || isVoiceRecording) {
      stopCompositionVoice();
      return;
    }

    void playVoiceWithCurrentEffects().catch((error) => {
      console.error("Failed to sync voice playback", error);
      stopCompositionVoice();
    });
  }, [
    composition.effects.voice,
    composition.voice.audioUrl,
    isCompositionPlaying,
    isVoiceRecording,
  ]);

  const requestClose = () => {
    if (!isSaved && typeof window !== "undefined") {
      const shouldLeave = window.confirm(confirmExitMessage);
      if (!shouldLeave) return;
    }
    onClose();
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!hasPushedHistoryRef.current) {
      window.history.pushState({ parrotStudio: true }, "", window.location.href);
      hasPushedHistoryRef.current = true;
    }

    const handlePopState = () => {
      if (!isSaved) {
        const shouldLeave = window.confirm(confirmExitMessage);
        if (!shouldLeave) {
          try {
            window.history.forward();
          } catch {}
          return;
        }
      }

      onClose();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [confirmExitMessage, isSaved, onClose]);

  const renderThirtySecondMix = async () => {
    setIsRenderingSave(true);

    try {
      const durationSec = 30;
      const sampleRate = 44100;
      const offlineContext = new OfflineAudioContext(2, sampleRate * durationSec, sampleRate);
      const outputGain = offlineContext.createGain();
      outputGain.gain.value = 0.92;
      outputGain.connect(offlineContext.destination);

      const activeLoopDefs = preset.loops.filter((loop) => {
        const selectedIndex = composition.loopSelections[loop.id];
        return typeof selectedIndex === "number";
      });

      await Promise.all(activeLoopDefs.map(async (loop) => {
        const selectedIndex = composition.loopSelections[loop.id];
        if (typeof selectedIndex !== "number") return;

        const variant = loop.variants[selectedIndex] ?? loop.variants[0];
        if (!variant?.src) return;

        const response = await fetch(variant.src);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await offlineContext.decodeAudioData(arrayBuffer.slice(0));
        const source = offlineContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const loopFx = composition.effects.loops.byLoop[loop.id] ?? {
          echo: false,
          reverb: false,
          boost: false,
          soft: false,
        };
        source.playbackRate.value = composition.effects.loops.speed ? 1.12 : 1;

        const gain = offlineContext.createGain();
        gain.gain.value =
          Math.min(
            1,
            (composition.mix.loopsVolume / Math.max(activeLoopDefs.length, 1)) *
              (loopFx.boost ? 1.35 : loopFx.soft ? 0.72 : 1),
          );

        source.connect(gain);
        connectLoopEffects(offlineContext, gain, outputGain, loopFx);
        source.start(0);
      }));

      const loadAudioArrayBuffer = async (src: string) => {
        if (src.startsWith("blob:")) {
          if (!recordedVoiceBlobRef.current) {
            throw new Error("Recorded voice blob is missing for offline render");
          }
          return recordedVoiceBlobRef.current.arrayBuffer();
        }

        const response = await fetch(src);
        return response.arrayBuffer();
      };

      if (composition.voice.audioUrl) {
        const voiceBufferSource = offlineContext.createBufferSource();
        const voiceArrayBuffer = await loadAudioArrayBuffer(composition.voice.audioUrl);
        const voiceBuffer = await offlineContext.decodeAudioData(voiceArrayBuffer.slice(0));
        voiceBufferSource.buffer = voiceBuffer;
        let voicePlaybackRate = 1;
        if (composition.effects.voice.child) voicePlaybackRate *= 1.2;
        if (composition.effects.voice.robot) voicePlaybackRate *= 1.08;
        if (composition.effects.voice.mega) voicePlaybackRate *= 0.86;
        if (composition.effects.voice.whisper) voicePlaybackRate *= 1.03;
        voiceBufferSource.playbackRate.value = voicePlaybackRate;

        const voiceGain = offlineContext.createGain();
        const voiceGainMultiplier = composition.effects.voice.whisper ? 0.72 : composition.effects.voice.mega ? 1.22 : 1;
        voiceGain.gain.value = Math.min(1.5, composition.mix.voiceVolume * voiceGainMultiplier);

        voiceBufferSource.connect(voiceGain);
        connectVoiceEffects(offlineContext, voiceGain, outputGain, composition.effects.voice);
        voiceBufferSource.start(0);
      }

      const renderedBuffer = await offlineContext.startRendering();
      const wavBlob = bufferToWavBlob(renderedBuffer);
      const nextUrl = URL.createObjectURL(wavBlob);

      if (renderedMixUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(renderedMixUrl);
      }

      setRenderedMixUrl(nextUrl);
      handleSave();
      const anchor = document.createElement("a");
      anchor.href = nextUrl;
      anchor.download = `parrot-mix-${selectedStyleSlug}-30s.wav`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setSavedCompositionSnapshot(compositionSnapshot);
    } catch (error) {
      console.error("Failed to render parrot studio mix", error);
    } finally {
      setIsRenderingSave(false);
    }
  };

  const handleListenRenderedMix = () => {
    if (!renderedMixUrl) return;

    if (!renderedMixAudioRef.current) {
      renderedMixAudioRef.current = new Audio(renderedMixUrl);
    } else {
      renderedMixAudioRef.current.src = renderedMixUrl;
    }

    void renderedMixAudioRef.current.play().catch((error) => {
      console.error("Failed to play rendered mix", error);
    });
  };

  const handleClearAll = () => {
    stopEffectPreview();
    stopCompositionVoice();
    setIsCompositionPlaying(false);

    audioMapRef.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });

    ownedVoiceBlobUrlRef.current = null;
    recordedVoiceBlobRef.current = null;

    if (renderedMixUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(renderedMixUrl);
    }

    const loopSelections = preset.loops.reduce<Record<string, number | null>>((acc, loop) => {
      acc[loop.id] = null;
      return acc;
    }, {});

    setRenderedMixUrl(null);
    setSavedCompositionSnapshot(null);
    setComposition({
      activeMode: "save",
      activeLoops: [],
      loopSelections,
      effects: {
        activeCategory: "voice",
        voice: {
          child: false,
          echo: false,
          reverb: false,
          robot: false,
          whisper: false,
          mega: false,
          radio: false,
        },
        loops: {
          speed: false,
          targetLoopId: preset.loops[0]?.id ?? null,
          byLoop: createEmptyLoopEffects(preset.loops),
        },
      },
      voice: {
        audioUrl: null,
      },
      mix: {
        loopsVolume: 0.8,
        voiceVolume: 1,
      },
    });
  };

  return (
    <section className="parrot-studio-root">
      <header className="parrot-studio-root__topbar">
        <button
          type="button"
          className="parrot-studio-root__topbar-button parrot-studio-root__topbar-close"
          onClick={requestClose}
            aria-label={uiCopy.close}
        >
          <span aria-hidden="true">×</span>
        </button>
        <div className="parrot-studio-root__topbar-menu parrot-studio-root__topbar-menu--style">
          <button
            type="button"
            className="parrot-studio-root__topbar-button parrot-studio-root__topbar-style"
            onClick={() => {
              setIsLanguageMenuOpen(false);
              setIsStyleMenuOpen((current) => !current);
            }}
            aria-label={uiCopy.style}
          >
            {uiCopy.style}
          </button>
          {isStyleMenuOpen ? (
            <div className="parrot-studio-root__style-menu" ref={styleMenuRef}>
              {PARROT_PRESETS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`parrot-studio-root__style-item ${item.id === selectedStyleSlug ? "is-active" : ""}`}
                  onClick={() => {
                    setSelectedStyleSlug(item.id);
                    setIsStyleMenuOpen(false);
                  }}
                >
                  <img src={iconForMusicStyle(item.id)} alt="" />
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className={`parrot-studio-root__topbar-button parrot-studio-root__topbar-play ${isCompositionPlaying ? "is-active" : ""}`}
          onClick={() => void handleToggleCompositionPlayback()}
          aria-label={isCompositionPlaying ? uiCopy.pause : uiCopy.play}
        >
          {isCompositionPlaying ? uiCopy.pause : uiCopy.play}
        </button>
        <div className="parrot-studio-root__topbar-menu">
          <button
            type="button"
            className="parrot-studio-root__topbar-button parrot-studio-root__topbar-settings"
            onClick={() => {
              setIsStyleMenuOpen(false);
              setIsLanguageMenuOpen((current) => !current);
            }}
            aria-label={uiCopy.languages}
          >
            <span aria-hidden="true">•••</span>
          </button>
          {isLanguageMenuOpen ? (
            <div className="parrot-studio-root__language-menu" ref={languageMenuRef}>
              <div className="parrot-studio-root__language-head">
                <strong>{languageCopy.title}</strong>
                <span>{languageCopy.preview}</span>
              </div>
              {(["ru", "en", "he"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`parrot-studio-root__language-item ${item === lang ? "is-active" : ""}`}
                  onClick={() => {
                    setIsLanguageMenuOpen(false);
                    onSwitchLanguage(item);
                  }}
                >
                  {item.toUpperCase()}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <div className="parrot-studio-root__top">
          <ParrotGuide
            title={musicStyle?.title ?? preset.title}
            text={musicStyle?.description ?? preset.description}
            youtubeLabel={uiCopy.youtube}
            googleLabel={uiCopy.google}
            storyLabel={uiCopy.story}
            onOpenYouTube={() => openGoogle(`${preset.searchArtist} site:youtube.com`)}
            onOpenGoogle={() => openGoogle(preset.searchGenre)}
            onOpenStory={() => setIsStoryOpen(true)}
        />
      </div>

      <div className="parrot-studio-root__panel">
        {composition.activeMode === "loops" ? (
          <LoopPadGrid
            loops={loopPads}
            onCycleVariant={handleCycleLoopVariant}
            onDisable={handleDisableLoop}
            typeLabels={uiCopy.loopGrid.typeLabels}
            disabledLabel={uiCopy.loopGrid.disabled}
            enableLabel={uiCopy.loopGrid.enable}
            offLabel={uiCopy.loopGrid.off}
            loopChangedLabel={uiCopy.loopGrid.changed}
            currentLoopLabel={uiCopy.loopGrid.current}
            nextLoopLabel={uiCopy.loopGrid.next}
          />
        ) : null}

        {composition.activeMode === "voice" ? (
          <VoiceRecorder
            voice={composition.voice}
            voiceVolume={composition.mix.voiceVolume}
            isChildVoice={composition.effects.voice.child}
            recordLabel={uiCopy.voiceRecorder.record}
            stopLabel={uiCopy.voiceRecorder.stop}
            childVoiceLabel={uiCopy.voiceRecorder.childVoice}
            hintLabel={uiCopy.voiceRecorder.hint}
            micUnavailableLabel={uiCopy.voiceRecorder.micUnavailable}
            recordingFailedLabel={uiCopy.voiceRecorder.recordingFailed}
            openMicFailedLabel={uiCopy.voiceRecorder.openMicFailed}
            onRecordingStateChange={setIsVoiceRecording}
            onRecordBlobReady={(blob) => {
              recordedVoiceBlobRef.current = blob;
            }}
            onChange={(voice) =>
              setComposition((current) => ({
                ...current,
                voice,
              }))
            }
            onToggleChildVoice={() => toggleVoiceEffect("child")}
          />
        ) : null}

        {composition.activeMode === "effects" ? (
          <EffectsPanel
            lang={lang}
            activeCategory={composition.effects.activeCategory}
            voiceLabel={uiCopy.effects.voice}
            loopsLabel={uiCopy.effects.loops}
            recordVoiceFirstLabel={uiCopy.effects.recordVoiceFirst}
            voiceEffects={composition.effects.voice}
            hasVoice={Boolean(composition.voice.audioUrl)}
            loopEffects={composition.effects.loops}
            loopOptions={loopPads.map((loop) => ({
              id: loop.id,
              label: loop.label,
              isActive: loop.isActive,
            }))}
            onCategoryChange={(category) =>
              setComposition((current) => ({
                ...current,
                effects: {
                  ...current.effects,
                  activeCategory: category,
                },
              }))
            }
            onToggleVoiceEffect={toggleVoiceEffect}
            onToggleLoopEffect={toggleLoopEffect}
            onPreviewVoiceEffect={handlePreviewVoiceEffect}
            onPreviewLoopEffect={handlePreviewLoopEffect}
            activePreviewKey={activePreviewKey}
            onSelectLoop={(loopId) =>
              setComposition((current) => ({
                ...current,
                effects: {
                  ...current.effects,
                  activeCategory: "loops",
                  loops: {
                    ...current.effects.loops,
                    targetLoopId: loopId,
                  },
                },
              }))
            }
          />
        ) : null}

        {composition.activeMode === "mix" ? (
          <MixPanel
            loopsVolume={composition.mix.loopsVolume}
            voiceVolume={composition.mix.voiceVolume}
            loopsVolumeLabel={uiCopy.mix.loopsVolume}
            voiceVolumeLabel={uiCopy.mix.voiceVolume}
            onLoopsVolumeChange={(value) =>
              setComposition((current) => ({
                ...current,
                mix: {
                  ...current.mix,
                  loopsVolume: value,
                },
              }))
            }
            onVoiceVolumeChange={(value) =>
              setComposition((current) => ({
                ...current,
                mix: {
                  ...current.mix,
                  voiceVolume: value,
                },
              }))
            }
          />
        ) : null}

        {composition.activeMode === "save" ? (
          <SavePanel
            title={uiCopy.save.title}
            subtitle={uiCopy.save.subtitle}
            isRendering={isRenderingSave}
            isSaved={isSaved}
            exportUrl={renderedMixUrl}
            loadingLabel={uiCopy.save.loading}
            exportLabel={uiCopy.save.export}
            savedLabel={uiCopy.save.saved}
            listenLabel={uiCopy.save.listen}
            clearLabel={uiCopy.save.clear}
            dangerousZoneLabel={uiCopy.save.danger}
            confirmClearTitle={uiCopy.save.confirmTitle}
            confirmClearBody={uiCopy.save.confirmBody}
            confirmClearConfirmLabel={uiCopy.save.confirm}
            confirmClearCancelLabel={uiCopy.save.cancel}
            onRender={() => void renderThirtySecondMix()}
            onListen={handleListenRenderedMix}
            onClearAll={handleClearAll}
          />
        ) : null}
      </div>

      <footer className="parrot-studio-root__footer">
        Loops provided by Looperman. Royalty-free. Thank you creators 💛
      </footer>

      <StudioBottomBar
        activeMode={composition.activeMode}
        labels={uiCopy.bottomBar}
        onModeChange={(mode) =>
          setComposition((current) => ({
            ...current,
            activeMode: mode,
          }))
        }
      />

      {isStoryOpen ? (
        <ParrotStoryOverlay
          key={`${lang}:${selectedStyleSlug}`}
          title={musicStyle?.title ?? preset.title}
          lang={lang}
          styleSlug={selectedStyleSlug}
          slides={guideSlides as ParrotStorySlide[]}
          onClose={() => setIsStoryOpen(false)}
        />
      ) : null}

      <style jsx>{`
        .parrot-studio-root {
          position: relative;
          height: 100dvh;
          display: grid;
          grid-template-rows: auto auto minmax(0, 1fr) auto auto;
          overflow: hidden;
          background:
            radial-gradient(circle at top left, rgba(255, 190, 154, 0.08), transparent 24%),
            linear-gradient(180deg, #23252b 0%, #1c1e24 100%);
        }

        .parrot-studio-root__topbar {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto auto;
          align-items: center;
          gap: 0.5rem;
          padding: 0.8rem 0.75rem 0.2rem;
        }

        .parrot-studio-root__topbar-button {
          width: 44px;
          height: 44px;
          border: none;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.08);
          color: #fff5ec;
          font-size: 1.4rem;
        }

        .parrot-studio-root__topbar-menu {
          position: relative;
        }

        .parrot-studio-root__topbar-style {
          width: auto;
          min-width: 68px;
          padding: 0 0.85rem;
          font-size: 0.95rem;
        }

        .parrot-studio-root__topbar-play {
          width: auto;
          min-width: 72px;
          padding: 0 0.9rem;
          font-size: 0.9rem;
        }

        .parrot-studio-root__topbar-play.is-active {
          background: linear-gradient(180deg, #fff0b4 0%, #ffcce8 58%, #ddd2ff 100%);
          color: #26180f;
          box-shadow: 0 0 0 2px rgba(255, 186, 110, 0.32);
        }

        .parrot-studio-root__language-menu {
          position: absolute;
          top: calc(100% + 0.4rem);
          right: 0;
          min-width: 72px;
          padding: 0.35rem;
          border-radius: 18px;
          background: rgba(27, 29, 35, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 18px 32px rgba(0, 0, 0, 0.28);
          z-index: 5;
        }

        .parrot-studio-root__language-head {
          padding: 0.8rem 0.9rem 0.55rem;
          display: grid;
          gap: 0.24rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .parrot-studio-root__language-head strong {
          color: #fff4e8;
          font-size: 0.94rem;
        }

        .parrot-studio-root__language-head span {
          color: rgba(255, 244, 232, 0.66);
          font-size: 0.74rem;
          line-height: 1.35;
        }

        .parrot-studio-root__style-menu {
          position: absolute;
          top: calc(100% + 0.4rem);
          left: 0;
          width: min(78vw, 260px);
          max-height: min(60dvh, 420px);
          padding: 0.35rem;
          border-radius: 20px;
          background: rgba(27, 29, 35, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 18px 32px rgba(0, 0, 0, 0.28);
          z-index: 5;
          display: grid;
          gap: 0.3rem;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .parrot-studio-root__style-item {
          width: 100%;
          min-height: 48px;
          border: none;
          border-radius: 14px;
          background: transparent;
          color: rgba(255, 245, 236, 0.84);
          display: grid;
          grid-template-columns: 28px minmax(0, 1fr);
          align-items: center;
          gap: 0.65rem;
          padding: 0.45rem 0.65rem;
          text-align: left;
        }

        .parrot-studio-root__style-item img {
          width: 28px;
          height: 28px;
          object-fit: contain;
        }

        .parrot-studio-root__style-item span {
          font-size: 0.86rem;
          line-height: 1.2;
        }

        .parrot-studio-root__style-item.is-active {
          background: rgba(255, 255, 255, 0.08);
          color: #fff9ef;
        }

        .parrot-studio-root__language-item {
          width: 100%;
          min-height: 38px;
          border: none;
          border-radius: 12px;
          background: transparent;
          color: rgba(255, 245, 236, 0.84);
        }

        .parrot-studio-root__language-item.is-active {
          background: rgba(255, 255, 255, 0.08);
          color: #fff9ef;
        }

        .parrot-studio-root__top {
          padding: 0.75rem 0.75rem 0.6rem;
        }

        .parrot-studio-root__panel {
          min-height: 0;
          padding: 0 0.75rem;
          overflow: hidden;
          display: flex;
          align-items: stretch;
        }

        .parrot-studio-root__panel :global(> *) {
          width: 100%;
          min-height: 0;
        }

        .parrot-studio-root__footer {
          padding: 0.65rem 1rem 0.75rem;
          text-align: center;
          font-size: 0.74rem;
          line-height: 1.4;
          color: rgba(255, 244, 232, 0.56);
        }
      `}</style>
    </section>
  );
}
