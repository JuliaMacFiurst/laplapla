"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  ffmpeg.on("log", () => {});
  await ffmpeg.load();

  return ffmpeg;
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
    "-r", "30",                // force constant 30fps
    "-vsync", "2",             // CFR sync
    "-c:v", "libx264",
    "-preset", "veryfast",     // better balance than ultrafast
    "-profile:v", "baseline",
    "-level", "3.0",
    "-pix_fmt", "yuv420p",
    "-movflags", "faststart",
    outputName,
  ]);

  const data = await ffmpegInstance.readFile(outputName);

  // Cleanup temporary files
  try {
    await ffmpegInstance.deleteFile(inputName);
    await ffmpegInstance.deleteFile(outputName);
  } catch {}

  const buffer =
    data instanceof Uint8Array ? data.buffer : new Uint8Array(data as any).buffer;

  return new Blob([buffer], { type: "video/mp4" });
}

export async function preloadFFmpeg(): Promise<void> {
  await getFFmpeg();
}