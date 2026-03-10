let logoImage: HTMLImageElement | null = null;
let logoPromise: Promise<HTMLImageElement> | null = null;

function loadLogo(): Promise<HTMLImageElement> {
  if (logoImage && logoImage.complete) {
    return Promise.resolve(logoImage);
  }

  if (logoPromise) {
    return logoPromise;
  }

  logoPromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.src = "/laplapla-logo.webp";
    img.onload = () => {
      logoImage = img;
      resolve(img);
    };
    img.onerror = () => {
      reject(new Error("Failed to load LapLapLa watermark logo"));
    };
  });

  return logoPromise;
}

export const preloadLapLapLaWatermark = async () => {
  await loadLogo();
};

export const drawLapLapLaWatermark = async (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
) => {
  const logo = await loadLogo();
  drawLapLapLaWatermarkSync(ctx, canvas, logo);
};

export const drawLapLapLaWatermarkSync = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  logo = logoImage,
) => {
  if (!logo || !logo.complete) return false;

  const LOGO_WIDTH = 60;
  const LOGO_HEIGHT = 60;
  const MARGIN = 12;

  const x = canvas.width - LOGO_WIDTH - MARGIN;
  const y = canvas.height - LOGO_HEIGHT - MARGIN - 18;

  ctx.save();
  ctx.drawImage(logo, x, y, LOGO_WIDTH, LOGO_HEIGHT);
  ctx.font = "20px 'Amatic SC', cursive";
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("LapLapLa", x + LOGO_WIDTH / 2, y + LOGO_HEIGHT + 16);
  ctx.restore();

  return true;
};
