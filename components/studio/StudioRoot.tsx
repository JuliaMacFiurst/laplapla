"use client";

import { useState, useEffect, useRef } from "react";
import AudioEngine, { type AudioEngineHandle } from "./AudioEngine";
import MusicPanel from "./MusicPanel";
import type { StudioProject, StudioSlide } from "@/types/studio";
import SlideList from "./SlideList";
import SlideCanvas9x16 from "./SlideCanvas9x16";
import StudioSettingsPanel from "./StudioSettingsPanel";
import StudioPreviewPlayer from "./StudioPreviewPlayer";
import { Lang, dictionaries } from "@/i18n";
import { saveProject, loadProject } from "@/lib/studioStorage";
import MediaPickerModal from "./MediaPickerModal";
import { recordPreviewDom } from "@/lib/recordPreviewDom";
import { useRouter } from "next/router";

const PROJECT_ID = "current-studio-project";

function createEmptySlide(): StudioSlide {
  return {
    id: crypto.randomUUID(),
    text: "",
    mediaUrl: undefined,
    bgColor: "#ffffff",
    textColor: "#000000",
    voiceUrl: undefined,
    voiceDuration: undefined,
  };
}

function createInitialProject(): StudioProject {
  return {
    id: PROJECT_ID,
    slides: [createEmptySlide()],
    musicTracks: [],
    updatedAt: Date.now(),
    fontFamily: "'Amatic SC', cursive",
  };
}

interface StudioRootProps {
  lang: Lang;
  initialSlides?: { text: string; image?: string }[];
}

