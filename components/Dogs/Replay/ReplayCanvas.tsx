"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ReplayEngine } from "./ReplayEngine";
import type { ReplayActionGroup, ReplayRegionData } from "./types";

type Props = {
  actionGroups: ReplayActionGroup[];
  regionMaps: Map<number, ReplayRegionData>;
  width?: number;
  height?: number;
  onClose?: () => void;
};

export default function ReplayCanvas({
  actionGroups,
  regionMaps,
  width = 512,
  height = 512,
  onClose,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<ReplayEngine | null>(null);

  const [playing, setPlaying] = useState(true);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);

  const hasActions = useMemo(
    () => actionGroups.some((group) => group.actions.length > 0),
    [actionGroups],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new ReplayEngine(actionGroups, regionMaps, canvas, {
      width,
      height,
      strokePointDelayMs: 8,
      actionDelayMs: 80,
    });

    engineRef.current = engine;

    const unsubscribe = engine.onFinish(() => {
      setPlaying(false);
      setPaused(false);
    });

    if (hasActions) {
      engine.play();
      setPlaying(true);
      setPaused(false);
    } else {
      setPlaying(false);
      setPaused(false);
    }

    return () => {
      unsubscribe();
      engine.destroy();
      engineRef.current = null;
    };
  }, [actionGroups, regionMaps, width, height, hasActions]);

  const pause = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.pause();
    setPaused(true);
    setPlaying(true);
  };

  const resume = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.resume();
    setPaused(false);
    setPlaying(true);
  };

  const play = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.play();
    setPaused(false);
    setPlaying(true);
  };

  const restart = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.restart();
    engine.play();
    setPaused(false);
    setPlaying(true);
  };

  const close = () => {
    engineRef.current?.stop();
    setPlaying(false);
    setPaused(false);
    onClose?.();
  };

  const exportVideo = async () => {
    const engine = engineRef.current;
    if (!engine) return;

    try {
      setBusy(true);
      const blob = await engine.exportVideo();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "drawing-replay.webm";
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Не удалось экспортировать видео реплея.");
    } finally {
      setBusy(false);
    }
  };

  const exportGIF = async () => {
    const engine = engineRef.current;
    if (!engine) return;

    try {
      setBusy(true);
      const blob = await engine.exportGIF({
        width: 384,
        height: 384,
        fps: 12,
        workerScript: "/gif.worker.js",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "drawing-replay.gif";
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("GIF export требует gif.js в проекте.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="replay-root">
      <button onClick={close} className="replay-close-btn">
        ✕
      </button>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="replay-canvas"
      />

      <div className="replay-controls">
        <button
          className="replay-btn"
          onClick={play}
          disabled={!hasActions || busy || (playing && !paused)}
        >
          ▶ Play
        </button>
        <button
          className="replay-btn"
          onClick={pause}
          disabled={!hasActions || busy || !playing || paused}
        >
          ⏸ Pause
        </button>
        <button className="replay-btn" onClick={resume} disabled={!hasActions || busy || !paused}>
          ⏯ Resume
        </button>
        <button className="replay-btn" onClick={restart} disabled={!hasActions || busy}>
          ↺ Restart
        </button>
        <button className="replay-btn replay-btn-export" onClick={exportVideo} disabled={!hasActions || busy}>
          ⬇ Video
        </button>
        <button className="replay-btn replay-btn-export" onClick={exportGIF} disabled={!hasActions || busy}>
          ⬇ GIF
        </button>
      </div>
    </div>
  );
}
