import { GoogleGenAI, Modality } from '@google/genai';
import type { NextApiRequest, NextApiResponse } from 'next';
import { GEMINI_MODEL_NAME } from '../../constants';
import { prompts } from '@/utils/prompts'

if (!process.env.GIPHY_API_KEY) {
  throw new Error("GIPHY_API_KEY is not set in environment variables.");
}

const apiKey = process.env.GIPHY_API_KEY;
const pexelsKey = process.env.PEXELS_API_KEY;
console.log('🔑 PEXELS_API_KEY is', Boolean(pexelsKey));

const predefinedQuestions = [
  "Что такое дружба?",
  "Зачем человеку мечты?",
  "Почему иногда хочется плакать?",
  "Как понять, что ты счастлив?",
  "Что значит быть взрослым?",
  "Почему мы скучаем?",
  "Как отличить добро от зла?",
  "Почему важно прощать?",
  "Можно ли быть умным и добрым одновременно?",
  "Что такое интуиция?",
  "Почему звезды мерцают?",
  "Как рождаются звезды?",
  "Что такое Млечный Путь?",
  "Есть ли жизнь на других планетах?",
  "Почему Луна меняет форму?",
  "Как работает телескоп?",
  "Что находится внутри кометы?",
  "Почему космос такой тёмный?",
  "Что такое гравитация?",
  "Почему Земля круглая?",
  "Почему лёд плавает?",
  "Как работает электричество?",
  "Почему молния сверкает?",
  "Что такое звук?",
  "Почему вода кипит?",
  "Почему радуга цветная?",
  "Как работает магнит?",
  "Почему огонь горячий?",
  "Что такое атом?",
  "Почему мыло смывает грязь?",
  "Почему листья зелёные?",
  "Зачем улитке раковина?",
  "Почему пчёлы жужжат?",
  "Как черепаха прячется в панцирь?",
  "Почему рыбы не тонут?",
  "Как дышит кит?",
  "Почему у жирафа длинная шея?",
  "Что делает муравей весь день?",
  "Почему кошки боятся воды?",
  "Как работает мозг?",
  "Как работает телефон?",
  "Почему самолёт летает?",
  "Что такое интернет?",
  "Как устроена ракета?",
  "Почему компьютер может думать?",
  "Как работает батарейка?",
  "Что внутри часов?",
  "Как работает робот-пылесос?",
  "Зачем нужен спутник?",
  "Как работает светофор?",
  "Почему 2 + 2 = 4?",
  "Что такое бесконечность?",
  "Зачем нужны числа?",
  "Почему нельзя делить на ноль?",
  "Как считать быстрее?",
  "Что такое вероятность?",
  "Почему круг круглый?",
  "Как придумали геометрию?",
  "Зачем нужны дроби?",
  "Как работает шифр?",
  "Почему меняются времена года?",
  "Как образуются горы?",
  "Что такое вулкан?",
  "Зачем нужны океаны?",
  "Почему бывает землетрясение?",
  "Откуда берутся облака?",
  "Почему идёт дождь?",
  "Как люди научились плавать?",
  "Почему у людей разные языки?",
  "Зачем нужны праздники?",
  "Зачем люди рисуют?",
  "Почему музыка вызывает эмоции?",
  "Что делает художник?",
  "Как сочиняют сказки?",
  "Почему люди танцуют?",
  "Что такое театр?",
  "Почему картина может быть дорогой?",
  "Зачем учат стихи наизусть?",
  "Как устроен мультик?",
  "Почему важно читать книги?",
  "Почему зебра полосатая?",
  "Как устроен пузырь?",
  "Почему мы щекотливы?",
  "Что делает кактус в пустыне?",
  "Почему у крокодила зубы снаружи?",
  "Как летают бабочки?",
  "Почему улитка медленная?",
  "Что такое мираж?",
  "Зачем коты гоняются за лазером?",
  "Почему киты поют?",
  "Почему важно быть собой?",
  "Как понять другого человека?",
  "Что такое эмпатия?",
  "Почему мы ошибаемся?",
  "Как стать храбрым?",
  "Почему важно говорить “спасибо”?",
  "Как подружиться с кем-то?",
  "Зачем делиться?",
  "Что значит заботиться?",
  "Почему иногда хочется побыть одному?"
];

function getRandomPredefinedQuestion(): string {
  const index = Math.floor(Math.random() * predefinedQuestions.length);
  return predefinedQuestions[index];
}


