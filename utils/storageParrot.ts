import { buildSupabasePublicUrl } from "@/lib/publicAssetUrls";

export const getParrotLoopUrl = (path: string): string => {
  return buildSupabasePublicUrl("parrot-audio", `parrots/${path}`);
};
