

export const normalizeWord = (word: string): string => {
  return word
    .toLowerCase()
    .replace(/(ами|ями|ами|ями|ов|ев|ей|ий|ый|ой|ого|ему|ому|ах|ях|ами|ями|у|е|а|ы|и|ю|я|о|ь)$/i, '');
};

export const getWordsFromSentence = (sentence: string): string[] => {
  if (!sentence) return [];
  return sentence
    .toLowerCase()
    .replace(/[.,!?…“”"()«»;:—–-]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 1);
};