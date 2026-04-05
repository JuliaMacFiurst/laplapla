import type { NextApiRequest, NextApiResponse } from 'next';
import { CAT_PRESETS, CAT_TEXT_PRESETS } from "../../content/cats";
import { fetchVideoFromPexels } from "@/lib/pexelsVideo";
import { applyApiGuard } from "@/utils/rateLimit";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "24kb",
    },
  },
};

if (!process.env.GIPHY_API_KEY) {
  throw new Error("GIPHY_API_KEY is not set in environment variables.");
}

const apiKey = process.env.GIPHY_API_KEY;

// TODO: Future cat questions (not implemented yet)
// This list is kept only as a reference and must NOT be used in runtime.
// Questions should be added as text presets and later moved to Supabase.
/*
Что такое дружба?
Зачем человеку мечты?
Почему иногда хочется плакать?
Как понять, что ты счастлив?
Что значит быть взрослым?
Почему мы скучаем?
Как отличить добро от зла?
Почему важно прощать?
Можно ли быть умным и добрым одновременно?
Что такое интуиция?
Почему звезды мерцают?
Как рождаются звезды?
Что такое Млечный Путь?
Есть ли жизнь на других планетах?
Почему Луна меняет форму?
Как работает телескоп?
Что находится внутри кометы?
Почему космос такой тёмный?
Что такое гравитация?
Почему Земля круглая?
Почему лёд плавает?
Как работает электричество?
Почему молния сверкает?
Что такое звук?
Почему вода кипит?
Почему радуга цветная?
Как работает магнит?
Почему огонь горячий?
Что такое атом?
Почему мыло смывает грязь?
Почему листья зелёные?
Зачем улитке раковина?
Почему пчёлы жужжат?
Как черепаха прячется в панцирь?
Почему рыбы не тонут?
Как дышит кит?
Почему у жирафа длинная шея?
Что делает муравей весь день?
Почему кошки боятся воды?
Как работает мозг?
Как работает телефон?
Почему самолёт летает?
Что такое интернет?
Как устроена ракета?
Почему компьютер может думать?
Как работает батарейка?
Что внутри часов?
Как работает робот-пылесос?
Зачем нужен спутник?
Как работает светофор?
Почему 2 + 2 = 4?
Что такое бесконечность?
Зачем нужны числа?
Почему нельзя делить на ноль?
Как считать быстрее?
Что такое вероятность?
Почему круг круглый?
Как придумали геометрию?
Зачем нужны дроби?
Как работает шифр?
Почему меняются времена года?
Как образуются горы?
Что такое вулкан?
Зачем нужны океаны?
Почему бывает землетрясение?
Откуда берутся облака?
Почему идёт дождь?
Как люди научились плавать?
Почему у людей разные языки?
Зачем нужны праздники?
Зачем люди рисуют?
Почему музыка вызывает эмоции?
Как художник рисует портреты?
Как сочиняют сказки?
Почему люди танцуют?
Что такое театр?
Почему картина может быть дорогой?
Зачем учат стихи наизусть?
Как устроен мультик?
Почему важно читать книги?
Почему зебра полосатая?
Как устроен пузырь?
Почему мы боимся щекотки?
Что делает кактус в пустыне?
Почему у крокодила зубы снаружи?
Как летают бабочки?
Почему улитка медленная?
Что такое мираж?
Зачем коты гоняются за лазером?
Почему киты поют?
Почему важно быть собой?
Как понять другого человека?
Что такое эмпатия?
Почему мы ошибаемся?
Как стать храбрым?
Почему важно говорить “спасибо”?
Как подружиться с кем-то?
Зачем делиться?
Что значит заботиться?
Почему иногда хочется побыть одному?
Как научиться прощать?
Почему важно слушать других?
Зачем ходить в школу?
*/

async function fetchGifFromGiphy(query: string, used: Set<string>): Promise<string | null> {
  console.log("🌀 GIPHY search:", query);
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
    console.log("🌀 GIPHY chosen:", chosen);
    used.add(chosen);
    return chosen;
  }

  return null;
}

function extractKeywords(text: string): string {
  const words = text.split(/\s+/).filter(w => w.length > 3 && /^[а-яА-Яa-zA-Z]+$/.test(w));
  const keywords = words.slice(0, 2).join(' ');
  return keywords ? `${keywords} cat` : 'cute cat';
}

function getSlidePresetByPrompt(prompt: string) {
  return CAT_PRESETS.find((p) => p.prompt === prompt);
}

function getTextPresetByPrompt(prompt: string, lang: string) {
  return CAT_TEXT_PRESETS.find(
    (p) => p.prompt === prompt && p.lang === lang
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("🐱 /api/cat-slides called");
  console.log("📥 body:", req.body);

  if (!applyApiGuard(req, res, {
    methods: ["POST"],
    limit: 20,
    maxBodyBytes: 24 * 1024,
    keyPrefix: "cat-slides",
  })) {
    return;
  }

  let { prompt, lang } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    console.log("🎲 No prompt provided, selecting random text preset");
    const presetsForLang = CAT_TEXT_PRESETS.filter(
      (p) => p.lang === lang
    );

    if (!presetsForLang.length) {
      return res.status(200).json({ slides: [], prompt: "" });
    }

    const randomPreset =
      presetsForLang[Math.floor(Math.random() * presetsForLang.length)];

    prompt = randomPreset.prompt;
    console.log("🎯 Random preset chosen:", randomPreset.prompt, randomPreset.lang);
  }

  const slidePreset = getSlidePresetByPrompt(prompt);
  const textPreset = getTextPresetByPrompt(prompt, lang);

  console.log("🔍 slidePreset found:", Boolean(slidePreset));
  console.log("🔍 textPreset found:", Boolean(textPreset));

  type SourceSlide = {
    text: string;
    mediaUrl?: string;
  };

  const sourceSlides: SourceSlide[] = slidePreset
    ? slidePreset.slides.map((s) => ({
        text: s.text.replace(/<[^>]*>/g, '').trim(),
        mediaUrl: s.mediaUrl,
      }))
    : textPreset
      ? textPreset.texts.map((text) => ({ text }))
      : [];

  console.log("🧩 sourceSlides length:", sourceSlides.length);
  console.log("🧩 sourceSlides preview:", sourceSlides.slice(0, 2));

  const slides = [];
  const usedGifs: Set<string> = new Set();
  const usedMedia: Set<string> = new Set();

  for (const slide of sourceSlides) {
    const text = slide.text;
    let image = slide.mediaUrl || '';

    console.log("🖼 Slide text:", text);
    console.log("🖼 Has predefined media:", Boolean(slide.mediaUrl));

    const isEven = slides.length % 2 === 0;

    if (!image) {
      if (isEven) {
        image =
          (await fetchVideoFromPexels(extractKeywords(text))) ||
          (await fetchGifFromGiphy(extractKeywords(text), usedGifs)) ||
          '';
      } else {
        image =
          (await fetchGifFromGiphy(extractKeywords(text), usedGifs)) ||
          (await fetchVideoFromPexels(extractKeywords(text))) ||
          '';
      }
    }

    if (!image || usedMedia.has(image)) {
      image = (await fetchGifFromGiphy('cute cat', usedGifs)) || '';
    }

    if (!image || usedMedia.has(image)) continue;

    usedMedia.add(image);

    slides.push({
      text,
      image,
    });
  }

  console.log("✅ Slides ready:", slides.length);
  return res.status(200).json({ slides, prompt });
}
