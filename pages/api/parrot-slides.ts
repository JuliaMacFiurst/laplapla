import { GoogleGenAI, Modality } from '@google/genai';
import type { NextApiRequest, NextApiResponse } from 'next';
import { GEMINI_MODEL_NAME } from '../../constants';
import { prompts } from '@/utils/prompts';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

async function fetchGifFromGiphy(query: string, used: Set<string>): Promise<string | null> {
  const offset = Math.floor(Math.random() * 50);
  const searchParams = new URLSearchParams({
    api_key: process.env.GIPHY_API_KEY || '',
    q: query,
    limit: '10',
    offset: offset.toString(),
    rating: 'g',
  });

  const response = await fetch(`https://api.giphy.com/v1/gifs/search?${searchParams.toString()}`);
  const json = await response.json();

  const gifs = json?.data
    ?.map((g: any) => g.images?.original?.url)
    .filter((url: string) => !!url && !used.has(url));

  if (gifs?.length) {
    const chosen = gifs[Math.floor(Math.random() * gifs.length)];
    used.add(chosen);
    return chosen;
  }

  return null;
}

async function fetchVideoFromPexels(query: string): Promise<string | null> {
  const searchParams = new URLSearchParams({
    query,
    per_page: '10',
    orientation: 'portrait',
    size: 'medium',
    min_duration: '3',
    max_duration: '15',
  });

  const response = await fetch(`https://api.pexels.com/videos/search?${searchParams.toString()}`, {
    headers: {
      Authorization: process.env.PEXELS_API_KEY || '',
    },
  });

  const json = await response.json();

  const videos = json?.videos
    ?.filter((v: any) => v?.video_files?.length)
    .map((v: any) =>
      v.video_files.find((f: any) =>
        f.quality === 'sd' && f.width <= 1080 && f.height <= 1920 && f.file_type === 'video/mp4'
      )?.link
    )
    .filter(Boolean);

  if (videos?.length) {
    return videos[Math.floor(Math.random() * videos.length)];
  }

  return null;
}

function extractKeywords(text: string): string {
  return text
    .replace(/[^\w\s]/gi, '')
    .split(' ')
    .filter(w => w.length > 3)
    .slice(0, 3)
    .join(' ') + ' parrot';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET allowed' });
  }

  const style = req.query.style;
  const langParam = req.query.lang;
  const lang = langParam === 'ru' ? 'Russian' : 'English';
  if (!style || typeof style !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid style' });
  }

  const prompt = prompts.parrot.musicStyle(style, lang);

  try {
    const chat = ai.chats.create({
      model: GEMINI_MODEL_NAME,
      config: {
        responseModalities: [Modality.TEXT],
      },
      history: [],
    });

    const result = await chat.sendMessage({
      message: prompt,
    });

    const slides = [];
    const usedGifs: Set<string> = new Set();
    const usedMedia: Set<string> = new Set();

    const parts = result.candidates?.[0]?.content?.parts ?? [];

    for (const part of parts) {
      if ('text' in part && typeof part.text === 'string') {
        const sentences = part.text
          .replace(/\*\*.*?\*\*/g, '')
          .replace(/Слайд\s*\d+:?/gi, '')
          .match(/[^.!?]+[.!?]+/g) || [];

        const trimmedSentences = sentences
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0 && s.length <= 140);

        for (const sentence of trimmedSentences) {
          if (sentence.startsWith('[Image:') || sentence.startsWith('![')) continue;

          const isEven = slides.length % 2 === 0;
          let imageToUse = '';

          const keywords = extractKeywords(sentence);
          if (isEven) {
            const video = await fetchVideoFromPexels(keywords);
            imageToUse = video || await fetchGifFromGiphy(keywords, usedGifs) || '';
          } else {
            imageToUse = await fetchGifFromGiphy(keywords, usedGifs) || await fetchVideoFromPexels(keywords) || '';
          }

          if (!imageToUse || usedMedia.has(imageToUse)) continue;
          usedMedia.add(imageToUse);

          slides.push({
            text: sentence,
            image: imageToUse,
          });
        }
      }
    }

    if (slides.length === 0) {
      const fallbackImage = await fetchGifFromGiphy('funny parrot', usedGifs);
      slides.push({
        text: 'Что-то пошло не так. Попугайчик пока молчит...',
        image: fallbackImage || '',
      });
    }

    res.status(200).json({ slides, prompt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI generation failed' });
  }
}