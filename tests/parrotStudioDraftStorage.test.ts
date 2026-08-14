import { describe, expect, it } from "vitest";
import {
  loadParrotStudioDraft,
  PARROT_STUDIO_DRAFT_STORAGE_KEY,
  saveParrotStudioDraft,
} from "@/lib/parrots/studioDraftStorage";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("Parrots studio draft persistence", () => {
  it("restores the latest saved music-editor state", () => {
    const storage = new MemoryStorage();
    const draft = {
      selectedStyleSlug: "lofi",
      composition: {
        activeLoops: ["beat"],
        loopSelections: { beat: 2 },
        mix: { loopsVolume: 0.65, voiceVolume: 0.9 },
      },
    };

    saveParrotStudioDraft(storage, draft);

    expect(loadParrotStudioDraft(storage)).toEqual(draft);
  });

  it("overwrites one stable record on repeated saves", () => {
    const storage = new MemoryStorage();

    saveParrotStudioDraft(storage, { activeLoops: ["beat"] });
    saveParrotStudioDraft(storage, { activeLoops: ["melody"] });

    expect(storage.length).toBe(1);
    expect(storage.key(0)).toBe(PARROT_STUDIO_DRAFT_STORAGE_KEY);
    expect(loadParrotStudioDraft(storage)).toEqual({ activeLoops: ["melody"] });
  });
});
