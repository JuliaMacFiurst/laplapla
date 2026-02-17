/**
 * AudioEngine — локальный движок управления музыкальными лупами в Studio.
 *
 * Отвечает за:
 *  - хранение и управление до 4 аудиодорожек
 *  - создание и уничтожение HTMLAudioElement
 *  - зацикливание (loop) треков
 *  - управление громкостью каждой дорожки
 *  - запуск и остановку всех треков (предпросмотр)
 *
 * Музыка НЕ запускается автоматически.
 * Воспроизведение происходит только по явному вызову playAll().
 *
 * Компонент не использует глобальное состояние.
 * Управление осуществляется через ref (forwardRef).
 */

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from "react";

export type AudioTrack = {
  id: string;
  src: string;
  volume: number; // 0..1
};

export type AudioEngineHandle = {
  addTrack: (track: AudioTrack) => void;
  removeTrack: (id: string) => void;
  setVolume: (id: string, volume: number) => void;
  playAll: () => void;
  pauseAll: () => void;
  stopAll: () => void;
  getTracks: () => AudioTrack[];
};

interface AudioEngineProps {
  maxTracks?: number;
}

const AudioEngine = forwardRef<AudioEngineHandle, AudioEngineProps>(
  ({ maxTracks = 4 }, ref) => {
  const tracksRef = useRef<AudioTrack[]>([]);
  const audioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const musicMultiplierRef = useRef<number>(1);

  const addTrack = (track: AudioTrack) => {
    if (tracksRef.current.length >= maxTracks) return;

    // если трек уже есть — не добавляем повторно
    if (audioMapRef.current.has(track.id)) return;

    const audio = document.createElement("audio");
    audio.src = track.src;
    audio.loop = true;
    const baseVolume = typeof track.volume === "number" ? track.volume : 1;
    audio.volume = baseVolume * musicMultiplierRef.current;
    audio.preload = "auto";
    audio.style.display = "none";

    document.body.appendChild(audio);

    audioMapRef.current.set(track.id, audio);
    tracksRef.current.push(track);
  };

  const removeTrack = (id: string) => {
    const audio = audioMapRef.current.get(id);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      if (audio.parentElement) {
        audio.parentElement.removeChild(audio);
      }
      audioMapRef.current.delete(id);
    }

    tracksRef.current = tracksRef.current.filter((t) => t.id !== id);
  };

  const setVolume = (id: string, volume: number) => {
    const audio = audioMapRef.current.get(id);
    const baseVolume = typeof volume === "number" ? volume : 1;
    if (audio) {
      audio.volume = baseVolume * musicMultiplierRef.current;
    }

    tracksRef.current = tracksRef.current.map((t) =>
      t.id === id ? { ...t, volume } : t,
    );
  };

  const playAll = async () => {
    for (const track of tracksRef.current) {
      const audio = audioMapRef.current.get(track.id);
      if (!audio) continue;

      const baseVolume = typeof track.volume === "number" ? track.volume : 1;
      audio.volume = baseVolume * musicMultiplierRef.current;

      try {
        await audio.play();
      } catch (e) {
        console.warn("Audio play error:", e);
      }
    }
  };

  const pauseAll = () => {
    for (const audio of audioMapRef.current.values()) {
      audio.pause();
    }
  };

  const stopAll = () => {
    for (const audio of audioMapRef.current.values()) {
      audio.pause();
      audio.currentTime = 0;
    }
  };

  const getTracks = () => {
    return tracksRef.current;
  };

  const duckMusic = () => {
    musicMultiplierRef.current = 0.4; // reduce music
    for (const track of tracksRef.current) {
      const audio = audioMapRef.current.get(track.id);
      if (audio) {
        const baseVolume = typeof track.volume === "number" ? track.volume : 1;
        audio.volume = baseVolume * musicMultiplierRef.current;
      }
    }
  };

  const restoreMusic = () => {
    musicMultiplierRef.current = 1;
    for (const track of tracksRef.current) {
      const audio = audioMapRef.current.get(track.id);
      if (audio) {
        const baseVolume = typeof track.volume === "number" ? track.volume : 1;
        audio.volume = baseVolume * musicMultiplierRef.current;
      }
    }
  };

  useImperativeHandle(ref, () => ({
    addTrack,
    removeTrack,
    setVolume,
    playAll,
    pauseAll,
    stopAll,
    getTracks,
    duckMusic,
    restoreMusic,
  }));

  // При размонтировании компонента останавливаем всё
  useEffect(() => {
    return () => {
      stopAll();
      for (const audio of audioMapRef.current.values()) {
        if (audio.parentElement) {
          audio.parentElement.removeChild(audio);
        }
      }
      audioMapRef.current.clear();
      tracksRef.current = [];
    };
  }, []);

return null;
});

AudioEngine.displayName = "AudioEngine";
export default AudioEngine;