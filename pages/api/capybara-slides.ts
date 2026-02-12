import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_NAME } from '../../constants';
import { fallbackImages } from '../../constants';
import type { GeminiBookStory, LoadStoryOptions } from '../../types/types';
import { PREDEFINED_CHILDRENS_BOOKS } from '../../data/predefinedBooks';
import { prompts } from '@/utils/prompts'

const normalizeMediaSlide = (slide: any): any => {
  const fallback = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];

  if (slide.type === 'video' && (!slide.videoUrl || slide.videoUrl === '')) {
    return {
      type: 'image',
      capybaraImage: fallback,
      text: slide.text,
    };
  }

  if (slide.type === 'image' && !slide.capybaraImage) {
    return {
      type: 'image',
      capybaraImage: fallback,
      text: slide.text,
    };
  }

  if (slide.type === 'gif' && !slide.gifUrl) {
    return {
      type: 'image',
      capybaraImage: fallback,
      text: slide.text,
    };
  }

  return slide;
};

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("API_KEY for Gemini is not set in environment variables.");
}

const ai: GoogleGenAI = new GoogleGenAI({ apiKey: API_KEY || "DUMMY_KEY_FOR_COMPILATION" });

const getRandomElement = <T,>(arr: T[]): T | undefined => {
  if (!arr || arr.length === 0) {
    return undefined;
  }
  return arr[Math.floor(Math.random() * arr.length)];
};

const fetchSingleBookStory = async (options?: LoadStoryOptions): Promise<GeminiBookStory> => {
  if (!API_KEY) {
    console.error("Cannot fetch story: API_KEY is not configured.");
    throw new Error("Ключ API для Gemini не настроен. Капибары не могут получить доступ к библиотеке сказок!");
  }
  // Ваша переменная `ai` уже объявлена глобально в этом файле
  // const ai: GoogleGenAI = new GoogleGenAI({ apiKey: API_KEY || "DUMMY_KEY_FOR_COMPILATION" });

  try {
    let prompt: string;
    let temperature = 0.75;

    if (options?.inventStory) {
      prompt = prompts.capybara.invented;
      temperature = 0.85;
    } else if (options?.generateForRandomChildrensBook) {
      const randomBookFromList = getRandomElement(PREDEFINED_CHILDRENS_BOOKS);
      if (!randomBookFromList || PREDEFINED_CHILDRENS_BOOKS.length === 0) {
        console.warn("PREDEFINED_CHILDRENS_BOOKS is empty, inventing a generic story instead.");
        prompt = prompts.capybara.invented;
        temperature = 0.85;
      } else {
        prompt = prompts.capybara.specific(randomBookFromList);
        temperature = 0.8;
      }
    } else if (options?.bookTitle) {
      prompt = prompts.capybara.specific(options.bookTitle);
      temperature = 0.6;
    } else {
      prompt = prompts.capybara.random;
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: temperature,
      },
    });
    console.log("Gemini raw response:", response.text);

    let jsonStr = (response.text ?? "").trim();
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }
    
    const parsedData = JSON.parse(jsonStr) as GeminiBookStory;

    if (!parsedData || typeof parsedData.title !== 'string' || typeof parsedData.summary !== 'string') {
        console.error("Получены неверные данные от Gemini:", parsedData);
        throw new Error("Формат ответа от Gemini не соответствует ожиданиям для сюжета книги.");
    }
    
    return parsedData;

  } catch (error) {
    console.error("Ошибка при получении сюжета от Gemini:", error);
    if (error instanceof Error) {
      if (error.message.startsWith("Ключ API")) {
        throw error;
      }
      throw new Error(`Не удалось загрузить историю: ${error.message}`);
    }
    throw new Error("Произошла неизвестная ошибка при загрузке истории.");
  }
};

const fetchCapybaraVideos = async (): Promise<{ type: 'video'; videoUrl: string; preview: string }[]> => {
  try {
    const pexelsResponse = await axios.get('https://api.pexels.com/videos/search', {
      headers: {
        Authorization: process.env.PEXELS_API_KEY || '',
      },
      params: {
        query: 'capybara',
        per_page: 30,
        page: 1,
      },
    });

    const data = pexelsResponse.data as { videos: any[] };

    const shuffle = <T,>(array: T[]): T[] => {
      return array
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
    };

    const shuffled = shuffle(data.videos || []).slice(0, 5);

    return shuffled.map((video: any) => ({
      type: 'video',
      videoUrl: video.video_files.find((f: any) => f.quality === 'sd' || f.quality === 'hd')?.link || '',
      preview: video.image,
    }));
  } catch (error) {
    console.error('Ошибка загрузки видео с капибарами:', error);
    return [];
  }
};

