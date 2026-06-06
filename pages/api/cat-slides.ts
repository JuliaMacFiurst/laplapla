import type { NextApiRequest, NextApiResponse } from 'next';
import { loadCombinedCatPresets } from "@/lib/server/catPresets";
import { searchUnifiedMemes } from "@/lib/server/memes/search";
import type { UnifiedMemeProvider, UnifiedMemeMediaType } from "@/lib/server/memes/types";
import { withApiHandler } from "@/utils/apiHandler";
import { devLog } from "@/utils/devLog";
import { buildShortSlideMediaQuery, mapWithConcurrency } from "@/lib/media/slideMedia";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "24kb",
    },
  },
};

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

const CAT_PRIMARY_VIDEO_PROVIDERS: UnifiedMemeProvider[] = ["pexels", "pixabay"];
const CAT_MIXED_PROVIDERS: UnifiedMemeProvider[] = ["pixabay", "reddit", "imgflip", "giphy", "pexels", "laplapla"];
const CAT_MIXED_TYPES: UnifiedMemeMediaType[] = ["image", "gif", "mp4", "webm", "sticker"];
const CAT_TEST_PROVIDERS: UnifiedMemeProvider[] = ["pixabay", "reddit", "giphy", "pexels"];

function getProviderTypes(provider: UnifiedMemeProvider): UnifiedMemeMediaType[] {
  if (provider === "imgflip") return ["image"];
  if (provider === "pixabay") return ["mp4", "webm", "image"];
  if (provider === "reddit") return ["gif", "mp4", "webm", "image"];
  if (provider === "giphy") return ["gif", "mp4", "webm"];
  if (provider === "laplapla") return ["sticker", "image", "gif", "mp4", "webm"];
  return ["mp4", "webm", "image"];
}

function getCatProviderQueries(provider: UnifiedMemeProvider, query: string) {
  const fallbackQueries =
    provider === "imgflip"
      ? []
      : provider === "reddit"
        ? ["cat", "funny cat", "cute cat"]
        : ["cat", "cute cat", "funny cat"];

  return Array.from(new Set([query, ...fallbackQueries]));
}

async function fetchCatMediaFromUnified(params: {
  query: string;
  lang: "ru" | "en" | "he";
  providers: UnifiedMemeProvider[];
  types: UnifiedMemeMediaType[];
  used: Set<string>;
  usedIds: Set<string>;
  offset?: number;
}) {
  devLog("🌀 Unified media search:", {
    query: params.query,
    providers: params.providers,
    types: params.types,
  });

  const response = await searchUnifiedMemes({
    query: params.query,
    lang: params.lang,
    limit: 10,
    offset: params.offset ?? Math.floor(Math.random() * 20),
    providers: params.providers,
    types: params.types,
    persist: false,
  });

  const candidates = response.items.filter(
    (item) => !params.used.has(item.media_url) && !params.usedIds.has(`${item.provider}:${item.providerId}`),
  );
  devLog("🌀 Unified media candidates:", {
    total: response.items.length,
    unused: candidates.length,
    providers: Array.from(new Set(response.items.map((item) => item.provider))),
    cached: response.cached,
  });

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  if (!chosen) return null;
  params.usedIds.add(`${chosen.provider}:${chosen.providerId}`);

  devLog("🌀 Unified media chosen:", {
    provider: chosen.provider,
    type: chosen.type,
    cached: response.cached,
    url: chosen.media_url,
  });
  return chosen.media_url;
}

