import {useEffect, useMemo, useRef, useState } from "react";
import { iconForInstrument } from "../utils/parrot-presets";
import { buildSupabasePublicUrl } from "@/lib/publicAssetUrls";

/** --- Types --- */
export type LoopVariant = { id: string; src: string; label?: string };
export type LoopMulti = {
  id: string;
  label: string;
  variants: LoopVariant[];
  defaultIndex?: number; // индекс варианта, который включается при старте, если слой включён
};
// Back-compat (если прилетит старый формат с одним src)
export type LegacyLoop = {
  id: string;
  label: string;
  src: string;
  defaultOn?: boolean;
};

export type MusicConfig = {
  styleSlug: string;
  layers: Record<
    string,
    {
      loopId: string;
      variantId: number;
      variantKey: string;
    }
  >;
  volumes: Record<string, number>;
  masterVolume: number;
};

type Props = {
  styleSlug?: string;
  loops: (LoopMulti | LegacyLoop)[];
  loopLength?: number; // seconds, for rough start/stop sync
  lang?: "ru" | "en" | "he";
  onConfigChange?: (config: MusicConfig) => void;
  ui: {
    titlePlay: string;
    titleStop: string;
    loading: string;
    volume: string;
    recordVoice: string;
    stopRecording: string;
    micVolume: string;
    voiceVolume: string;
    micLabel: string;
    voiceLabel: string;
    monitorLabel: string;
    monitorTitle: string;
    myRecording: string;
    recordingReady: string;
    listenRecording: string;
    deleteRecording: string;
    deleteConfirm: string;
    saveMix: string;
    previousVariant: string;
    nextVariant: string;
    randomVariant: string;
    startOfList: string;
    endOfList: string;
    layerLabel: string;
    layerOn: string;
    layerOff: string;
    variantCounter: string;
    variantListLabel: string;
    chooseVariant: string;
    defaultHint: string;
    imageAlt: string;
    layerNames: Partial<Record<string, string>>;
    reactions: {
      on: string[];
      off: string[];
      next: string[];
      random: string[];
      tryVariant: string;
      readySing: string;
      micFailed: string;
      countdown3: string;
      countdown2: string;
      countdown1: string;
      recordingStopped: string;
      flightMix: string;
      selectLayerFirst: string;
      stopRest: string;
      enableLayerFirst: string;
      savingMix: string;
      savedTrack: string;
      saveError: string;
      recordingDeleted: string;
    };
  };
};

const pickRandom = (items: string[]) => items[Math.floor(Math.random() * items.length)] ?? "";

