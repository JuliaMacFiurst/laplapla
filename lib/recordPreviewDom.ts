export async function recordPreviewDom(
  durationMs: number
): Promise<Blob> {

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 30 },
    audio: true
  });

  const recorder = new MediaRecorder(stream, {
    mimeType: "video/webm"
  });

  const chunks: BlobPart[] = [];

  recorder.ondataavailable = e => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.start();

  await new Promise(r => setTimeout(r, durationMs));

  recorder.stop();

  await new Promise(r => recorder.onstop = r);

  stream.getTracks().forEach(t => t.stop());

  return new Blob(chunks, { type: "video/webm" });
}