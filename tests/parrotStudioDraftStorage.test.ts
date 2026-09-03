import { describe, expect, it } from "vitest";
import {
  loadParrotStudioDraft,
  PARROT_STUDIO_DRAFT_STORAGE_KEY,
  resolveParrotStudioEntryStyle,
  resolveParrotStudioDraftStyle,
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

describe("Parrots studio style priority", () => {
  const styleIds = ["lofi", "synthwave", "funk", "house", "jazzhop"];

  it("prioritizes a valid URL style over an import style", () => {
    expect(resolveParrotStudioEntryStyle(styleIds, "jazzhop", "funk", "lofi")).toEqual({
      styleSlug: "jazzhop",
      hasExplicitInitialStyle: true,
    });
  });

  it("uses a valid import style when URL has no style", () => {
    expect(resolveParrotStudioEntryStyle(styleIds, null, "house", "lofi")).toEqual({
      styleSlug: "house",
      hasExplicitInitialStyle: true,
    });
  });

  it("does not mark the fallback as an explicit entry style", () => {
    expect(resolveParrotStudioEntryStyle(styleIds, null, null, "lofi")).toEqual({
      styleSlug: "lofi",
      hasExplicitInitialStyle: false,
    });
  });

  it("keeps an explicit jazz entry over a local draft synthwave style", () => {
    expect(resolveParrotStudioDraftStyle("jazzhop", true, "synthwave")).toBe("jazzhop");
  });

  it("keeps an explicit house entry over a session draft funk style", () => {
    expect(resolveParrotStudioDraftStyle("house", true, "funk")).toBe("house");
  });

  it("restores a local draft style when entry has no explicit style", () => {
    expect(resolveParrotStudioDraftStyle("lofi", false, "synthwave")).toBe("synthwave");
  });

  it("restores a session draft style when there is no local draft", () => {
    expect(resolveParrotStudioDraftStyle("lofi", false, "funk")).toBe("funk");
  });

  it("uses the next explicit entry style after a switched style was saved", () => {
    const storage = new MemoryStorage();
    saveParrotStudioDraft(storage, {
      selectedStyleSlug: "funk",
      composition: { activeLoops: ["bass"] },
    });

    const draft = loadParrotStudioDraft<{
      selectedStyleSlug: string;
      composition: { activeLoops: string[] };
    }>(storage);

    expect(resolveParrotStudioDraftStyle("house", true, draft?.selectedStyleSlug)).toBe("house");
    expect(draft?.composition).toEqual({ activeLoops: ["bass"] });
  });

  it("persists the style selected by the user", () => {
    const storage = new MemoryStorage();
    saveParrotStudioDraft(storage, { selectedStyleSlug: "funk" });

    expect(loadParrotStudioDraft<{ selectedStyleSlug: string }>(storage)?.selectedStyleSlug).toBe("funk");
  });
});
