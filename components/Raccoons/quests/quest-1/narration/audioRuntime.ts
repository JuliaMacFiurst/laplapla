export type QuestNarrationAudio = Pick<
  HTMLAudioElement,
  "load" | "pause" | "play" | "removeAttribute" | "src"
>;

let activeNarrationAudio: QuestNarrationAudio | null = null;

export function stopQuestNarrationAudio(audio: QuestNarrationAudio | null) {
  if (!audio) return;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  if (activeNarrationAudio === audio) activeNarrationAudio = null;
}
export async function playQuestNarrationAudio(audio: QuestNarrationAudio, url: string) {
  if (activeNarrationAudio && activeNarrationAudio !== audio) {
    stopQuestNarrationAudio(activeNarrationAudio);
  }
  activeNarrationAudio = audio;
  const absoluteUrl = new URL(url, window.location.href).href;
  if (audio.src !== absoluteUrl) {
    audio.src = url;
    audio.load();
  }
  try {
    await audio.play();
  } catch (error) {
    if (activeNarrationAudio === audio) activeNarrationAudio = null;
    throw error;
  }
}
