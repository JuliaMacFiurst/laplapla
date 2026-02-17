export async function recordPreviewDom(
  durationMs: number,
  onReadyToStart?: () => Promise<void> | void
): Promise<Blob> {

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 30 },
    audio: true
  });

  // User has selected the tab. Now we can safely reset preview before recording starts.
  if (onReadyToStart) {
    await onReadyToStart();
  }

  const recorder = new MediaRecorder(stream, {
    mimeType: "video/webm"
  });

  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  // Wait until recorder actually starts before counting duration
  await new Promise<void>((resolve) => {
    recorder.onstart = () => resolve();
    recorder.start();
  });

  // Now duration timing starts exactly from recorder start
  await new Promise((r) => setTimeout(r, durationMs));

  await new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
    recorder.stop();
  });

  stream.getTracks().forEach((t) => t.stop());

  return new Blob(chunks, { type: "video/webm" });
}