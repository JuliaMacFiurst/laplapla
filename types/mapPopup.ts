export type MapPopupType =
  | "country"
  | "river"
  | "sea"
  | "physic"
  | "flag"
  | "animal"
  | "culture"
  | "weather"
  | "food";

export type MapPopupSlide = {
  id: string;
  index: number;
  text: string;
  imageUrl?: string | null;
  mediaType?: "image" | "video" | "gif" | null;
  imageCreditLine?: string | null;
  imageAuthor?: string | null;
  imageSourceUrl?: string | null;
};

export type MapPopupVideo = {
  youtubeUrl?: string | null;
  youtubeId?: string | null;
  title?: string | null;
};

export type MapPopupContent = {
  storyId?: string | number | null;
  type: MapPopupType;
  targetId: string;
  lang: string;
  rawContent?: string | null;
  title?: string | null;
  googleMapsUrl?: string | null;
  slides: MapPopupSlide[];
  video?: MapPopupVideo | null;
  source: "map_story_slides" | "legacy_map_stories" | "content_translations";
};
