const CSS_IMAGE_URL_PATTERN = /url\(\s*(?:"([^"]+)"|'([^']+)'|([^)]*?))\s*\)/g;

export type PrintableImageFactory = () => HTMLImageElement;

export function extractCssImageUrls(backgroundImage: string): string[] {
  return Array.from(backgroundImage.matchAll(CSS_IMAGE_URL_PATTERN), (match) =>
    (match[1] ?? match[2] ?? match[3] ?? "").trim(),
  ).filter(Boolean);
}

export async function waitForPrintableImage(image: HTMLImageElement): Promise<void> {
  image.loading = "eager";

  if (!image.complete) {
    await new Promise<void>((resolve, reject) => {
      const handleLoad = () => {
        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(new Error("printable_asset_load_failed"));
      };
      const cleanup = () => {
        image.removeEventListener("load", handleLoad);
        image.removeEventListener("error", handleError);
      };

      image.addEventListener("load", handleLoad, { once: true });
      image.addEventListener("error", handleError, { once: true });
    });
  }

  if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    throw new Error("printable_asset_load_failed");
  }

  if (typeof image.decode === "function") {
    try {
      await image.decode();
    } catch {
      if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        throw new Error("printable_asset_decode_failed");
      }
    }
  }
}

export async function preparePrintableAssets(
  root: ParentNode,
  createImage: PrintableImageFactory = () => new Image(),
): Promise<void> {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  const inlineBackgroundUrls = new Set(
    Array.from(root.querySelectorAll<HTMLElement>('[style*="background"]')).flatMap(
      (element) => extractCssImageUrls(element.style.backgroundImage),
    ),
  );
  const imageSources = new Set(images.map((image) => image.currentSrc || image.src));
  const backgroundImages = Array.from(inlineBackgroundUrls)
    .filter((url) => !imageSources.has(url))
    .map((url) => {
      const image = createImage();
      image.loading = "eager";
      image.decoding = "sync";
      image.src = url;
      return image;
    });

  await Promise.all([...images, ...backgroundImages].map(waitForPrintableImage));
}

export async function printPreparedQuestDocument(
  root: ParentNode,
  print: () => void = () => window.print(),
  createImage?: PrintableImageFactory,
): Promise<void> {
  await preparePrintableAssets(root, createImage);
  print();
}
