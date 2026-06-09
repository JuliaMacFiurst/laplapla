import { getParrotAudioUrl } from "@/lib/parrotMediaUrls";

export const getParrotLoopUrl = (path: string): string => {
  return getParrotAudioUrl(`parrots/${path}`);
};
