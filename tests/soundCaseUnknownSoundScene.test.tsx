import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UnknownSoundScene } from "@/components/quests/sound-case-001/UnknownSoundScene";
import { dictionaries } from "@/i18n";
import { requireQuestAssetUrl } from "@/lib/shop/questAssets";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";
import {
  INITIAL_UNKNOWN_SOUND_SCENE_STATE,
  UNKNOWN_SOUND_GUESSES,
  getUnknownSoundProgress,
  parseUnknownSoundProgress,
  reduceUnknownSoundScene,
} from "@/lib/shop/quests/sound-case-001/unknownSoundScene";
import {
  UNKNOWN_SOUND_PROGRESS_STORAGE_KEY,
  loadUnknownSoundProgress,
  saveUnknownSoundProgress,
} from "@/lib/shop/quests/sound-case-001/unknownSoundProgressStorage";
import { UNKNOWN_SOUND_PUBLIC_PATH } from "@/pages/quests/sound-case-001/stage-01/unknown-sound";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const audioUrl = requireQuestAssetUrl(
  SOUND_CASE_001_ASSET_MANIFEST.assets["stage-1-unknown-recording"],
);
const parrotUrl = requireQuestAssetUrl(
  SOUND_CASE_001_ASSET_MANIFEST.assets["unknown-sound-digital-parrot"],
);
const backgroundUrl = requireQuestAssetUrl(
  SOUND_CASE_001_ASSET_MANIFEST.assets["unknown-sound-studio-background"],
);