export default function StudioRoot({ lang, initialSlides }: StudioRootProps) {
  const [project, setProject] = useState<StudioProject>(createInitialProject);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [history, setHistory] = useState<StudioProject[]>([]);
  const [future, setFuture] = useState<StudioProject[]>([]);
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Локальный аудио-движок для музыки всего слайдшоу (до 4 дорожек)
  const audioEngineRef = useRef<AudioEngineHandle | null>(null);

  // --- Voice recording per slide ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const t = dictionaries[lang].cats.studio
  const router = useRouter();

  const previewRef = useRef<HTMLDivElement>(null);

  async function startVoiceRecording() {
    if (isRecording) return;

    try {
      const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 48000,
        },
      });

      // --- Light audio processing via AudioContext ---
      const audioCtx = new AudioContext({ sampleRate: 48000 });
      const source = audioCtx.createMediaStreamSource(rawStream);

      const compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.knee.value = 20;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      const highpass = audioCtx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 80; // remove low rumble

      const destination = audioCtx.createMediaStreamDestination();

      source.connect(highpass);
      highpass.connect(compressor);
      compressor.connect(destination);

      const stream = destination.stream;

      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: 192000,
      });

      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });

        // Persistable URL (survives reload): store as data: URL in project.
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });

        const audio = new Audio(dataUrl);
        await new Promise((resolve) => {
          audio.onloadedmetadata = () => resolve(true);
        });

        const duration = audio.duration;

        setProject((prev) => {
          const updatedSlides = prev.slides.map((s, i) =>
            i === activeSlideIndex
              ? { ...s, voiceUrl: dataUrl, voiceDuration: duration }
              : s
          );

          const updatedProject = {
            ...prev,
            slides: updatedSlides,
            updatedAt: Date.now(),
          };

          // Persist immediately using fresh state
          saveProject(updatedProject);

          return updatedProject;
        });

        rawStream.getTracks().forEach((track) => track.stop());
        audioCtx.close();
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Voice recording failed", err);
    }
  }

  function stopVoiceRecording() {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }

  function bufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);

    let offset = 0;
    const writeString = (str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset++, str.charCodeAt(i));
      }
    };

    writeString("RIFF");
    view.setUint32(offset, 36 + buffer.length * numOfChan * 2, true);
    offset += 4;
    writeString("WAVE");
    writeString("fmt ");
    view.setUint32(offset, 16, true);
    offset += 4;
    view.setUint16(offset, 1, true);
    offset += 2;
    view.setUint16(offset, numOfChan, true);
    offset += 2;
    view.setUint32(offset, buffer.sampleRate, true);
    offset += 4;
    view.setUint32(offset, buffer.sampleRate * numOfChan * 2, true);
    offset += 4;
    view.setUint16(offset, numOfChan * 2, true);
    offset += 2;
    view.setUint16(offset, 16, true);
    offset += 2;
    writeString("data");
    view.setUint32(offset, buffer.length * numOfChan * 2, true);
    offset += 4;

    const channels = [];
    for (let i = 0; i < numOfChan; i++) {
      channels.push(buffer.getChannelData(i));
    }

    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numOfChan; channel++) {
        let sample = Math.max(-1, Math.min(1, channels[channel][i]));
        view.setInt16(offset, sample * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([view], { type: "audio/wav" });
  }

  async function enhanceVoiceRecording() {
    if (!activeSlide.voiceUrl) return;

    try {
      const response = await fetch(activeSlide.voiceUrl);
      const arrayBuffer = await response.arrayBuffer();

      const audioCtx = new AudioContext({ sampleRate: 48000 });
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const offlineCtx = new OfflineAudioContext(
        1,
        audioBuffer.length,
        48000
      );

      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;

      const compressor = offlineCtx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 20;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      const highpass = offlineCtx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 80;

      const presence = offlineCtx.createBiquadFilter();
      presence.type = "peaking";
      presence.frequency.value = 3000;
      presence.gain.value = 3;
      presence.Q.value = 1;

      source.connect(highpass);
      highpass.connect(compressor);
      compressor.connect(presence);
      presence.connect(offlineCtx.destination);

      source.start();
      const renderedBuffer = await offlineCtx.startRendering();

      const wavBlob = bufferToWav(renderedBuffer);

      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve) => {
        reader.onloadend = () => resolve(String(reader.result));
        reader.readAsDataURL(wavBlob);
      });

      setProject((prev) => {
        const updatedSlides = prev.slides.map((s, i) =>
          i === activeSlideIndex
            ? { ...s, voiceUrl: dataUrl }
            : s
        );

        const updatedProject = {
          ...prev,
          slides: updatedSlides,
          updatedAt: Date.now(),
        };

        saveProject(updatedProject);
        return updatedProject;
      });

      audioCtx.close();
    } catch (err) {
      console.error("Enhance voice failed", err);
    }
  }

  function removeVoiceFromSlide() {
    if (activeSlide.voiceUrl && activeSlide.voiceUrl.startsWith("blob:")) {
      URL.revokeObjectURL(activeSlide.voiceUrl);
    }

    updateSlide({
      ...activeSlide,
      voiceUrl: undefined,
      voiceDuration: undefined,
    });
  }

  const activeSlide = project.slides[activeSlideIndex];

  // Restore saved project on mount (only if no external slides arrive)
  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      if (cancelled) return;

      // If slides from Cats were provided, do not restore old project
      if (initialSlides && initialSlides.length > 0) return;

      const saved = await loadProject(PROJECT_ID);
      if (saved) {
        setProject(saved);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // Autosave every 4 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      setIsSaving(true);
      await saveProject(project);
      setLastSavedAt(Date.now());
      setIsSaving(false);
    }, 4000);

    return () => clearInterval(interval);
  }, [project]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => {
    if (!initialSlides || initialSlides.length === 0) return;

    const mappedSlides: StudioSlide[] = initialSlides.map(
      (s: { text: string; image?: string }) => ({
        id: crypto.randomUUID(),
        text: s.text,
        mediaUrl: s.image,
        bgColor: "#ffffff",
        textColor: "#000000",
      }),
    );

    const newProject: StudioProject = {
      id: PROJECT_ID,
      slides: mappedSlides,
      musicTracks: [],
      updatedAt: Date.now(),
    };

    setProject(newProject);
    setActiveSlideIndex(0);

    // Immediately overwrite saved project with external slides
    saveProject(newProject);
  }, [initialSlides]);

  function pushHistory(current: StudioProject) {
    setHistory((prev) => [...prev, current]);
    setFuture([]);
  }

  function updateSlide(updatedSlide: StudioSlide) {
    pushHistory(project);
    const updatedSlides = [...project.slides];
    updatedSlides[activeSlideIndex] = updatedSlide;

    setProject({
      ...project,
      slides: updatedSlides,
      updatedAt: Date.now(),
    });
  }

  function updateMusicTracks(tracks: StudioProject["musicTracks"]) {
    pushHistory(project);
    setProject({
      ...project,
      musicTracks: tracks,
      updatedAt: Date.now(),
    });
  }

  function addSlide() {
    pushHistory(project);
    const newSlide = createEmptySlide();

    setProject({
      ...project,
      slides: [...project.slides, newSlide],
      updatedAt: Date.now(),
    });

    setActiveSlideIndex(project.slides.length);
  }

  function deleteSlide(index: number) {
    if (project.slides.length === 1) return;

    pushHistory(project);

    const updatedSlides = project.slides.filter((_, i) => i !== index);

    setProject({
      ...project,
      slides: updatedSlides,
      updatedAt: Date.now(),
    });

    setActiveSlideIndex(Math.max(0, index - 1));
  }

  function deleteAll() {
    pushHistory(project);
    setProject(createInitialProject());
    setActiveSlideIndex(0);
  }

  function undo() {
    if (history.length === 0) return;

    const previous = history[history.length - 1];

    setFuture((f) => [project, ...f]);
    setHistory((h) => h.slice(0, -1));
    setProject(previous);
  }

  function redo() {
    if (future.length === 0) return;

    const next = future[0];

    setHistory((h) => [...h, project]);
    setFuture((f) => f.slice(1));
    setProject(next);
  }

  async function exportPreviewAsWebm() {
    // Ensure preview is visible
    setIsPreviewOpen(true);

    // Wait for preview to mount
    await new Promise((r) => setTimeout(r, 100));

    // Try to fullscreen only the preview container
    if (previewRef.current) {
      try {
        await previewRef.current.requestFullscreen();
      } catch (e) {
        console.warn("Fullscreen not allowed", e);
      }
    }

    // Calculate total duration (voiceDuration or default 3 seconds)
    const totalDurationMs =
      project.slides.reduce((acc, s) => {
        const d =
          s.voiceDuration && s.voiceDuration > 0
            ? s.voiceDuration
            : 3;
        return acc + d;
      }, 0) * 1000;

    try {
      const blob = await recordPreviewDom(totalDurationMs);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "studio-preview.webm";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      // Exit fullscreen if active
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {}
      }
      setIsPreviewOpen(false);
    }
  }

  return (
    <div className="studio-root">
      <div className="studio-layout">
        <div className="studio-left">
          <SlideList
            lang={lang}
            slides={project.slides}
            activeIndex={activeSlideIndex}
            onSelect={setActiveSlideIndex}
            onAdd={addSlide}
            onDelete={deleteSlide}
            onReorder={(from, to) => {
              setProject((prev) => {
                const slides = [...prev.slides];
                const [moved] = slides.splice(from, 1);
                slides.splice(to, 0, moved);

                return {
                  ...prev,
                  slides,
                  updatedAt: Date.now(),
                };
              });

              setActiveSlideIndex(to);
            }}
          />

          <div className="studio-canvas-wrapper">
            {!isPreviewOpen && (
              <SlideCanvas9x16 slide={activeSlide} lang={lang} />
            )}

            {isPreviewOpen && (
              <StudioPreviewPlayer
                ref={previewRef}
                slides={project.slides}
                musicEngineRef={audioEngineRef}
                lang={lang}
                onClose={() => setIsPreviewOpen(false)}
              />
            )}
          </div>
          <div className="studio-save-indicator">
            {isSaving && <span className="saving">Сохраняем…</span>}
            {!isSaving && lastSavedAt && (
              <span className="saved">
                {t.saved} 
              </span>
            )}
          </div>
          <AudioEngine ref={audioEngineRef} maxTracks={4} />
          {/* Музыкальная панель: управляет общим фоновым сопровождением всего проекта */}
          <MusicPanel
            lang={lang}
            engineRef={audioEngineRef}
            initialTracks={project.musicTracks}
            onTracksChange={updateMusicTracks}
            isRecording={isRecording}
            onStartRecording={startVoiceRecording}
            onStopRecording={stopVoiceRecording}
            voiceUrl={activeSlide.voiceUrl}
            voiceDuration={activeSlide.voiceDuration}
            onRemoveVoice={removeVoiceFromSlide}
            onEnhanceVoice={enhanceVoiceRecording}
          />
          
        </div>

        <div className="studio-right">
          <div className="studio-panel">
            <StudioSettingsPanel
              lang={lang}
              slide={activeSlide}
              textValue={activeSlide.text}
              onChangeText={(text) => updateSlide({ ...activeSlide, text })}
              onChangeTextColor={(color) =>
                updateSlide({ ...activeSlide, textColor: color })
              }
              onChangeBgColor={(color) =>
                updateSlide({ ...activeSlide, bgColor: color })
              }
              onAddMedia={() => setIsMediaOpen(true)}
              onPreview={() => setIsPreviewOpen(true)}
              onExport={() => router.push(`/cats/export?lang=${lang}`)}
              onSetFitCover={() =>
                updateSlide({ ...activeSlide, mediaFit: "cover" })
              }
              onSetFitContain={() =>
                updateSlide({ ...activeSlide, mediaFit: "contain" })
              }
              onSetPositionTop={() =>
                updateSlide({ ...activeSlide, mediaPosition: "top" })
              }
              onSetPositionCenter={() =>
                updateSlide({ ...activeSlide, mediaPosition: "center" })
              }
              onSetPositionBottom={() =>
                updateSlide({ ...activeSlide, mediaPosition: "bottom" })
              }
              onSetTextTop={() =>
                updateSlide({ ...activeSlide, textPosition: "top" })
              }
              onSetTextCenter={() =>
                updateSlide({ ...activeSlide, textPosition: "center" })
              }
              onSetTextBottom={() =>
                updateSlide({ ...activeSlide, textPosition: "bottom" })
              }
              onToggleTextBg={() =>
                updateSlide({
                  ...activeSlide,
                  textBgEnabled: !activeSlide.textBgEnabled,
                })
              }
              onChangeTextBgColor={(color) =>
                updateSlide({ ...activeSlide, textBgColor: color })
              }
              onChangeTextBgOpacity={(opacity) =>
                updateSlide({ ...activeSlide, textBgOpacity: opacity })
              }
              onSetAlignLeft={() =>
                updateSlide({ ...activeSlide, textAlign: "left" })
              }
              onSetAlignCenter={() =>
                updateSlide({ ...activeSlide, textAlign: "center" })
              }
              onSetAlignRight={() =>
                updateSlide({ ...activeSlide, textAlign: "right" })
              }
              onChangeFontSize={(size) =>
                updateSlide({ ...activeSlide, fontSize: size })
              }
              onDeleteAll={deleteAll}
              onUndo={undo}
              onRedo={redo}
            />
          </div>
          
        </div>
      </div>
      <MediaPickerModal
        lang={lang}
        isOpen={isMediaOpen}
        onClose={() => setIsMediaOpen(false)}
        onSelect={({ url, mediaType }) => {
          updateSlide({
            ...activeSlide,
            mediaUrl: url,
            mediaType,
          });

          setIsMediaOpen(false);
        }}
      />
    </div>
  );
}
