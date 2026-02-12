export interface BookStory {
  title: string;
  summary: string; // The full summary from Gemini
}

// Represents a single sentence "slide" within a story
export interface SentenceSlide {
  text: string;
  capybaraImage: string; // This will now be a path to a local image
  capybaraImageAlt: string; // Alt text for the local image
  backgroundImage?: string; // Optional background image
  videoUrl?: string; // Optional video URL from Pexels
  gifUrl?: string; // Optional gif URL
  imageUrl?: string;
  type?: 'image' | 'video' | 'gif'; // Type of the slide
}

// Represents the entire story, processed for carousel display
export interface ProcessedStory {
  id: string;
  title: string;
  sentences: SentenceSlide[];
  backgroundColor: string; // Tailwind CSS class string
}

// Type for parsed Gemini response
export type GeminiBookStory = {
  title: string;
  summary: string;
  notFound?: boolean; // Optional flag if Gemini indicates book not found
  videoUrls?: string[]; // Optional list of video URLs (e.g. from Pexels)
};

// Represents a single pre-defined capybara illustration
export interface CapybaraIllustration {
  id: string;
  src: string; // Path to the image, e.g., /images/capybara_happy.png
  alt: string; // Alt text for the image
  keywords?: string[]; // Keywords describing the image content (emotion, action, etc.)
}

export interface ErrorMessageProps {
  message: string;
  customTitle?: string; // Optional custom title for the error message
}

export interface LoadStoryOptions {
  bookTitle?: string;
  inventStory?: boolean;
  generateForRandomChildrensBook?: boolean;
}

// =============================
// Dress-up game (Quest-1 / Day5)
// =============================

export type DressUpSeason = "winter-clothes" | "summer-clothes" | "mid-season";

export interface DressUpCharacter {
  name: string;
  img: string;
}

export interface DressedItem {
  /** Base item id without extension and without -dressed suffix, e.g. "Winter-boots" */
  id: string;
  /** Folder name under the character directory */
  season: DressUpSeason;
}

export interface CharacterResult {
  character: DressUpCharacter;
  dressedItems: DressedItem[];
  goodScore: number;
  badScore: number;
  /** Convenience value: goodScore - badScore */
  totalScore: number;
  maxScore: number;
}

export type SledAnimation =
  | "loads"
  | "water"
  | "food"
  | "dogs"
  | "skids"
  | null;