describe("Sound Case #001 UNKNOWN SOUND digital scene", () => {
  it("owns the stable public route and uses the real typed media manifest", () => {
    expect(UNKNOWN_SOUND_PUBLIC_PATH).toBe(
      "/quests/sound-case-001/stage-01/unknown-sound",
    );
    expect(audioUrl).toBe(
      "https://media.laplapla.com/quests/sound-case-001/stage-01-sound-crocodile/unknown-sound/audio/unknown-sound-001-master.mp3",
    );
    expect(
      SOUND_CASE_001_ASSET_MANIFEST.assets["stage-1-unknown-recording"].kind,
    ).toBe("audio");
    expect(parrotUrl).toBe(
      "https://media.laplapla.com/quests/sound-case-001/stage-01-sound-crocodile/sound-cards/assets/stage-1-unknown-sound-parrot-2.webp",
    );
    expect(backgroundUrl).toBe(
      "https://media.laplapla.com/quests/sound-case-001/stage-01-sound-crocodile/sound-cards/backgrounds/stage-1-unknown-sound-sound-lab.webp",
    );
    expect(
      requireQuestAssetUrl(
        SOUND_CASE_001_ASSET_MANIFEST.assets["sound-lab-parrot"],
      ),
    ).toContain("stage-1-unknown-sound-parrot.webp");

    const routeSource = readFileSync(
      `${process.cwd()}/pages/quests/sound-case-001/stage-01/unknown-sound.tsx`,
      "utf8",
    );
    expect(routeSource).toContain("<UnknownSoundScene");
    expect(routeSource).toContain("requireQuestAssetUrl");
    expect(routeSource).not.toContain("unknown-sound-001-master.mp3");
  });

  it("renders the arrival without autoplay or guess choices", () => {
    const html = renderToStaticMarkup(
      createElement(UnknownSoundScene, {
        lang: "ru",
        audioUrl,
        parrotUrl,
        backgroundUrl,
      }),
    );

    expect(html).toContain('data-scene-phase="ready"');
    expect(html).toContain("Так. Тут нужна настоящая тишина.");
    expect(html).toContain("Прослушать запись");
    expect(html).toContain("<audio");
    expect(html).not.toContain("autoplay");
    for (const option of Object.values(
      dictionaries.ru.shop.soundCase.unknownSoundScene.guessOptions,
    )) {
      expect(html).not.toContain(option);
    }
  });

  it("uses explicit transitions and never reveals a clue before confirmation", () => {
    const beforeAudio = reduceUnknownSoundScene(
      INITIAL_UNKNOWN_SOUND_SCENE_STATE,
      { type: "clue-obtained" },
    );
    expect(beforeAudio).toEqual({ phase: "ready" });

    const guessing = reduceUnknownSoundScene(beforeAudio, {
      type: "audio-started",
    });
    expect(guessing).toEqual({ phase: "guessing" });
    expect(
      reduceUnknownSoundScene(guessing, { type: "guess-confirmed" }),
    ).toEqual(guessing);

    const selected = reduceUnknownSoundScene(guessing, {
      type: "guess-selected",
      guess: "machine",
    });
    const recorded = reduceUnknownSoundScene(selected, {
      type: "guess-confirmed",
    });
    expect(recorded).toEqual({
      phase: "guess-recorded",
      selectedGuess: "machine",
    });
    expect(reduceUnknownSoundScene(recorded, { type: "clue-obtained" })).toEqual({
      phase: "clue-obtained",
      selectedGuess: "machine",
    });
  });

  it("offers exactly five neutral theories with no correct/incorrect result", () => {
    expect(UNKNOWN_SOUND_GUESSES).toEqual([
      "animal",
      "machine",
      "instrument",
      "natural-phenomenon",
      "no-idea",
    ]);

    for (const lang of ["ru", "en", "he"] as const) {
      const text = dictionaries[lang].shop.soundCase.unknownSoundScene;
      expect(Object.keys(text.guessOptions)).toHaveLength(5);
      expect(JSON.stringify(text.guessOptions)).not.toMatch(
        /correct|incorrect|правильный ответ|неправильный ответ/i,
      );
    }
  });

  it("keeps semantic guess ids while giving every theory one shared emoji mapping", () => {
    const componentSource = readFileSync(
      `${process.cwd()}/components/quests/sound-case-001/UnknownSoundScene.tsx`,
      "utf8",
    );
    expect(componentSource).toContain("UNKNOWN_SOUND_GUESS_EMOJI");
    for (const emoji of ["🐾", "⚙️", "🎵", "🌿", "🤷"]) {
      expect(componentSource).toContain(emoji);
    }
    expect(componentSource).toContain("data-guess={guess}");
  });

  it("persists only confirmed progress and restores the clue deterministically", () => {
    const storage = new MemoryStorage();
    const guessing = reduceUnknownSoundScene(
      { phase: "guessing" },
      { type: "guess-selected", guess: "animal" },
    );
    expect(getUnknownSoundProgress(guessing)).toBeNull();

    const recorded = reduceUnknownSoundScene(guessing, {
      type: "guess-confirmed",
    });
    const recordedProgress = getUnknownSoundProgress(recorded);
    if (!recordedProgress) throw new Error("Expected recorded progress");
    expect(saveUnknownSoundProgress(storage, recordedProgress)).toBe(true);
    expect(storage.key(0)).toBe(UNKNOWN_SOUND_PROGRESS_STORAGE_KEY);
    expect(loadUnknownSoundProgress(storage)).toEqual({
      version: 1,
      selectedGuess: "animal",
      clueObtained: false,
    });

    const clue = reduceUnknownSoundScene(recorded, { type: "clue-obtained" });
    const clueProgress = getUnknownSoundProgress(clue);
    if (!clueProgress) throw new Error("Expected clue progress");
    saveUnknownSoundProgress(storage, clueProgress);
    expect(loadUnknownSoundProgress(storage)?.clueObtained).toBe(true);
    expect(
      reduceUnknownSoundScene(INITIAL_UNKNOWN_SOUND_SCENE_STATE, {
        type: "progress-restored",
        progress: clueProgress,
      }),
    ).toEqual({ phase: "clue-obtained", selectedGuess: "animal" });
  });

  it("rejects corrupt or unknown persisted records", () => {
    expect(parseUnknownSoundProgress(null)).toBeNull();
    expect(
      parseUnknownSoundProgress({
        version: 1,
        selectedGuess: "spoiler-answer",
        clueObtained: true,
      }),
    ).toBeNull();
    expect(
      parseUnknownSoundProgress({
        version: 2,
        selectedGuess: "animal",
        clueObtained: false,
      }),
    ).toBeNull();
  });

  it.each(["ru", "en", "he"] as const)(
    "has complete %s copy and keeps Hebrew RTL",
    (lang) => {
      const text = dictionaries[lang].shop.soundCase.unknownSoundScene;
      expect(text.arrivalLines).toHaveLength(5);
      expect(text.clueLines).toHaveLength(3);
      expect(text.parrotAfterClueLines).toHaveLength(5);
      expect(text.audioError).toBeTruthy();
      expect(text.retryAction).toBeTruthy();
      expect(text.finalTitle).toBeTruthy();
      expect(text.helpTitle).toBeTruthy();
      expect(text.helpLines).toHaveLength(2);

      const html = renderToStaticMarkup(
        createElement(UnknownSoundScene, { lang, audioUrl, parrotUrl, backgroundUrl }),
      );
      expect(html).toContain(lang === "he" ? 'dir="rtl"' : 'dir="ltr"');
      expect(html).toContain('<bdi dir="ltr">001</bdi>');
    },
  );

  it("uses the canonical personalization contract and a natural no-name fallback", () => {
    const componentSource = readFileSync(
      `${process.cwd()}/components/quests/sound-case-001/UnknownSoundScene.tsx`,
      "utf8",
    );
    expect(componentSource).toContain("personalization?: QuestPersonalization");
    expect(componentSource).toContain("text.leadFallback");
    expect(componentSource).not.toContain("{ИМЯ}");
    expect(componentSource).not.toContain("UnknownSoundPersonalization");
  });

  it("exposes localized non-spoiler help through the existing global header", () => {
    const topBarSource = readFileSync(
      `${process.cwd()}/components/TopBar.tsx`,
      "utf8",
    );
    expect(topBarSource).toContain("top-bar--unknown-sound");
    expect(topBarSource).toContain("top-bar-signin");
    expect(topBarSource).toContain("top-bar-cart");
    expect(topBarSource).toContain("<LanguageSwitcher />");
    expect(topBarSource).toContain("top-bar-quest-help");
    expect(topBarSource).toContain("laplapla:unknown-sound-help");

    for (const lang of ["ru", "en", "he"] as const) {
      const help = dictionaries[lang].shop.soundCase.unknownSoundScene;
      expect(help.helpAriaLabel).toBeTruthy();
      expect(help.helpClose).toBeTruthy();
      expect(`${help.helpBrandPrefix}${JSON.stringify(help.helpLines)}`).not.toMatch(
        /singing dunes|booming dunes|kelso|desert|sand|дюн|песок|пустын|חול|דיונה/i,
      );
    }
  });

  it("has localized failure/retry UI and no next-level navigation", () => {
    const componentSource = readFileSync(
      `${process.cwd()}/components/quests/sound-case-001/UnknownSoundScene.tsx`,
      "utf8",
    );
    expect(componentSource).toContain('onError={() => setAudioStatus("error")}');
    expect(componentSource).toContain("text.retryAction");
    expect(componentSource).not.toContain("router.push");
    expect(componentSource).not.toContain("NEXT LEVEL");
    expect(componentSource).not.toContain("Stage 02");
  });

  it("keeps pre-clue source and copy free from mystery spoilers", () => {
    const sceneSources = [
      readFileSync(
        `${process.cwd()}/components/quests/sound-case-001/UnknownSoundScene.tsx`,
        "utf8",
      ),
      ...(["ru", "en", "he"] as const).map((lang) =>
        JSON.stringify(dictionaries[lang].shop.soundCase.unknownSoundScene),
      ),
    ].join(" ");

    expect(sceneSources).not.toMatch(/singing dunes|booming dunes|kelso|desert|sand|дюн|песок|пустын|חול|דיונה/i);
    expect(sceneSources).not.toContain("Supabase");
    expect(sceneSources).not.toMatch(/\/api\//);
  });
});
