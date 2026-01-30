

/**
 * Central aggregator for all short-form videos (YouTube Shorts).
 *
 * IMPORTANT RULES:
 * - UI imports ONLY from `content/videos`
 * - `content/videos/index.ts` re-exports from `./shorts`
 * - This file is the ONLY place where category shorts are merged
 *
 * Each category lives in its own file for curator sanity and scalability.
 */

// Import shorts by category
import { scienceVideos } from "./science";
import { natureVideos } from "./nature";
import { artVideos } from "./art";
import { animalsVideos } from "./animals";
import { humanVideos } from "./human";
import { musicVideos } from "./music";
import { mathVideos } from "./math";
import { physicsVideos } from "./physics";

// --------------------


// Future categories can be added here:
// import { spaceShorts } from "../space";
// import { mathShorts } from "../math";
// import { physicsShorts } from "../physics";

// Unified whitelist of all approved shorts
export const videos = [
  ...scienceVideos,
  ...natureVideos,
  ...artVideos,
  ...animalsVideos,
  ...humanVideos,
  ...musicVideos,
  ...mathVideos,
  ...physicsVideos,
];