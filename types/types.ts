export interface Slide {
  id?: string | number;
  text: string;
  keywords?: string[];
  mood?: string;
  gifUrl?: string;
  capybaraImage?: string;
  capybaraImageAlt?: string;
  videoUrl?: string;
  imageUrl?: string;
  type?: "image" | "video" | "gif";
}

export interface CarouselStory {
  id: string;
  title: string;
  slides: Slide[];
}

export interface GeminiBookStory {
  title: string
  summary: string
}

export interface LoadStoryOptions {
  inventStory?: boolean
  generateForRandomChildrensBook?: boolean
  bookTitle?: string
}

export interface Book {
  id: string | number;
  title: string;
  author?: string | null;
  year?: string | number | null;
  age_group?: string | number | null;
  description?: string | null;
  cover_url?: string | null;
  category?: string | null;
  category_id?: string | number | null;
  [key: string]: unknown;
}

export interface BookExplanation {
  id: string | number;
  book_id: string | number;
  mode_id: string | number;
  slides: Slide[];
  [key: string]: unknown;
}

export interface BookTest {
  id: string | number;
  book_id: string | number;
  title?: string | null;
  description?: string | null;
  questions?: BookTestQuestion[];
  [key: string]: unknown;
}

export interface BookTestQuestion {
  question: string;
  options: string[];
}

export interface ExplanationMode {
  id: string | number;
  name?: string | null;
  title?: string | null;
  slug?: string | null;
  description?: string | null;
  [key: string]: unknown;
}

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
