function getAudioElementsForExport(): HTMLAudioElement[] {
  const elements = Array.from(
    document.querySelectorAll<HTMLAudioElement>(
      ".studio-preview-player audio, audio[data-studio-engine='true']",
    ),
  );

  return elements.filter((element) => !!element.src && !element.muted);
}

async function createExportAudioStream(): Promise<{
  stream: MediaStream | null;
  cleanup: () => void;
}> {
  const audioElements = getAudioElementsForExport();

  if (!audioElements.length) {
    return {
      stream: null,
      cleanup: () => {},
    };
  }

  const audioContext = new AudioContext();
  const destination = audioContext.createMediaStreamDestination();
  const nodes: AudioNode[] = [];

  await audioContext.resume().catch(() => {});

  for (const element of audioElements) {
    try {
      const source = audioContext.createMediaElementSource(element);
      source.connect(destination);
      source.connect(audioContext.destination);
      nodes.push(source);
      continue;
    } catch {}

    try {
      const captureStream =
        typeof (element as HTMLAudioElement & { captureStream?: () => MediaStream }).captureStream === "function"
          ? (element as HTMLAudioElement & { captureStream: () => MediaStream }).captureStream()
          : typeof (element as HTMLAudioElement & { mozCaptureStream?: () => MediaStream }).mozCaptureStream === "function"
            ? (element as HTMLAudioElement & { mozCaptureStream: () => MediaStream }).mozCaptureStream()
            : null;

      if (captureStream?.getAudioTracks().length) {
        const source = audioContext.createMediaStreamSource(captureStream);
        source.connect(destination);
        nodes.push(source);
      }
    } catch {}
  }

  if (!destination.stream.getAudioTracks().length) {
    await audioContext.close().catch(() => {});

    return {
      stream: null,
      cleanup: () => {},
    };
  }

  return {
    stream: destination.stream,
    cleanup: () => {
      for (const node of nodes) {
        try {
          node.disconnect();
        } catch {}
      }

      destination.stream.getTracks().forEach((track) => track.stop());
      void audioContext.close().catch(() => {});
    },
  };
}

export async function recordPreviewDom(
  durationMs: number,
  onReadyToStart?: () => Promise<void> | void
): Promise<Blob> {
  try {
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: false,
    });

    // User has selected the tab. Now we can safely reset preview before recording starts.
    if (onReadyToStart) {
      await onReadyToStart();
    }

    const exportAudio = await createExportAudioStream();
    const stream = new MediaStream();

    displayStream.getVideoTracks().forEach((track) => stream.addTrack(track));
    exportAudio.stream?.getAudioTracks().forEach((track) => stream.addTrack(track));

    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm"
    });

    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    // Wait until recorder actually starts before counting duration
    await new Promise<void>((resolve, reject) => {
      recorder.onerror = () => reject(new Error("Screen recording failed to start"));
      recorder.onstart = () => resolve();
      recorder.start();
    });

    // Now duration timing starts exactly from recorder start
    await new Promise((r) => setTimeout(r, durationMs));

    await new Promise<void>((resolve, reject) => {
      recorder.onerror = () => reject(new Error("Screen recording stopped with an error"));
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    stream.getTracks().forEach((t) => t.stop());
    displayStream.getTracks().forEach((t) => t.stop());
    exportAudio.cleanup();

    if (chunks.length === 0) {
      throw new Error("Screen recording produced an empty file");
    }

    return new Blob(chunks, { type: "video/webm" });
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Preview recording failed: ${error.message}`
        : "Preview recording failed",
    );
  }
}
