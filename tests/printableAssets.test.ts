import { describe, expect, it, vi } from "vitest";
import {
  extractCssImageUrls,
  preparePrintableAssets,
  printPreparedQuestDocument,
  waitForPrintableImage,
} from "@/lib/shop/printableAssets";

class FakeImage extends EventTarget {
  complete = false;
  naturalWidth = 0;
  naturalHeight = 0;
  loading = "lazy";
  decoding = "auto";
  src = "";
  currentSrc = "";
  decode = vi.fn(async () => undefined);
}

function asImage(image: FakeImage): HTMLImageElement {
  return image as unknown as HTMLImageElement;
}

function createRoot(
  images: FakeImage[],
  backgroundImages: string[] = [],
): ParentNode {
  return {
    querySelectorAll(selector: string) {
      if (selector === "img") return images.map(asImage);
      if (selector === '[style*="background"]') {
        return backgroundImages.map((backgroundImage) => ({ style: { backgroundImage } }));
      }
      return [];
    },
  } as unknown as ParentNode;
}

describe("printable asset readiness", () => {
  it("resolves an already loaded image immediately and requests a decode", async () => {
    const image = new FakeImage();
    image.complete = true;
    image.naturalWidth = 1254;
    image.naturalHeight = 1254;

    await waitForPrintableImage(asImage(image));

    expect(image.loading).toBe("eager");
    expect(image.decode).toHaveBeenCalledOnce();
  });

  it("waits for a pending hidden image to load and decode before printing", async () => {
    const image = new FakeImage();
    const print = vi.fn();
    const pendingPrint = printPreparedQuestDocument(createRoot([image]), print);

    await Promise.resolve();
    expect(print).not.toHaveBeenCalled();
    expect(image.loading).toBe("eager");

    image.complete = true;
    image.naturalWidth = 1254;
    image.naturalHeight = 1254;
    image.dispatchEvent(new Event("load"));
    await pendingPrint;

    expect(image.decode).toHaveBeenCalledOnce();
    expect(print).toHaveBeenCalledOnce();
  });

  it("preloads inline CSS image URLs used by printable puzzle tiles", async () => {
    const created: FakeImage[] = [];
    const root = createRoot([], [
      'linear-gradient(#123, #456), url("https://media.laplapla.com/dune.webp")',
      'url("https://media.laplapla.com/dune.webp")',
    ]);

    await preparePrintableAssets(root, () => {
      const image = new FakeImage();
      image.complete = true;
      image.naturalWidth = 2400;
      image.naturalHeight = 1200;
      created.push(image);
      return asImage(image);
    });

    expect(created).toHaveLength(1);
    expect(created[0]?.src).toBe("https://media.laplapla.com/dune.webp");
    expect(created[0]?.loading).toBe("eager");
    expect(created[0]?.decoding).toBe("sync");
  });

  it("does not open the print dialog when a required image fails", async () => {
    const image = new FakeImage();
    const print = vi.fn();
    const pendingPrint = printPreparedQuestDocument(createRoot([image]), print);

    image.complete = true;
    image.dispatchEvent(new Event("error"));

    await expect(pendingPrint).rejects.toThrow("printable_asset_load_failed");
    expect(print).not.toHaveBeenCalled();
  });

  it("extracts image URLs without treating gradients as assets", () => {
    expect(
      extractCssImageUrls(
        'linear-gradient(rgba(0,0,0,.2), rgba(0,0,0,.8)), url("/dune.webp")',
      ),
    ).toEqual(["/dune.webp"]);
  });
});
