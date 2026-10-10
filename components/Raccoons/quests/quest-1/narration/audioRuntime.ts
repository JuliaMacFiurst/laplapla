export type QuestNarrationAudio = Pick<
  HTMLAudioElement,
  "load" | "pause" | "play" | "removeAttribute" | "src"
>;

export function stopQuestNarrationAudio(audio: QuestNarrationAudio | null) {
  if (!audio) return;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}
export async function playQuestNarrationAudio(audio: QuestNarrationAudio, url: string) {
  const absoluteUrl = new URL(url, window.location.href).href;
  if (audio.src !== absoluteUrl) {
    audio.src = url;
    audio.load();
  }
  await audio.play();
}
