import type { Track } from "@/components/studio/MusicPanel";

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
}

export type StudioProject = {
  id: string
  slides: StudioSlide[]
  updatedAt: number
  fontFamily?: string;
  musicTracks: Track[];
}
