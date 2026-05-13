import type { Track } from "@/components/studio/MusicPanel";

export type StudioStickerAnimationType = "webp" | "apng" | "gif";

export type StudioSticker = {
  id: string;
  sourceUrl: string;
  previewUrl?: string;
  source: "giphy" | "laplapla" | "upload" | "custom";
  animationType: StudioStickerAnimationType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  visible: boolean;
  timing?: {
    startMs: number;
    endMs?: number;
  };
  tags?: string[];
}

export type StudioSlide = {
  id: string
  text: string
  mediaUrl?: string
  bgColor: string
  textColor: string
  audioUrl?: string
  mediaFit?: "cover" | "contain";
  mediaPosition?: "top" | "center" | "bottom";
  mediaType?: "image" | "video";
  textPosition?: "top" | "center" | "bottom";
  textBgEnabled?: boolean;
  textBgColor?: string;
  textBgOpacity?: number;
  fontSize?: number;
  textAlign?: "left" | "center" | "right";
  voiceUrl?: string;
  voiceDuration?: number;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  fontFamily?: string;
  textOffsetX?: number;
  textOffsetY?: number;
  mediaOffsetX?: number;
  mediaOffsetY?: number;
  mediaScale?: number;
  voiceBaseUrl?: string;
  voiceBaseDuration?: number;
  activeVoiceEffects?: Partial<Record<"enhance" | "louder" | "child", boolean>>;
  introLayout?: "book-meta";
  stickers?: StudioSticker[];
}

export type StudioProject = {
  id: string
  slides: StudioSlide[]
  updatedAt: number
  fontFamily?: string;
  musicTracks: Track[];
}
