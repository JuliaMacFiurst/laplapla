import { useEffect, useMemo, useRef, useState } from "react";
import { getMusicStyle } from "@/content/parrots/musicStyles";
import { PARROT_PRESETS, iconForInstrument, type ParrotLoop } from "@/utils/parrot-presets";
import LoopPadGrid from "./LoopPadGrid";
import VoiceRecorder from "./VoiceRecorder";
import EffectsPanel from "./EffectsPanel";
import MixPanel from "./MixPanel";
import StudioBottomBar from "./StudioBottomBar";
import ParrotGuide from "./ParrotGuide";
import SavePanel from "./SavePanel";

type Mode = "loops" | "voice" | "effects" | "mix" | "save";

type VoiceState = {
  audioUrl: string | null;
  isChildVoice: boolean;
};

type EffectsState = {
  echo: boolean;
  reverb: boolean;
  speed: boolean;
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

export default function ParrotStudioRoot({
  lang,
  initialStyleSlug,
  storySlides,
  onClose,
  onSwitchLanguage,
  onOpenStory,
}: Props) {
  const [selectedStyleSlug, setSelectedStyleSlug] = useState(initialStyleSlug);
  const [composition, setComposition] = useState<CompositionState>({
    activeMode: "loops",
    activeLoops: [],
    loopSelections: {},
    effects: {
      echo: false,
      reverb: false,
      speed: false,
    },
    voice: {
      audioUrl: null,
      isChildVoice: false,
    },
    mix: {
      loopsVolume: 0.8,
      voiceVolume: 1,
    },
  });
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isRenderingSave, setIsRenderingSave] = useState(false);
  const [renderedMixUrl, setRenderedMixUrl] = useState<string | null>(null);
  const renderedMixAudioRef = useRef<HTMLAudioElement | null>(null);

  const audioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const preset = useMemo(
    () => PARROT_PRESETS.find((item) => item.id === selectedStyleSlug) ?? PARROT_PRESETS[0],
    [selectedStyleSlug],
  );
  const musicStyle = useMemo(
    () => getMusicStyle(lang, selectedStyleSlug),
    [lang, selectedStyleSlug],
  );

  useEffect(() => {
    setSelectedStyleSlug(initialStyleSlug);
  }, [initialStyleSlug]);

  useEffect(() => {
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
    }));
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
      const isActive = composition.activeLoops.includes(loopId);
      audio.volume = composition.mix.loopsVolume;
      audio.playbackRate = composition.effects.speed ? 1.12 : 1;

      if (!isActive) {
        audio.pause();
        audio.currentTime = 0;
        return;
      }

      void audio.play().catch(() => {
        // The mobile browser may require a direct gesture before playback.
      });
    });
  }, [composition.activeLoops, composition.effects.speed, composition.mix.loopsVolume]);

  useEffect(() => {
    return () => {
      audioMapRef.current.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
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

        return {
          id: loop.id,
          label: loop.label,
          iconSrc: iconForInstrument(`${loop.label} ${loop.id}`),
          type: resolveLoopType(loop),
          isActive: typeof variantIndex === "number",
          variantLabel: variant?.label ?? "Loop",
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
    effects: EffectsState,
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
        source.playbackRate.value = composition.effects.speed ? 1.12 : 1;

        const gain = offlineContext.createGain();
        gain.gain.value = composition.mix.loopsVolume / Math.max(activeLoopDefs.length, 1);

        source.connect(gain);
        connectEffects(offlineContext, gain, outputGain, composition.effects);
        source.start(0);
      }));

      if (composition.voice.audioUrl) {
        const voiceResponse = await fetch(composition.voice.audioUrl);
        const voiceBufferSource = offlineContext.createBufferSource();
        const voiceArrayBuffer = await voiceResponse.arrayBuffer();
        const voiceBuffer = await offlineContext.decodeAudioData(voiceArrayBuffer.slice(0));
        voiceBufferSource.buffer = voiceBuffer;
        voiceBufferSource.playbackRate.value = composition.voice.isChildVoice ? 1.2 : 1;

        const voiceGain = offlineContext.createGain();
        voiceGain.gain.value = composition.mix.voiceVolume;

        voiceBufferSource.connect(voiceGain);
        connectEffects(offlineContext, voiceGain, outputGain, composition.effects);
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

  const handleSaveRenderedMix = () => {
    if (!renderedMixUrl) return;

    const anchor = document.createElement("a");
    anchor.href = renderedMixUrl;
    anchor.download = `parrot-mix-${selectedStyleSlug}-30s.wav`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handleClearAll = () => {
    audioMapRef.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });

    if (composition.voice.audioUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(composition.voice.audioUrl);
    }

    if (renderedMixUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(renderedMixUrl);
    }

    const loopSelections = preset.loops.reduce<Record<string, number | null>>((acc, loop) => {
      acc[loop.id] = null;
      return acc;
    }, {});

    setRenderedMixUrl(null);
    setComposition({
      activeMode: "save",
      activeLoops: [],
      loopSelections,
      effects: {
        echo: false,
        reverb: false,
        speed: false,
      },
      voice: {
        audioUrl: null,
        isChildVoice: false,
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
          onClick={onClose}
          aria-label="Close"
        >
          <span aria-hidden="true">×</span>
        </button>
        <div className="parrot-studio-root__topbar-spacer" />
        <div className="parrot-studio-root__topbar-menu">
          <button
            type="button"
            className="parrot-studio-root__topbar-button parrot-studio-root__topbar-settings"
            onClick={() => setIsLanguageMenuOpen((current) => !current)}
            aria-label="Languages"
          >
            <span aria-hidden="true">•••</span>
          </button>
          {isLanguageMenuOpen ? (
            <div className="parrot-studio-root__language-menu">
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
          onOpenYouTube={() => openGoogle(`${preset.searchArtist} site:youtube.com`)}
          onOpenGoogle={() => openGoogle(preset.searchGenre)}
          onOpenStory={() =>
            onOpenStory({
              activeLoops: composition.activeLoops,
              voice: composition.voice,
              effects: composition.effects,
              loopsVolume: composition.mix.loopsVolume,
              voiceVolume: composition.mix.voiceVolume,
            })
          }
        />
      </div>

      <div className="parrot-studio-root__panel">
        {composition.activeMode === "loops" ? (
          <LoopPadGrid
            loops={loopPads}
            onCycleVariant={handleCycleLoopVariant}
            onDisable={handleDisableLoop}
          />
        ) : null}

        {composition.activeMode === "voice" ? (
          <VoiceRecorder
            voice={composition.voice}
            voiceVolume={composition.mix.voiceVolume}
            onChange={(voice) =>
              setComposition((current) => ({
                ...current,
                voice,
              }))
            }
          />
        ) : null}

        {composition.activeMode === "effects" ? (
          <EffectsPanel
            effects={composition.effects}
            onToggle={(effect) =>
              setComposition((current) => ({
                ...current,
                effects: {
                  ...current.effects,
                  [effect]: !current.effects[effect],
                },
              }))
            }
          />
        ) : null}

        {composition.activeMode === "mix" ? (
          <MixPanel
            loopsVolume={composition.mix.loopsVolume}
            voiceVolume={composition.mix.voiceVolume}
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
            title="Сохранение микса"
            subtitle="Соберём 30 секунд твоей музыки: активные лупы, эффекты, громкость и голос."
            isRendering={isRenderingSave}
            exportUrl={renderedMixUrl}
            exportLabel="Сохранить 30 секунд"
            listenLabel="Прослушать"
            saveLabel="Сохранить на телефон"
            clearLabel="очистить все"
            onRender={() => void renderThirtySecondMix()}
            onListen={handleListenRenderedMix}
            onSaveToDevice={handleSaveRenderedMix}
            onClearAll={handleClearAll}
          />
        ) : null}
      </div>

      <footer className="parrot-studio-root__footer">
        Loops provided by Looperman. Royalty-free. Thank you creators 💛
      </footer>

      <StudioBottomBar
        activeMode={composition.activeMode}
        onModeChange={(mode) =>
          setComposition((current) => ({
            ...current,
            activeMode: mode,
          }))
        }
      />

      <style jsx>{`
        .parrot-studio-root {
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
          grid-template-columns: auto 1fr auto;
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

        .parrot-studio-root__topbar-spacer {
          min-width: 0;
        }

        .parrot-studio-root__topbar-menu {
          position: relative;
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