export default function ParrotMixer({
  styleSlug = "",
  loops,
  loopLength = 4,
  lang = "ru",
  onConfigChange,
  ui,
}: Props) {
  /** Нормализация входных данных (поддержка старого формата) */
  const normLoops: LoopMulti[] = useMemo(() => {
    return (loops as any[]).map((l: any) => {
      if (l.variants) return l as LoopMulti;
      // legacy -> wrap to variants
      const v: LoopVariant = {
        id: `${l.id}-v1`,
        src: l.src,
        label: `${l.label} 1`,
      };
      const lm: LoopMulti = {
        id: l.id,
        label: l.label,
        variants: [v],
        defaultIndex: l.defaultOn ? 0 : undefined,
      };
      return lm;
    });
  }, [loops]);

  const [isPlaying, setIsPlaying] = useState(false);

  // === Microphone recording state/refs ===
  const [micEnabled, setMicEnabled] = useState(false);
  const [isRec, setIsRec] = useState(false);
  const [micVolume, setMicVolume] = useState(0.9);

  // Recording countdown & preview/playback
  const [isCounting, setIsCounting] = useState(false);
  const [countLeft, setCountLeft] = useState(3);
  const [recUrl, setRecUrl] = useState<string | null>(null);
  const recPlayElRef = useRef<HTMLAudioElement | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const vocalBufferRef = useRef<AudioBuffer | null>(null); // decoded voice for saveMix
  const micOutGainRef = useRef<GainNode | null>(null); // monitor volume
  const micStreamRef = useRef<MediaStream | null>(null); // live getUserMedia stream
  const micSrcRef = useRef<MediaStreamAudioSourceNode | null>(null); // source node
  // Microphone monitoring toggle
  const [micMonitorOn, setMicMonitorOn] = useState(false);

  const iconForLayer = (label: string, id: string) =>
    iconForInstrument(`${label} ${id}`);
  const [volume, setVolume] = useState(0.9);
  // голос чуть громче музыки (регулируется из UI)
  const [vocalVolume, setVocalVolume] = useState(1.2); // 1.0 = на уровне музыки
  // current variant per loop (null = слой выключен)
  const [current, setCurrent] = useState<Record<string, number | null>>(() => {
    const init: Record<string, number | null> = {};
    normLoops.forEach((l) => {
      init[l.id] = typeof l.defaultIndex === "number" ? l.defaultIndex : null;
    });
    return init;
  });
  const [parrotLine, setParrotLine] = useState<string>("");
  const [wiggle, setWiggle] = useState(false);
  // single preview state (only one audition at a time)
  const [preview, setPreview] = useState<{
    loopId: string;
    idx: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // audio elements per loopId per variantIndex
  const audioEls = useRef<Record<string, Record<number, HTMLAudioElement>>>({});
  const clearLineTimer = useRef<number | null>(null);
  // rolodex container refs per loop
  const rolodexRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // touch state for swipe

  const refreshRolodexActive = (loopId: string) => {
    const wrap = rolodexRefs.current[loopId];
    if (!wrap) return;
    const rectWrap = wrap.getBoundingClientRect();
    const midX = rectWrap.left + rectWrap.width / 2;

    let bestEl: Element | null = null;
    let bestDist = Number.POSITIVE_INFINITY;

    wrap.querySelectorAll<HTMLElement>(".mixer-loop-item").forEach((el) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const dist = Math.abs(cx - midX);
      if (dist < bestDist) {
        bestDist = dist;
        bestEl = el;
      }
      el.classList.remove("is-center");
    });

    const el = bestEl as Element | null;
    if (el && "classList" in el) {
      (el as Element).classList.add("is-center");
    }
  };
  // center the selected variant, accounting for left spacer
  const scrollToVariant = (loopId: string, idx: number) => {
    const wrap = rolodexRefs.current[loopId];
    if (!wrap) return;
    const childIndex = 1 + idx; // account for left spacer
    const el = wrap.children[childIndex] as HTMLElement | undefined;
    if (!el) return;
    el.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
    window.setTimeout(() => refreshRolodexActive(loopId), 360);
  };

  // >>> замени целиком текущий setRolodexRef <<<
  const setRolodexRef = (loopId: string) => (el: HTMLDivElement | null) => {
    rolodexRefs.current[loopId] = el;
    if (!el) return;
    if (!(el as any)._mxHasHandler) {
      const handler = () => refreshRolodexActive(loopId);
      el.addEventListener("scroll", handler, { passive: true });
      window.addEventListener("resize", handler);
      (el as any)._mxHasHandler = true;
      queueMicrotask(handler);
    }
  };
  const handleKey = (
    loopId: string,
    e: React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setVariant(loopId, (current[loopId] ?? -1) + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setVariant(loopId, (current[loopId] ?? 0) - 1);
    }
  };

  const stopPreview = () => {
    if (!preview) return;
    const { loopId, idx } = preview;
    const a = audioEls.current[loopId]?.[idx];
    if (a) a.pause();
    setPreview(null);
  };

  const stopAllPreviews = () => {
    // Pause every audio element (safe when transport is stopped)
    Object.values(audioEls.current).forEach((map) =>
      Object.values(map).forEach((a) => {
        a.pause();
        a.currentTime = 0;
      })
    );
    setPreview(null);
  };

  // === Microphone chain: init, start, stop ===
  async function initMicChain() {
    if (!audioCtxRef.current)
      audioCtxRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    const audioCtx = audioCtxRef.current!;

    // safety: if previous stream/nodes exist, stop & drop before creating new
    try {
      const old = micStreamRef.current;
      if (old)
        old.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
    } catch {}
    try {
      micSrcRef.current?.disconnect();
    } catch {}
    try {
      micOutGainRef.current?.disconnect();
    } catch {}
    micSrcRef.current = null;
    micOutGainRef.current = null;
    micStreamRef.current = null;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // DRY monitoring chain (no filters): Mic -> Gain -> (optionally destination)
    const src = audioCtx.createMediaStreamSource(stream);
    const outGain = audioCtx.createGain();
    outGain.gain.value = micVolume;
    // do NOT connect to destination by default to avoid echo
    // we'll only connect if micMonitorOn becomes true
    // src -> outGain (dangling)
    src.connect(outGain);

    micOutGainRef.current = outGain;
    micSrcRef.current = src;
    micStreamRef.current = stream;

    // if UI flag requests monitoring, connect now
    if (micMonitorOn) {
      try {
        outGain.connect(audioCtx.destination);
      } catch {}
    }

    // Recorder writes raw stream (without effects)
    const rec = new MediaRecorder(stream, {
      mimeType:
        MediaRecorder.isTypeSupported &&
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : undefined,
    } as MediaRecorderOptions);
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size) chunksRef.current.push(e.data);
    };
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, {
        type: rec.mimeType || "audio/webm",
      });
      chunksRef.current = [];
      // create/replace preview URL for recorded take
      try {
        if (recUrl) URL.revokeObjectURL(recUrl);
      } catch {}
      const tmpUrl = URL.createObjectURL(blob);
      setRecUrl(tmpUrl);
      try {
        const ab = await blob.arrayBuffer();
        const buf = await audioCtx.decodeAudioData(ab);
        vocalBufferRef.current = buf;
      } catch (err) {
        console.error("decodeAudioData failed", err);
        vocalBufferRef.current = null;
      }
      // safety: if the stream stops by itself, drop refs
      try {
        const s = stream;
        if (s && s.active === false) {
          micSrcRef.current = null;
          micOutGainRef.current = null;
          micStreamRef.current = null;
          setMicEnabled(false);
        }
      } catch {}
      // FULLY CLOSE context and drop refs after stop to avoid background capture
      try {
        await audioCtx.close();
      } catch {}
      audioCtxRef.current = null;
      mediaRecRef.current = null;
    };
    mediaRecRef.current = rec;

    setMicEnabled(true);
  }

  async function actuallyStartRecording() {
    try {
      if (!micEnabled) await initMicChain();
      vocalBufferRef.current = null;
      mediaRecRef.current?.start();
      setIsRec(true);
      say(ui.reactions.readySing);
    } catch (e) {
      console.error(e);
      say(ui.reactions.micFailed);
    }
  }

  async function startRecording() {
    try {
      if (!micEnabled) await initMicChain();
    } catch (e) {
      console.error(e);
      say(ui.reactions.micFailed);
      return;
    }
    setIsCounting(true);
    setCountLeft(3);
    say(ui.reactions.countdown3);
    let step = 3;
    const id = window.setInterval(() => {
      step -= 1;
      if (step > 0) {
        setCountLeft(step);
        say(step === 2 ? ui.reactions.countdown2 : ui.reactions.countdown1);
      } else {
        window.clearInterval(id);
        setIsCounting(false);
        actuallyStartRecording();
      }
    }, 1000);
  }

  async function stopRecording() {
    try {
      mediaRecRef.current?.stop();
      try {
        recPlayElRef.current?.pause();
      } catch {}
      recPlayElRef.current = null;
      // Fully stop mic and disconnect nodes so nothing keeps capturing/monitoring
      try {
        const s = micStreamRef.current;
        if (s) {
          s.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch {}
          });
        }
      } catch {}
      try {
        micSrcRef.current?.disconnect();
      } catch {}
      try {
        micOutGainRef.current?.disconnect();
      } catch {}
      micSrcRef.current = null;
      micOutGainRef.current = null;
      micStreamRef.current = null;
      setMicEnabled(false);
      try {
        await audioCtxRef.current?.suspend();
      } catch {}
    } finally {
      setIsRec(false);
      say(ui.reactions.recordingStopped);
    }
  }

  // react to micVolume UI
  useEffect(() => {
    if (micOutGainRef.current) micOutGainRef.current.gain.value = micVolume;
  }, [micVolume]);

  // react to micMonitorOn: connect or disconnect monitoring to destination
  useEffect(() => {
    const ctx = audioCtxRef.current;
    const g = micOutGainRef.current;
    if (!ctx || !g) return;
    try {
      // disconnect first to be safe
      try {
        g.disconnect();
      } catch {}
      // always keep src -> g connection intact
      if (micSrcRef.current) {
        try {
          micSrcRef.current.connect(g);
        } catch {}
      }
      if (micMonitorOn) {
        try {
          g.connect(ctx.destination);
        } catch {}
      }
    } catch {}
  }, [micMonitorOn]);

  const startPreview = (loopId: string, idx: number) => {
    // If this exact preview is active — toggle it off
    if (preview && preview.loopId === loopId && preview.idx === idx) {
      stopAllPreviews();
      return;
    }
    // Stop any currently previewing audio across all layers
    stopAllPreviews();
    const a = audioEls.current[loopId]?.[idx];
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {
      /* ignore autoplay block */
    });
    setPreview({ loopId, idx });
    const human = idx + 1;
    say(
      ui.reactions.tryVariant
        .replace("{layer}", ui.layerNames[loopId] ?? loopId)
        .replace("{variant}", String(human))
    );
  };

  // Prepare audio elements for each loop/variant
  useEffect(() => {
    const store: Record<string, Record<number, HTMLAudioElement>> = {};
    normLoops.forEach((l) => {
      store[l.id] = {};
      l.variants.forEach((v, idx) => {
        const a = new Audio(v.src);
        (a as any).crossOrigin = "anonymous";
        a.loop = true;
        a.volume = volume;
        store[l.id][idx] = a;
      });
    });
    audioEls.current = store;
    return () => {
      Object.values(audioEls.current).forEach((map) =>
        Object.values(map).forEach((a) => {
          a.pause();
          a.src = "";
        })
      );
      audioEls.current = {};
      setPreview(null);
    };
  }, [normLoops]);

  // Propagate volume
  useEffect(() => {
    Object.values(audioEls.current).forEach((map) =>
      Object.values(map).forEach((a) => (a.volume = volume))
    );
  }, [volume]);

  const activeCount = useMemo(
    () => Object.values(current).filter((v) => v !== null).length,
    [current]
  );

  useEffect(() => {
    const layers: MusicConfig["layers"] = {};
    const volumes: MusicConfig["volumes"] = {};

    normLoops.forEach((loop) => {
      const selectedVariantIndex = current[loop.id];
      if (selectedVariantIndex === null || selectedVariantIndex === undefined) return;

      const selectedVariant = loop.variants[selectedVariantIndex];
      if (!selectedVariant) return;

      layers[loop.id] = {
        loopId: loop.id,
        variantId: selectedVariantIndex,
        variantKey: selectedVariant.id,
      };
      volumes[loop.id] = volume;
    });

    onConfigChange?.({
      styleSlug,
      layers,
      volumes,
      masterVolume: volume,
    });
  }, [current, normLoops, onConfigChange, styleSlug, volume]);

  // Parrot reaction helper
  const say = (text: string) => {
    if (clearLineTimer.current) window.clearTimeout(clearLineTimer.current);
    setParrotLine(text);
    setWiggle(true);
    clearLineTimer.current = window.setTimeout(() => {
      setParrotLine("");
      setWiggle(false);
    }, 2200);
  };

  const startAll = () => {
    setLoading(true);
    // Rough sync to loop boundary
    const now = performance.now() / 1000;
    const nextBoundary = Math.ceil(now / loopLength) * loopLength;
    const delay = Math.max(0, (nextBoundary - now) * 1000);

    window.setTimeout(() => {
      // stop any preview when we start the transport
      stopAllPreviews();
      normLoops.forEach((l) => {
        const idx = current[l.id];
        if (idx === null || idx === undefined) return;
        const a = audioEls.current[l.id]?.[idx];
        if (!a) return;
        a.currentTime = 0;
        a.play().catch(() => {
          /* ignore autoplay block */
        });
      });
      setIsPlaying(true);
      // playback of the recorded take if it exists
      if (recUrl) {
        try {
          const el = new Audio(recUrl);
          el.currentTime = 0;
          // голос чуть громче музыки по слайдеру «Голос»
          const target = Math.max(0, Math.min(1, volume * vocalVolume));
          try {
            el.volume = target;
          } catch {}
          el.play().catch(() => {});
          recPlayElRef.current = el;
        } catch {}
      }
      setLoading(false);
      say(
        activeCount > 0
          ? ui.reactions.flightMix
          : ui.reactions.selectLayerFirst
      );
    }, delay);
  };

  const stopAll = () => {
    setLoading(false);
    stopAllPreviews();
    try {
      recPlayElRef.current?.pause();
    } catch {}
    recPlayElRef.current = null;
    Object.values(audioEls.current).forEach((map) =>
      Object.values(map).forEach((a) => a.pause())
    );
    setIsPlaying(false);
    say(ui.reactions.stopRest);
  };

  // Включить/выключить слой
  const toggleLayer = (loopId: string) => {
    setCurrent((prev) => {
      // stop preview if it relates to this layer
      if (preview && preview.loopId === loopId) {
        stopPreview();
      }
      const cur = prev[loopId];
      const nextIdx = cur === null || cur === undefined ? 0 : null; // если выключен — включить 1-й
      // аудио
      if (isPlaying) {
        const map = audioEls.current[loopId] || {};
        if (cur !== null && cur !== undefined) {
          map[cur]?.pause();
          map[cur] && (map[cur].currentTime = 0);
        }
        if (nextIdx !== null) {
          map[nextIdx]?.play().catch(() => {});
          try {
            scrollToVariant(loopId, nextIdx);
          } catch {}
        }
      }
      say(
        nextIdx === null
          ? pickRandom(ui.reactions.off)
          : pickRandom(ui.reactions.on)
      );
      return { ...prev, [loopId]: nextIdx };
    });
  };

  // Move selection by ±1 without wrapping (for arrow buttons)
  const nudgeVariant = (loopId: string, dir: -1 | 1) => {
    const l = normLoops.find((x) => x.id === loopId)!;
    const total = l.variants.length;
    if (!total) return;
    const cur = current[loopId] ?? 0;
    const next = Math.max(0, Math.min(total - 1, cur + dir));
    if (next === cur) return; // nothing to do at edges
    setVariant(loopId, next);
    // ensure view centers this item
    try {
      scrollToVariant(loopId, next);
    } catch {}
  };

  // Сменить вариант (prev/next/на конкретный)
  const setVariant = (loopId: string, idx: number) => {
    // Pre-compute bounded index so we can use it after state update
    const l = normLoops.find((x) => x.id === loopId)!;
    const total = l.variants.length;
    const bounded = ((idx % total) + total) % total; // wrap

    setCurrent((prev) => {
      // stop preview for this layer to avoid overlap
      if (preview && preview.loopId === loopId) {
        stopPreview();
      }
      const cur = prev[loopId];
      if (cur === bounded) return prev;
      if (isPlaying) {
        const map = audioEls.current[loopId] || {};
        if (cur !== null && cur !== undefined) {
          map[cur]?.pause();
          map[cur] && (map[cur].currentTime = 0);
        }
        if (map[bounded]) {
          map[bounded]!.currentTime = 0;
        }
        map[bounded]?.play().catch(() => {});
      }
      const human = bounded + 1;
      say(pickRandom(ui.reactions.next).replace("{variant}", String(human)));
      try {
        scrollToVariant(loopId, bounded);
      } catch {}
      return { ...prev, [loopId]: bounded };
    });

    // If transport is NOT playing, auto-preview the newly selected variant
    if (!isPlaying) {
      startPreview(loopId, bounded);
    }
  };

  const randomizeVariant = (loopId: string) => {
    const l = normLoops.find((x) => x.id === loopId)!;
    const total = l.variants.length;
    const rnd = Math.floor(Math.random() * total);
    setCurrent((prev) => {
      if (preview && preview.loopId === loopId) {
        stopPreview();
      }
      const cur = prev[loopId];
      if (isPlaying) {
        const map = audioEls.current[loopId] || {};
        if (cur !== null && cur !== undefined) {
          map[cur]?.pause();
          map[cur] && (map[cur].currentTime = 0);
        }
        if (map[rnd]) {
          map[rnd]!.currentTime = 0;
        }
        map[rnd]?.play().catch(() => {});
      }
      say(pickRandom(ui.reactions.random).replace("{variant}", String(rnd + 1)));
      return { ...prev, [loopId]: rnd };
    });
    try {
      scrollToVariant(loopId, rnd);
    } catch {}
  };

  // Render 30s mix via OfflineAudioContext and download WAV
  const saveMix30s = async () => {
    try {
      const active = normLoops
        .map((l) => ({ loopId: l.id, idx: current[l.id] }))
        .filter((x) => x.idx !== null && x.idx !== undefined) as {
        loopId: string;
        idx: number;
      }[];

      if (active.length === 0) {
        say(ui.reactions.enableLayerFirst);
        return;
      }

      say(ui.reactions.savingMix);

      const durationSec = 30;
      const sampleRate = 44100;
      const offline = new (window as any).OfflineAudioContext(
        2,
        durationSec * sampleRate,
        sampleRate
      );
      const master = offline.createGain();
      master.gain.value = volume; // master volume
      master.connect(offline.destination);

      // fetch & decode buffers for each selected variant
      const buffers = await Promise.all(
        active.map(async ({ loopId, idx }) => {
          const l = normLoops.find((x) => x.id === loopId)!;
          const url = l.variants[idx].src;
          const res = await fetch(url);
          const ab = await res.arrayBuffer();
          const buf = await offline.decodeAudioData(ab);
          return { loopId, idx, buf };
        })
      );

      buffers.forEach(({ buf }) => {
        const src = offline.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const g = offline.createGain();
        g.gain.value = 1;
        src.connect(g).connect(master);
        src.start(0);
        src.stop(durationSec);
      });

      // Add recorded vocal (once, no loop) if available
      const vocal = vocalBufferRef.current;
      if (vocal) {
        const vSrc = offline.createBufferSource();
        vSrc.buffer = vocal;
        vSrc.loop = false;
        const vGain = offline.createGain();
        // делаем голос громче/тише согласно UI (1.2 ≈ чуть громче музыки)
        vGain.gain.value = Math.max(0, vocalVolume);
        vSrc.connect(vGain).connect(master);
        vSrc.start(0);
      }

      const rendered = await offline.startRendering();

      // Encode WAV (16-bit PCM)
      const wavBlob = audioBufferToWav(rendered);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "parrots_mix_30s.wav";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      say(ui.reactions.savedTrack);
    } catch (e) {
      console.error(e);
      say(ui.reactions.saveError);
    }
  };

  // helper: convert AudioBuffer to WAV Blob
  function audioBufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);

    // RIFF chunk descriptor
    writeString(view, 0, "RIFF");
    view.setUint32(4, length - 8, true);
    writeString(view, 8, "WAVE");
    // FMT sub-chunk
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numOfChan, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * numOfChan * 2, true);
    view.setUint16(32, numOfChan * 2, true);
    view.setUint16(34, 16, true);
    // data sub-chunk
    writeString(view, 36, "data");
    view.setUint32(40, length - 44, true);

    // write interleaved data
    let offset = 44;
    const channels = [] as Float32Array[];
    for (let i = 0; i < numOfChan; i++) channels.push(buffer.getChannelData(i));
    const sampleCount = buffer.length;
    for (let i = 0; i < sampleCount; i++) {
      for (let ch = 0; ch < numOfChan; ch++) {
        let sample = Math.max(-1, Math.min(1, channels[ch][i]));
        view.setInt16(
          offset,
          sample < 0 ? sample * 0x8000 : sample * 0x7fff,
          true
        );
        offset += 2;
      }
    }
    return new Blob([view], { type: "audio/wav" });

    function writeString(dv: DataView, offset: number, str: string) {
      for (let i = 0; i < str.length; i++)
        dv.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  /** --- UI --- */
  return (
    <div
      className={`story-container parrot-mixer force-ltr-layout ${lang === "he" ? "text-rtl-scope" : ""}`}
    >
      <div className="story-content">
        {/* Parrot head + line */}
        {/*
          Cycle through 5 GIFs: /images/parrot_pics/green_parrot1.gif ... green_parrot5.gif
          Use currentParrotIndex; update every 2–3 seconds.
        */}

        <ParrotImage wiggle={wiggle} parrotLine={parrotLine} ui={ui} />

        {/* Transport */}
        <div className="mixer-story-nav-inner">
          {isPlaying ? (
            <button
              onClick={stopAll}
              className="mixer-card mixer-stop play-neo anchor btn-play-anchor "
              title={ui.titleStop}
            >
              <span className="pulse" aria-hidden="true"></span>
              <span className="pause-bars" aria-hidden="true">
                <span></span>
                <span></span>
              </span>
            </button>
          ) : (
            <button
              onClick={startAll}
              className="mixer-card mixer-play play-neo anchor btn-play-anchor"
              title={ui.titlePlay}
              disabled={loading}
              aria-busy={loading}
            >
              <span className="pulse" aria-hidden="true"></span>
              {loading ? (
                <span className="spinner fancy" aria-label={ui.loading}></span>
              ) : (
                <span className="play-tri" aria-hidden="true"></span>
              )}
            </button>
          )}

          <div
            className="v-fader anchor btn-volume-anchor"
            role="group"
            aria-label={ui.volume}
            title={ui.volume}
          >
            <div className="fader-body">
              <span className="ticks left" />
              <span className="fader-slot" />
              <span className="ticks right" />
            </div>
            <input
              type="range"
              className="v-range"
              min={0}
              max={100}
              value={100 - Math.round(volume * 100)}
              onChange={(e) =>
                setVolume(
                  Math.max(0, Math.min(1, 1 - Number(e.target.value) / 100))
                )
              }
              aria-label={ui.volume}
            />
          </div>

          {/* Microфон panel with countdown */}
          {!isRec ? (
            <button
              onClick={startRecording}
              className="mixer-card mixer-record play-neo anchor btn-record-anchor"
              data-rec="off"
              title={ui.recordVoice}
              disabled={isCounting}
            >
              {!isCounting ? (
                <svg
                  className="rec-mic-svg"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21H8v2h8v-2h-3v-3.08A7 7 0 0 0 19 11h-2z" />
                </svg>
              ) : (
                <span className="rec-count" aria-live="polite">
                  {countLeft}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="mixer-card mixer-record play-neo anchor btn-isinrecord-anchor"
              data-rec="on"
              title={ui.stopRecording}
            >
              <span className="rec-live-dot" aria-hidden="true"></span>
            </button>
          )}

          <label
            className="mixer-card mixer-volume anchor btn-micvol-anchor"
            title={ui.micVolume}
          >
            <span className="vol-title">{ui.micLabel}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={micVolume}
              onChange={(e) => setMicVolume(parseFloat(e.target.value))}
              aria-label={ui.micVolume}
              className="vol-range"
            />
          </label>
          <label
            className="mixer-card mixer-volume anchor btn-vocalvol-anchor"
            title={ui.voiceVolume}
          >
            <span className="vol-title">{ui.voiceLabel}</span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={vocalVolume}
              onChange={(e) => setVocalVolume(parseFloat(e.target.value))}
              aria-label={ui.voiceVolume}
              className="vol-range"
            />
          </label>
          <div
            className="mixer-card mixer-volume anchor btn-monitor-anchor"
            title={ui.monitorTitle}
          >
            <div className="vol-title">{ui.monitorLabel}</div>
            <button
              type="button"
              className={`monitor-switch ${micMonitorOn ? "on" : ""}`}
              aria-pressed={micMonitorOn}
              onClick={() => setMicMonitorOn(!micMonitorOn)}
            >
              <span>{micMonitorOn ? "ON" : "OFF"}</span>
            </button>
          </div>

          {recUrl && (
            <div
              className="rec-chip anchor rec-chip-anchor"
              title={ui.recordingReady}
            >
              <span>{ui.myRecording}</span>

              {/* ▶ Маленький громкоговоритель — проиграть/остановить запись */}
              <button
                className="rec-chip-play"
                onClick={() => {
                  if (!recUrl) return;
                  try {
                    // если уже играем — остановить
                    if (recPlayElRef.current && !recPlayElRef.current.paused) {
                      recPlayElRef.current.pause();
                      recPlayElRef.current.currentTime = 0;
                      recPlayElRef.current = null;
                    } else {
                      // начать проигрывание записи с учётом текущих уровней
                      const el = new Audio(recUrl);
                      el.currentTime = 0;
                      const target = Math.max(
                        0,
                        Math.min(1, volume * vocalVolume)
                      );
                      try {
                        el.volume = target;
                      } catch {}
                      el.play().catch(() => {});
                      recPlayElRef.current = el;
                    }
                  } catch {}
                }}
                aria-label={ui.listenRecording}
                title={ui.listenRecording}
                disabled={!recUrl}
              >
                🔈
              </button>

              {/* × Удалить */}
              <button
                className="rec-chip-del"
                onClick={() => {
                  const ok = window.confirm(
                    ui.deleteConfirm
                  );
                  if (!ok) return;
                  try {
                    recPlayElRef.current?.pause();
                  } catch {}
                  recPlayElRef.current = null;
                  try {
                    if (recUrl) URL.revokeObjectURL(recUrl);
                  } catch {}
                  setRecUrl(null);
                  vocalBufferRef.current = null;
                  say(ui.reactions.recordingDeleted);
                }}
                aria-label={ui.deleteRecording}
                title={ui.deleteRecording}
              >
                ×
              </button>
            </div>
          )}

          <button
            onClick={saveMix30s}
            className="mixer-card mixer-save play-neo btn-save-anchor anchor"
            title={ui.saveMix}
          >
            <span className="pulse" aria-hidden="true"></span>
            <span className="save-download" aria-hidden="true">
              <span className="save-download-stem"></span>
            </span>
          </button>
        </div>

        {/* Loop sections */}
        <div className="mixer-loops-nav-inner">
          {normLoops.map((l) => {
            const idx = current[l.id];
            const on = idx !== null && idx !== undefined;
            const total = l.variants.length;
            const localizedLayerName = ui.layerNames[l.id] ?? l.label;

            return (
              <div key={l.id} className="mixer-loop-card">
                {/* Header row: toggle + layer name */}
                <div className="mixer-loop-header">
                  <button
                    onClick={() => toggleLayer(l.id)}
                    className={`mixer-layer-btn ${on ? "is-on" : ""}`}
                    aria-pressed={on}
                    aria-label={`${ui.layerLabel}: ${localizedLayerName} ${
                      on ? ui.layerOn : ui.layerOff
                    }`}
                    title={localizedLayerName}
                  >
                    <img
                      src={iconForLayer(l.label, l.id)}
                      alt={localizedLayerName}
                      className="mixer-layer-icon"
                    />
                    {on ? "🔊 " : "🔇 "}
                    {localizedLayerName}
                  </button>

                  {/* Rolodex controls */}
                  <div className="rolodex-controls">
                    <button
                      className="mixer-rolodex-btn"
                      onClick={() => nudgeVariant(l.id, -1)}
                      disabled={!total || (idx ?? 0) <= 0}
                      aria-label={ui.previousVariant}
                      aria-disabled={!total || (idx ?? 0) <= 0}
                      title={
                        (idx ?? 0) <= 0 ? ui.startOfList : ui.previousVariant
                      }
                    >
                      ◀
                    </button>
                    <div className="subtitle">
                      {total > 0
                        ? ui.variantCounter
                            .replace("{current}", String(idx !== null && idx !== undefined ? idx + 1 : 1))
                            .replace("{total}", String(total))
                        : "—"}
                    </div>
                    <button
                      className="mixer-rolodex-btn"
                      onClick={() => nudgeVariant(l.id, 1)}
                      disabled={!total || (idx ?? 0) >= total - 1}
                      aria-label={ui.nextVariant}
                      aria-disabled={!total || (idx ?? 0) >= total - 1}
                      title={
                        (idx ?? 0) >= total - 1 ? ui.endOfList : ui.nextVariant
                      }
                    >
                      ▶
                    </button>
                    <button
                      className="mixer-random-btn"
                      onClick={() => randomizeVariant(l.id)}
                      disabled={!total}
                      aria-label={ui.randomVariant}
                      title={ui.randomVariant}
                    >
                      🎲
                    </button>
                  </div>
                </div>

                {/* Mini film-strip / rolodex list */}
                {total > 1 && (
                  <div
                    ref={setRolodexRef(l.id)}
                    className="rolodex"
                    onKeyDown={(e) => handleKey(l.id, e)}
                    tabIndex={0}
                    aria-label={ui.variantListLabel.replace("{layer}", localizedLayerName)}
                  >
                    {/* left spacer to allow centering of the first item */}
                    <div aria-hidden="true" className="rolodex-spacer" />
                    {l.variants.map((v, i) => {
                      const isActivePreview =
                        preview && preview.loopId === l.id && preview.idx === i;
                      return (
                        <div
                          key={v.id || i}
                          className={`mixer-loop-item color-${(i % 6) + 1}`}
                          title={v.label || `${localizedLayerName} ${i + 1}`}
                        >
                          <button
                            onClick={() => {
                              if (!isPlaying && isActivePreview) {
                                stopPreview();
                                return;
                              }
                              setVariant(l.id, i);
                              scrollToVariant(l.id, i);
                            }}
                            className="mixer-loop-button"
                            aria-label={ui.chooseVariant.replace("{variant}", String(i + 1))}
                          >
                            <span>{v.label || `${localizedLayerName} ${i + 1}`}</span>
                            <span className="loop-eq" aria-hidden="true">
                              <i></i>
                              <i></i>
                              <i></i>
                              <i></i>
                              <i></i>
                            </span>
                          </button>
                        </div>
                      );
                    })}
                    {/* right spacer to allow centering of the last item */}
                    <div aria-hidden="true" className="rolodex-spacer" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
// ParrotImage component: PNG for 10s, then random GIF for 5s, then PNG, etc.
function ParrotImage({
  wiggle,
  parrotLine,
  ui,
}: {
  wiggle: boolean;
  parrotLine: string;
  ui: Props["ui"];
}) {
  const baseParrot = buildSupabasePublicUrl("characters", "parrots/blue_parrot");
  const gifs = [
    `${baseParrot}/blue-parrot1.gif`,
    `${baseParrot}/blue-parrot2.gif`,
    `${baseParrot}/blue-parrot3.gif`,
  ];

  const [showGif, setShowGif] = useState(false);
  const [gifIndex, setGifIndex] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const scheduleNext = (isGifPhase: boolean) => {
      const delay = isGifPhase ? 5000 : 10000; // 5s GIF, 10s PNG
      timerRef.current = window.setTimeout(() => {
        if (cancelled) return;
        if (!isGifPhase) {
          // выбираем новую гифку, отличную от предыдущей
          setGifIndex((prev) => {
            let next = Math.floor(Math.random() * gifs.length);
            if (gifs.length > 1 && next === prev)
              next = (next + 1) % gifs.length;
            return next;
          });
        }
        setShowGif(!isGifPhase);
        scheduleNext(!isGifPhase);
      }, delay);
    };

    scheduleNext(false); // стартуем с PNG
    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const src = showGif ? gifs[gifIndex] : `${baseParrot}/blue-parrot.png`;

  return (
    <div className="parrot-container">
      <img
        src={src}
        alt={ui.imageAlt}
        className={`parrot-image ${wiggle ? "is-wiggle" : ""}`}
      />
      <div className="subtitle">
        {parrotLine || ui.defaultHint}
      </div>
    </div>
  );
}