async function fetchGifFromGiphy(query: string, used: Set<string>): Promise<string | null> {
  const offset = Math.floor(Math.random() * 50); // 🔁 Случайное смещение
  const searchParams = new URLSearchParams({
    api_key: apiKey || '',
    q: query,
    limit: '10',
    offset: offset.toString(),
    rating: 'g',
  });

  const response = await fetch(`https://api.giphy.com/v1/gifs/search?${searchParams.toString()}`);
  const json = await response.json();

  const gifs = json?.data
    ?.map((g: any) => g.images?.original?.url)
    .filter((url: string) => !!url && !used.has(url)); // Исключаем повторы

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
    max_duration: '15'
  });

  const response = await fetch(`https://api.pexels.com/videos/search?${searchParams.toString()}`, {
    headers: {
      Authorization: pexelsKey || '',
    },
  });

  const json = await response.json();
  console.log('📦 Pexels response JSON:', JSON.stringify(json, null, 2));

  const videos = json?.videos
    ?.filter((v: any) => v?.video_files?.length)
    .map((v: any) =>
      v.video_files.find((f: any) =>
        f.quality === 'sd' && f.width <= 1080 && f.height <= 1920 && f.file_type === 'video/mp4'
      )?.link
    )
    .filter(Boolean);

  if (videos?.length) {
    console.log('🎞 Available videos:', videos);
    return videos[Math.floor(Math.random() * videos.length)];
  }

  console.log('❌ No suitable Pexels videos found for query:', query);
  return null;
}

function extractKeywords(text: string): string {
  const words = text.split(/\s+/).filter(w => w.length > 3 && /^[а-яА-Яa-zA-Z]+$/.test(w));
  const keywords = words.slice(0, 2).join(' ');
  return keywords ? `${keywords} cat` : 'cute cat';
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  let { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    prompt = getRandomPredefinedQuestion();
  }

  try {
    const chat = ai.chats.create({
      model: GEMINI_MODEL_NAME,
      config: {
        responseModalities: [Modality.TEXT],
      },
      history: [],
    });

    const result = await chat.sendMessage({
      message: `${prompt}\n${prompts.cat.explain}`,
    });
    console.log('📬 Raw Gemini response text:', JSON.stringify(result, null, 2));
    console.log('📨 Gemini response parts:', JSON.stringify(result.candidates?.[0]?.content?.parts, null, 2));

    const slides = [];
    const usedGifs: Set<string> = new Set();
    const usedMedia: Set<string> = new Set();
    // let pexelsVideoUsed = false;

    const parts = result.candidates?.[0]?.content?.parts ?? [];
    console.log('📩 Gemini full result:', JSON.stringify(result, null, 2));

    if (parts.length === 0) {
      console.warn('⚠️ Gemini вернул пустой ответ. Добавляем fallback-слайд.');
      const fallbackImage = await fetchGifFromGiphy('cat question', usedGifs);
      slides.push({
        text: prompt.endsWith('?') ? prompt : prompt + '?',
        image: fallbackImage || ''
      });
      return res.status(200).json({ slides, prompt });
    }

    for (const part of parts) {
      if ('text' in part && typeof part.text === 'string') {
        const sentences = part.text
          .replace(/\*\*.*?\*\*/g, '') // Удаляем жирные заголовки вроде **Слайд 3:**
          .replace(/Слайд\s*\d+:?/gi, '') // Удаляем явные упоминания слайдов
          .match(/[^.!?]+[.!?]+/g) || []; // Разбиваем по предложениям

        const trimmedSentences = sentences
          .map(s => s.trim())
          .filter(s => s.length > 0 && s.length <= 120);

        for (const sentence of trimmedSentences) {
          if (
            sentence.startsWith('[Image:') ||
            sentence.startsWith('![Image') || // удаляем строки с alt-подписями от Markdown
            sentence.startsWith('![')
          ) {
            console.log('🖼️ Skipping Markdown image line:', sentence);
            continue;
          }

          const isEven = slides.length % 2 === 0;
          let imageToUse = '';

          if (isEven) {
            const video = await fetchVideoFromPexels(extractKeywords(sentence));
            imageToUse = video || await fetchGifFromGiphy(extractKeywords(sentence), usedGifs) || '';
          } else {
            imageToUse = await fetchGifFromGiphy(extractKeywords(sentence), usedGifs) || await fetchVideoFromPexels(extractKeywords(sentence)) || '';
          }

          if (!imageToUse || usedMedia.has(imageToUse)) {
            imageToUse = await fetchGifFromGiphy('thinking cat', usedGifs) || '';
          }

          if (!imageToUse || usedMedia.has(imageToUse)) {
            continue;
          }

          usedMedia.add(imageToUse);

          slides.push({
            text: sentence,
            image: imageToUse
          });
        }
      }
    }

    res.status(200).json({ slides, prompt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI generation failed' });
  }
}