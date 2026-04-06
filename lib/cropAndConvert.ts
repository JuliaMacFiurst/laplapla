"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

type FFmpegLoadConfig = {
  coreURL?: string;
  wasmURL?: string;
  workerURL?: string;
  classWorkerURL?: string;
};

let ffmpeg: FFmpeg | null = null;
let ffmpegLoaded = false;
let ffmpegLoadingPromise: Promise<FFmpeg> | null = null;

function getFFmpegAssetUrl(path: string): string {
  if (typeof window === "undefined") {
    return path;
  }

  return new URL(path, window.location.origin).toString();
}

function getFFmpegLoadConfig(): FFmpegLoadConfig {
  return {
    coreURL: getFFmpegAssetUrl("/ffmpeg/ffmpeg-core.js"),
    wasmURL: getFFmpegAssetUrl("/ffmpeg/ffmpeg-core.wasm"),
    classWorkerURL: getFFmpegAssetUrl("/ffmpeg/ffmpeg-worker.js"),
  };
}

function createFFmpegInstance(): FFmpeg {
  const instance = new FFmpeg();
  instance.on("log", () => {});
  return instance;
}

async function loadFFmpegInstance(instance: FFmpeg): Promise<void> {
  await instance.load(getFFmpegLoadConfig());
}

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpegLoaded) {
    return ffmpeg;
  }

  if (ffmpegLoadingPromise) {
    return ffmpegLoadingPromise;
  }

  ffmpegLoadingPromise = (async () => {
    const instance = createFFmpegInstance();

    try {
      await loadFFmpegInstance(instance);
      ffmpeg = instance;
      ffmpegLoaded = true;
      return instance;
    } catch (error) {
      instance.terminate();
      ffmpeg = null;
      ffmpegLoaded = false;
      throw new Error(
        error instanceof Error
          ? `FFmpeg failed to load: ${error.message}`
          : "FFmpeg failed to load",
      );
    } finally {
      ffmpegLoadingPromise = null;
    }
  })();

  return ffmpegLoadingPromise;
}

async function getVideoDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(blob);

    video.preload = "metadata";
    video.src = url;

    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };

    video.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
  });
}

export async function cropAndConvert(
  inputBlob: Blob,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  if (typeof window === "undefined") {
    throw new Error("cropAndConvert must run in the browser");
  }

  try {
    const { width: videoWidth, height: videoHeight } = await getVideoDimensions(inputBlob);

    // Calculate central 9:16 crop
    const targetWidth = Math.floor((videoHeight * 9) / 16);
    const cropX = Math.floor((videoWidth - targetWidth) / 2);

    if (targetWidth <= 0 || cropX < 0) {
      throw new Error("Invalid crop dimensions calculated");
    }

    const ffmpegInstance = await getFFmpeg();

    ffmpegInstance.on("progress", ({ progress }) => {
      if (onProgress) {
        onProgress(progress);
      }
    });

    const inputName = "input.webm";
    const outputName = "output.mp4";

    await ffmpegInstance.writeFile(inputName, await fetchFile(inputBlob));

    await ffmpegInstance.exec([
      "-i", inputName,
      "-vf", `crop=${targetWidth}:${videoHeight}:${cropX}:0`,
      "-r", "30",
      "-vsync", "2",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-profile:v", "baseline",
      "-level", "3.0",
      "-pix_fmt", "yuv420p",
      "-movflags", "faststart",
      outputName,
    ]);

    const data = await ffmpegInstance.readFile(outputName);

    try {
      await ffmpegInstance.deleteFile(inputName);
      await ffmpegInstance.deleteFile(outputName);
    } catch {}

    const buffer =
      data instanceof Uint8Array ? data.buffer : new Uint8Array(data as any).buffer;

    return new Blob([buffer], { type: "video/mp4" });
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Video conversion failed: ${error.message}`
        : "Video conversion failed",
    );
  }
}

export async function preloadFFmpeg(): Promise<void> {
  await getFFmpeg();
}
