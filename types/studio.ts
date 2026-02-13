export type StudioSlide = {
  id: string
  text: string
  mediaUrl?: string
  bgColor: string
  textColor: string
  audioUrl?: string
  musicTracks?: string[]
  mediaFit?: "cover" | "contain";
  mediaPosition?: "top" | "center" | "bottom";
  mediaType?: "image" | "video";
  textPosition?: "top" | "center" | "bottom";
  textBgEnabled?: boolean;
  textBgColor?: string;
  textBgOpacity?: number;
}

export type StudioProject = {
  id: string
  slides: StudioSlide[]
  updatedAt: number
}