async function fetchCatMediaFromProvider(params: {
  provider: UnifiedMemeProvider;
  query: string;
  lang: "ru" | "en" | "he";
  used: Set<string>;
  usedIds: Set<string>;
}) {
  for (const query of getCatProviderQueries(params.provider, params.query)) {
    const media = await fetchCatMediaFromUnified({
      query,
      lang: params.lang,
      providers: [params.provider],
      types: getProviderTypes(params.provider),
      used: params.used,
      usedIds: params.usedIds,
      offset: params.provider === "imgflip" ? 0 : Math.floor(Math.random() * 5),
    });
    if (media) return media;
  }

  return null;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  devLog("🐱 /api/cat-slides called");
  devLog("📥 body:", req.body);

  const { presetId } = req.body;
  let { prompt, lang } = req.body;
  const requestLang =
    lang === "ru" || lang === "en" || lang === "he" ? lang : "ru";
  lang = requestLang;
  const presetsForLang = await loadCombinedCatPresets(requestLang);

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    devLog("🎲 No prompt provided, selecting random text preset");
    const textPresetsForLang = presetsForLang.filter((preset) => preset.kind === "text");

    if (!textPresetsForLang.length) {
      return res.status(200).json({ slides: [], prompt: "" });
    }

    const randomPreset =
      textPresetsForLang[Math.floor(Math.random() * textPresetsForLang.length)];

    prompt = randomPreset.prompt;
    devLog("🎯 Random preset chosen:", randomPreset.prompt, randomPreset.lang);
  }

  const normalizedPresetId =
    typeof presetId === "string" && presetId.trim() ? presetId.trim() : null;

  const preset = normalizedPresetId
    ? presetsForLang.find((item) => item.id === normalizedPresetId)
    : presetsForLang.find(
        (item) => item.prompt === prompt && item.lang === lang
      );

  devLog("🔍 preset found:", Boolean(preset));
  devLog("🔍 preset kind:", preset?.kind);

  type SourceSlide = {
    text: string;
    mediaUrl?: string;
  };

  const sourceSlides: SourceSlide[] = !preset
    ? []
    : preset.kind === "full"
      ? preset.slides.map((s) => ({
          text: s.text.replace(/<[^>]*>/g, '').trim(),
          mediaUrl: s.mediaUrl,
        }))
      : preset.texts.map((text) => ({ text }));

  devLog("🧩 sourceSlides length:", sourceSlides.length);
  devLog("🧩 sourceSlides preview:", sourceSlides.slice(0, 2));

  const slides: Array<{ text: string; image: string }> = [];
  const usedMedia: Set<string> = new Set();
  const usedMediaIds: Set<string> = new Set();

  const resolvedSlides = await mapWithConcurrency(sourceSlides, 4, async (slide, sourceIndex) => {
    const text = slide.text;
    let image = slide.mediaUrl || '';

    devLog("🖼 Slide text:", text);
    devLog("🖼 Has predefined media:", Boolean(slide.mediaUrl));

    const isEven = sourceIndex % 2 === 0;
    const slideIndex = sourceIndex;
    const testProvider = CAT_TEST_PROVIDERS[slideIndex % CAT_TEST_PROVIDERS.length];
    const query = buildShortSlideMediaQuery("cat", text);

    if (!image) {
      image = (await fetchCatMediaFromProvider({
        provider: testProvider,
        query,
        lang,
        used: usedMedia,
        usedIds: usedMediaIds,
      })) || "";

      if (!image && isEven) {
        image =
          (await fetchCatMediaFromUnified({
            query,
            lang,
            providers: CAT_PRIMARY_VIDEO_PROVIDERS,
            types: ["mp4", "webm"],
            used: usedMedia,
            usedIds: usedMediaIds,
          })) ||
          (await fetchCatMediaFromUnified({
            query,
            lang,
            providers: ["giphy"],
            types: ["gif", "mp4", "webm"],
            used: usedMedia,
            usedIds: usedMediaIds,
          })) ||
          (await fetchCatMediaFromUnified({
            query,
            lang,
            providers: CAT_MIXED_PROVIDERS,
            types: CAT_MIXED_TYPES,
            used: usedMedia,
            usedIds: usedMediaIds,
          })) ||
          '';
      } else if (!image) {
        image =
          (await fetchCatMediaFromUnified({
            query,
            lang,
            providers: ["giphy"],
            types: ["gif", "mp4", "webm"],
            used: usedMedia,
            usedIds: usedMediaIds,
          })) ||
          (await fetchCatMediaFromUnified({
            query,
            lang,
            providers: CAT_MIXED_PROVIDERS,
            types: CAT_MIXED_TYPES,
            used: usedMedia,
            usedIds: usedMediaIds,
          })) ||
          (await fetchCatMediaFromUnified({
            query,
            lang,
            providers: CAT_PRIMARY_VIDEO_PROVIDERS,
            types: ["mp4", "webm"],
            used: usedMedia,
            usedIds: usedMediaIds,
          })) ||
          '';
      }
    }

    if (!image || usedMedia.has(image)) {
      image = (await fetchCatMediaFromUnified({
        query: "cute cat",
        lang,
        providers: CAT_MIXED_PROVIDERS,
        types: CAT_MIXED_TYPES,
        used: usedMedia,
        usedIds: usedMediaIds,
      })) || '';
    }

    if (!image || usedMedia.has(image)) {
      image = "/images/cat.webp";
    }

    usedMedia.add(image);
    return {
      text,
      image,
    };
  });
  slides.push(...resolvedSlides);

  devLog("✅ Slides ready:", slides.length);
  return res.status(200).json({ slides, prompt });
}

export default withApiHandler(
  {
    guard: {
      methods: ["POST"],
      limit: 20,
      maxBodyBytes: 24 * 1024,
      keyPrefix: "cat-slides",
    },
  },
  handler,
);
