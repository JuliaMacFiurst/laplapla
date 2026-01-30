

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
import { scienceShorts } from "./science";
import { natureShorts } from "./nature";
import { artShorts } from "./art";
import { animalsShorts } from "./animals";
import { humanShorts} from "./human";
import { musicShorts } from "./music";
import { mathShorts } from "./math";
import { physicsShorts } from "./physics";



// Future categories can be added here:
// import { spaceShorts } from "../space";
// import { mathShorts } from "../math";
// import { physicsShorts } from "../physics";

// Unified whitelist of all approved shorts
export const shorts = [
  ...scienceShorts,
  ...natureShorts,
  ...artShorts,
  ...animalsShorts,
  ...humanShorts,
  ...musicShorts,
  ...mathShorts,
  ...physicsShorts,
];