const fetchCapybaraImages = async (): Promise<{ type: 'image'; capybaraImage: string }[]> => {
  try {
    const pexelsResponse = await axios.get('https://api.pexels.com/v1/search', {
      headers: {
        Authorization: process.env.PEXELS_API_KEY || '',
      },
      params: {
        query: 'capybara',
        per_page: 80,
        page: 1,
      },
    });

    const data = pexelsResponse.data as unknown as { photos: any[] };
    if (!data || !Array.isArray(data.photos)) {
      console.warn('Pexels: data.photos отсутствует или не массив');
      return [];
    }

    const shuffle = <T,>(array: T[]): T[] => {
      return array
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
    };

    const shuffled = shuffle(data.photos || []).slice(0, 5);
    if (!shuffled.length) {
      console.warn('Pexels: data.photos пустой после shuffle');
    }

    // Удаляем элементы без capybaraImage (src.large или src.medium)
    const slides = shuffled.map((photo: any) => {
      if (!photo?.src) {
        console.warn('Pexels: фото без src', photo);
        return null;
      }
      return {
        type: 'image',
        capybaraImage: photo.src.large || photo.src.medium || '',
      };
    }).filter(Boolean) as { type: 'image'; capybaraImage: string }[];

    // Фильтруем слайды, у которых capybaraImage есть
    const validSlides = slides.filter(slide => slide.capybaraImage);

    return validSlides;
  } catch (error) {
    console.error('Ошибка загрузки изображений с капибарами:', error);
    return [];
  }
};

const fetchCapybaraGifs = async (): Promise<{ type: 'gif'; gifUrl: string }[]> => {
  try {
    const response = await axios.get('https://api.giphy.com/v1/gifs/search', {
      params: {
        api_key: process.env.GIPHY_API_KEY || '',
        q: 'capybara',
        limit: 150,
        rating: 'g',
      },
    });

    const data = response.data as { data: any[] };
    if (!Array.isArray(data.data)) {
      console.warn('Giphy: ответ не содержит массива данных');
      return [];
    }

    const gifs = data.data.map((gif: any): { type: 'gif'; gifUrl: string } | null => {
      const url = gif.images?.downsized_medium?.url || '';
      if (!url) return null;
      return {
        type: 'gif',
        gifUrl: url,
      };
    }).filter(Boolean) as { type: 'gif'; gifUrl: string }[];

    // Фильтруем гифы с валидным gifUrl
    const validGifs = gifs.filter(gif => gif.gifUrl);

    return validGifs;
  } catch (error) {
    console.error('Ошибка загрузки гифок с Giphy:', error);
    return [];
  }
};

export { fetchSingleBookStory, fetchCapybaraVideos, fetchCapybaraImages, fetchCapybaraGifs };

// Временный API-обработчик для проверки загрузки видео и изображений с капибарами

export default async function handler(_: NextApiRequest, res: NextApiResponse) {
  const videos = await fetchCapybaraVideos();
  const images = await fetchCapybaraImages();
  const gifs = await fetchCapybaraGifs();

  // Фильтруем слайды по валидности полей capybaraImage или gifUrl
  const validImages = images.filter(
    (slide) => slide.type === 'image' && slide.capybaraImage
  );
  const validGifs = gifs.filter(
    (slide) => slide.type === 'gif' && slide.gifUrl
  );

  // Fallback slides (make sure /public/images/fallback1.jpg, fallback2.jpg, fallback3.jpg exist)
  const fallbackSlides = [
    {
      type: 'image',
      capybaraImage: '/images/fallback1.jpg',
    },
    {
      type: 'image',
      capybaraImage: '/images/fallback2.jpg',
    },
    {
      type: 'image',
      capybaraImage: '/images/fallback3.jpg',
    },
  ];

  const ensureAtLeastOne = (arr: any[], type: string) => {
    if (!arr.length) {
      const fallback = fallbackSlides[Math.floor(Math.random() * fallbackSlides.length)];
      return [{ ...fallback, type }];
    }
    return arr;
  };

  const safeVideos = ensureAtLeastOne(videos, 'video');
  const safeImages = ensureAtLeastOne(validImages, 'image');
  const safeGifs = ensureAtLeastOne(validGifs, 'gif');

  const combinedRaw = [...safeVideos, ...safeImages, ...safeGifs];
  const normalizedSlides = combinedRaw.map(normalizeMediaSlide).filter(slide => {
    if (slide.type === 'video') {
      return !!slide.videoUrl;
    }
    return true;
  });
  const combined = normalizedSlides
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
  res.status(200).json(combined);
}