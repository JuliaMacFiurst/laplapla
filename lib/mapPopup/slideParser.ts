type ParsedSlide = {
  text: string;
  slideOrder: number;
};

const MAX_SLIDE_LENGTH = 260;
const MAX_SENTENCES_PER_SLIDE = 2;

function splitTextToParagraphs(input: string) {
  return input
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function splitParagraphToSentences(paragraph: string) {
  return paragraph
    .split(/(?<=[.!?…])\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function chunkSentences(sentences: string[]) {
  const slides: string[] = [];
  let buffer = "";
  let sentenceCount = 0;

  for (const sentence of sentences) {
    const candidate = buffer ? `${buffer} ${sentence}` : sentence;
    const shouldFlush =
      Boolean(buffer) &&
      (candidate.length > MAX_SLIDE_LENGTH || sentenceCount >= MAX_SENTENCES_PER_SLIDE);

    if (shouldFlush) {
      slides.push(buffer.trim());
      buffer = sentence;
      sentenceCount = 1;
      continue;
    }

    buffer = candidate;
    sentenceCount += 1;
  }

  if (buffer.trim()) {
    slides.push(buffer.trim());
  }

  return slides;
}

export function parseMapStoryContentToSlides(content: string): ParsedSlide[] {
  const paragraphs = splitTextToParagraphs(content.trim());
  const collectedSlides: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length <= MAX_SLIDE_LENGTH) {
      collectedSlides.push(paragraph);
      continue;
    }

    const sentences = splitParagraphToSentences(paragraph);
    if (sentences.length <= 1) {
      collectedSlides.push(paragraph);
      continue;
    }

    collectedSlides.push(...chunkSentences(sentences));
  }

  return collectedSlides
    .map((text, index) => ({
      text: text.trim(),
      slideOrder: index,
    }))
    .filter((slide) => slide.text.length > 0);
}
