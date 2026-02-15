/*
 * MusicPanel
 * ----------------------------------------
 * Панель управления фоновой музыкой в студии.
 *
 * Отвечает за:
 * - отображение добавленных аудиотреков (лупов)
 * - регулировку громкости каждого трека
 * - удаление отдельных треков
 * - запуск и остановку общего воспроизведения
 * - отображение блока аудиодорожек прямо на странице студии
 *
 * Вся логика воспроизведения делегируется в AudioEngine.
 * Этот компонент — только UI + управление состоянием.
 */

"use client";

import { useState, useRef, useEffect, type RefObject } from "react";
import { ParrotPreset, PARROT_PRESETS } from "@/utils/parrot-presets";
import type { AudioEngineHandle } from "./AudioEngine";
import { dictionaries, Lang } from "@/i18n";

type Track = {
  id: string;
  label: string;
  src: string;
  volume: number;
};

type MusicPanelProps = {
  engineRef: RefObject<AudioEngineHandle | null>;

  // Voice recording for current slide
  isRecording: boolean;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => void;
  voiceUrl?: string;
  voiceDuration?: number;
  onRemoveVoice: () => void;
  lang: Lang;
};

export default function MusicPanel({
  engineRef,
  isRecording,
  lang,
  onStartRecording,
  onStopRecording,
  voiceUrl,
  voiceDuration,
  onRemoveVoice,
}: MusicPanelProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const presets: ParrotPreset[] = PARROT_PRESETS;
  const [activeTracks, setActiveTracks] = useState<Track[]>([]);

  const t = dictionaries[lang].cats.studio

  // --- Restore tracks from sessionStorage on mount ---
  useEffect(() => {
    const raw = sessionStorage.getItem("studio-music-tracks");
    if (!raw) return;

    try {
      const parsed: Track[] = JSON.parse(raw);
      setActiveTracks(parsed);

      // restore into AudioEngine
      parsed.forEach((track) => {
        engineRef?.current?.addTrack?.(track);
        engineRef?.current?.setVolume?.(track.id, track.volume);
      });
    } catch (e) {
      console.warn("Failed to restore music tracks", e);
    }
  }, []);

  // --- Persist tracks whenever they change ---
  useEffect(() => {
    sessionStorage.setItem(
      "studio-music-tracks",
      JSON.stringify(activeTracks)
    );
  }, [activeTracks]);

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
      }
    };
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);


  const selectedPreset = presets.find((p) => p.id === selectedPresetId);

  return (
    <div className="studio-panel" style={{ marginTop: 24 }}>
        <div className="studio-section">
            <strong className="studio-label">{t.audio}</strong>
             <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button className="studio-button btn-blue"
        onClick={() => setIsOpen(true)}
      >
        {t.addMusic}
      </button>
          <button
            onClick={() => {
              if (isRecording) {
                onStopRecording?.();
              } else {
                onStartRecording?.();
              }
            }}
            className="studio-button btn-mint"
          >
            <span>
              {isRecording ? t.stopRecording : t.recordVoice}
            </span>

            {isRecording && (
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#ffffff",
                  animation: "pulse-record 1s infinite",
                }}
              />
            )}
          </button>
        </div>
        </div>
      {/* Голосовая дорожка текущего слайда */}
      {voiceUrl && (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 20,
            background: "linear-gradient(rgb(203 190 243), rgb(255 214 230))",
            color: "rgb(0 0 0)",
          }}
        >
          <div style={{ marginBottom: 12, fontWeight: 600 }}>
            {t.voiceTrack}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <audio src={voiceUrl} controls style={{ flex: 1 }} />

            <button
              onClick={onRemoveVoice}
              style={{
                border: "none",
                background: "#ff6b6b",
                color: "#fff",
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          {voiceDuration && (
            <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
              {t.voiceDuration}: {voiceDuration.toFixed(1)} {t.sec}.
            </div>
          )}
        </div>
      )}
      {/* Блок активных аудиодорожек (отображается всегда) */}
      <div
        style={{
          marginTop: 20,
          padding: 16,
          borderRadius: 20,
          background: "linear-gradient(rgb(188 255 239), rgb(255 246 162))",
          color: "rgb(0 0 0)",
        }}
      >
       
        <div style={{ marginBottom: 12, fontWeight: 600 }}>
            {t.currentTracks}
        </div>

        {activeTracks.length === 0 && (
          <div style={{ opacity: 0.6, fontSize: 14 }}>
            {t.noActiveTracks}
          </div>
        )}

        {activeTracks.map((track) => (
          <div
            key={track.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 10,
            }}
          >
            <span style={{ width: 150 }}>{track.label}</span>

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={track.volume}
              onChange={(e) => {
                const volume = Number(e.target.value);
                setActiveTracks((prev) =>
                  prev.map((t) =>
                    t.id === track.id ? { ...t, volume } : t
                  )
                );
                engineRef?.current?.setVolume?.(track.id, volume);
              }}
              style={{ flex: 1 }}
            />

            <button
              onClick={() => {
                setActiveTracks((prev) =>
                  prev.filter((t) => t.id !== track.id)
                );
                engineRef?.current?.removeTrack?.(track.id);
              }}
              style={{
                border: "none",
                background: "#ff6b6b",
                color: "#fff",
                borderRadius: 8,
                padding: "4px 8px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        ))}

        {activeTracks.length > 0 && (
          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <button
              onClick={() => engineRef?.current?.playAll?.()}
              style={{
                padding: "8px 16px",
                borderRadius: 12,
                border: "none",
                background: "#8bc34a",
                cursor: "pointer",
              }}
            >
              ▶ Play
            </button>
            <button
              onClick={() => engineRef?.current?.stopAll?.()}
              style={{
                padding: "8px 16px",
                borderRadius: 12,
                border: "none",
                background: "#f44336",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              ■ Stop
            </button>
          </div>
        )}
      </div>

      {isOpen && (
        <div
          onClick={() => {
            if (previewAudioRef.current) {
              previewAudioRef.current.pause();
              previewAudioRef.current.currentTime = 0;
            }
            setIsOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: 20,
              padding: 24,
              width: 800,
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3>Музыка</h3>
              <button
                onClick={() => {
                  if (previewAudioRef.current) {
                    previewAudioRef.current.pause();
                    previewAudioRef.current.currentTime = 0;
                  }
                  setIsOpen(false);
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 20,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Активные дорожки внутри попапа */}
            <div
              style={{
                marginBottom: 24,
                padding: 16,
                borderRadius: 16,
                background: "#f4f4f4",
              }}
            >
              <div style={{ marginBottom: 12, fontWeight: 600 }}>
                {t.activeTracks}
              </div>

              {activeTracks.length === 0 && (
                <div style={{ opacity: 0.6, fontSize: 14 }}>
                  {t.noActiveTracks}
                </div>
              )}

              {activeTracks.map((track) => (
                <div
                  key={`modal-${track.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <span style={{ width: 150 }}>{track.label}</span>

                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={track.volume}
                    onChange={(e) => {
                      const volume = Number(e.target.value);
                      setActiveTracks((prev) =>
                        prev.map((t) =>
                          t.id === track.id ? { ...t, volume } : t
                        )
                      );
                      engineRef?.current?.setVolume?.(track.id, volume);
                    }}
                    style={{ flex: 1 }}
                  />

                  <button
                    onClick={() => {
                      setActiveTracks((prev) =>
                        prev.filter((t) => t.id !== track.id)
                      );
                      engineRef?.current?.removeTrack?.(track.id);
                    }}
                    style={{
                      border: "none",
                      background: "#ff6b6b",
                      color: "#fff",
                      borderRadius: 8,
                      padding: "4px 8px",
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}

              {activeTracks.length > 0 && (
                <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                  <button
                    onClick={() => engineRef?.current?.playAll?.()}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 10,
                      border: "none",
                      background: "#8bc34a",
                      cursor: "pointer",
                    }}
                  >
                    ▶ Play
                  </button>
                  <button
                    onClick={() => engineRef?.current?.stopAll?.()}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 10,
                      border: "none",
                      background: "#f44336",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    ■ Stop
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  style={{
                    marginRight: 8,
                    marginBottom: 8,
                    padding: "8px 14px",
                    borderRadius: 12,
                    border: selectedPresetId === preset.id
                      ? "2px solid #ff8c42"
                      : "1px solid #ddd",
                    background:
                      selectedPresetId === preset.id ? "#fff3e6" : "#fafafa",
                    cursor: "pointer",
                  }}
                >
                  {preset.title}
                </button>
              ))}
            </div>

            {selectedPreset && (
              <div>
                {selectedPreset.loops.map((loop) => (
                  <div
                    key={loop.id}
                    style={{
                      marginBottom: 16,
                      padding: 12,
                      borderRadius: 14,
                      background: "#f9f9f9",
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>
                      {loop.label}
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {loop.variants.map((variant) => (
                        <div key={variant.id} style={{ display: "flex", gap: 4 }}>
                          <button
                            onClick={() => {
                              if (activeTracks.length >= 4) return;

                              if (activeTracks.some((t) => t.id === variant.id))
                                return;

                              const newTrack = {
                                id: variant.id,
                                label: variant.label || loop.label,
                                src: variant.src,
                                volume: 1,
                              };

                              setActiveTracks((prev) => [...prev, newTrack]);
                              engineRef?.current?.addTrack?.(newTrack);
                            }}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 10,
                              border: "1px solid #ccc",
                              background: "#ffffff",
                              cursor: "pointer",
                            }}
                          >
                            {variant.label}
                          </button>

                          <button
                            onClick={() => {
                              // If clicking the same variant → toggle pause
                              if (previewingId === variant.id && previewAudioRef.current) {
                                previewAudioRef.current.pause();
                                previewAudioRef.current.currentTime = 0;
                                previewAudioRef.current = null;
                                setPreviewingId(null);
                                return;
                              }

                              // Stop previous preview if exists
                              if (previewAudioRef.current) {
                                previewAudioRef.current.pause();
                                previewAudioRef.current.currentTime = 0;
                              }

                              const audio = new Audio(variant.src);
                              previewAudioRef.current = audio;
                              setPreviewingId(variant.id);

                              audio.onended = () => {
                                setPreviewingId(null);
                                previewAudioRef.current = null;
                              };

                              audio.play();
                            }}
                            style={{
                              padding: "6px 8px",
                              borderRadius: 10,
                              border: "1px solid #ccc",
                              background: previewingId === variant.id ? "#ffdede" : "#e0f7ff",
                              cursor: "pointer",
                            }}
                          >
                            {previewingId === variant.id ? "⏸" : "▶"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    {/* Pulse animation for record button */}
    <style jsx>{`
      @keyframes pulse-record {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.3);
          opacity: 0.6;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
    `}</style>
    </div>
  );
}