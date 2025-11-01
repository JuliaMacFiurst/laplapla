

import { backgroundPatterns } from '../assets/backgroundPatterns';
import { normalizeWord, getWordsFromSentence } from '../utils/textUtils';

export const getBackgroundForSentence = (sentence: string): string => {
  const words = getWordsFromSentence(sentence);
  for (const pattern of backgroundPatterns) {
    for (const keyword of pattern.keywords) {
      if (words.some(word => normalizeWord(word) === keyword)) {
        return pattern.svg;
      }
    }
  }
  return '/backgrounds/default.svg';
};