import {useRef, useState, useEffect } from 'react';

type HintPoint = [number, number, number, number, number]; // x, y, r, g, b

export default function Colorizer({ sketchSrc }: { sketchSrc: string }) {
  const sketchCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const placeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<HintPoint[]>([]);
  const [color, setColor] = useState('#ff0000');
  const [resultSrc, setResultSrc] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Перерисовка обоих слоёв (точки и маска) из массива points
  const redrawFrom = (pts: HintPoint[]) => {
    const drawingCanvas = drawingCanvasRef.current;
    const placeCanvas = placeCanvasRef.current;
    if (!drawingCanvas || !placeCanvas) return;

    const drawCtx = drawingCanvas.getContext('2d', { alpha: true });
    const placeCtx = placeCanvas.getContext('2d');
    if (!drawCtx || !placeCtx) return;

    // очистка слоя с точками
    drawCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

    // полная перерисовка маски: чёрный фон + белые квадраты-точки
    placeCtx.clearRect(0, 0, placeCanvas.width, placeCanvas.height);
    placeCtx.fillStyle = '#000000';
    placeCtx.fillRect(0, 0, placeCanvas.width, placeCanvas.height);

    pts.forEach(([x, y, r, g, b]) => {
      // точка цвета на верхнем холсте
      drawCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      drawCtx.globalAlpha = 1.0;
      drawCtx.beginPath();
      drawCtx.arc(x, y, 5, 0, Math.PI * 2);
      drawCtx.fill();

      // точка на маске (белый квадрат)
      placeCtx.fillStyle = '#ffffff';
      placeCtx.fillRect(x - 5, y - 5, 10, 10);
    });
  };

  const handleUndo = () => {
    setPoints((prev) => {
      const next = prev.slice(0, -1);
      redrawFrom(next);
      return next;
    });
  };

  const handleClear = () => {
    const confirmed = window.confirm("Ты точно хочешь удалить все цветовые точки?");
    if (!confirmed) return;

    setPoints([]);
    redrawFrom([]);
    setResultSrc(null);
  };

  useEffect(() => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    // Инициализация: чёрный фон маски и чистый слой точек
    const drawingCanvas = drawingCanvasRef.current;
    const placeCanvas = placeCanvasRef.current;
    if (drawingCanvas) {
      const ctx = drawingCanvas.getContext('2d', { alpha: true });
      ctx?.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    }
    if (placeCanvas) {
      const ctx = placeCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, placeCanvas.width, placeCanvas.height);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, placeCanvas.width, placeCanvas.height);
      }
    }
  }, []);

  useEffect(() => {
    const canvas = sketchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = sketchSrc;
  }, [sketchSrc]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    console.log("🎨 RGB выбранного цвета:", r, g, b);

    const rgbColor = `rgb(${r}, ${g}, ${b})`; // используем прямой RGB без инверсии

    setPoints(prev => [...prev, [x, y, r, g, b]]);

    // Draw the colored point on the canvas
    const drawCtx = canvas.getContext('2d', { alpha: true });
    if (drawCtx) {
      drawCtx.fillStyle = rgbColor;
      drawCtx.beginPath();
      // drawCtx.globalAlpha = blurMode === "smooth" ? 0.25 : 1.0;
      // Всегда используем непрозрачность 1.0:
      drawCtx.globalAlpha = 1.0;
      drawCtx.arc(x, y, 5, 0, Math.PI * 2);
      drawCtx.fill();
      // drawCtx.globalAlpha = 1.0; // Уже установлено выше
    }
    const placeCanvas = placeCanvasRef.current;
    const placeCtx = placeCanvas?.getContext('2d');
    if (placeCtx) {
      placeCtx.fillStyle = '#ffffff';
      placeCtx.fillRect(x - 5, y - 5, 10, 10);
    }
  };


  const handleColorize = async () => {
    if (points.length === 0) {
      alert("Добавь хотя бы одну точку цвета перед раскраской!");
      return;
    }
    const drawingCanvas = drawingCanvasRef.current;
    const sketchCanvas = sketchCanvasRef.current;
    if (!drawingCanvas || !sketchCanvas) return;

    const button = document.querySelector('.colorizer-action-button') as HTMLButtonElement;
    if (button) {
      button.textContent = '⏳ Окрашиваем...';
      button.classList.add('loading');
    }

    // Функция для удаления data:image/png;base64, префикса
    const cleanBase64 = (dataUrl: string) => dataUrl.replace(/^data:image\/\w+;base64,/, "");

    const sketchBase64 = sketchCanvas.toDataURL('image/png');

    const pointCanvas = document.createElement('canvas');
    pointCanvas.width = drawingCanvas.width;
    pointCanvas.height = drawingCanvas.height;
    const pointCtx = pointCanvas.getContext('2d');
    if (!pointCtx) return;
    pointCtx.fillStyle = '#ffffff';
    pointCtx.fillRect(0, 0, pointCanvas.width, pointCanvas.height);
    const transformedPoints = points.map(([x, y, r, g, b]) => [x, y, r, g, b]);
    transformedPoints.forEach(([x, y, r, g, b]) => {
      pointCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      pointCtx.globalAlpha = 1.0;
      pointCtx.beginPath();
      pointCtx.arc(x, y, 5, 0, Math.PI * 2);
      pointCtx.fill();
    });
    const pointBase64 = pointCanvas.toDataURL('image/png');
    const placeCanvas = placeCanvasRef.current;
    if (!placeCanvas) return;
    const placeBase64 = placeCanvas.toDataURL('image/png');

    console.log("📷 sketchBase64", sketchBase64.slice(0, 100));
    console.log("🎯 pointBase64", pointBase64.slice(0, 100));

    const image = cleanBase64(sketchBase64);
    const point = cleanBase64(pointBase64);
    const place = cleanBase64(placeBase64);

    const fileName = "latest.png";

    // console.log("📌 sketchBase64 preview:", sketchBase64.slice(0, 100));
    // console.log("📌 pointBase64 preview:", pointBase64.slice(0, 100));
    // console.log("📌 placeBase64 preview:", placeBase64.slice(0, 100));
    // console.log("📌 pointBase64 and placeBase64 prepared");
    // console.log("📌 filename:", fileName);
    console.log("✂️ Clean base64 image:", image.slice(0, 100));
    console.log("🎯 Clean base64 point:", point.slice(0, 100));

    try {
      const res = await fetch('/api/colorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
          point,
          place,
          name: fileName
        }),
      });

      if (res.ok) {
        const { data } = await res.json();
        setResultSrc(`data:image/png;base64,${data}`);
        if (button) {
          button.textContent = '✨ Раскрасить';
          button.classList.remove('loading');
        }
      } else {
        console.error("Ошибка API:", res.statusText);
        if (button) {
          button.textContent = '✨ Раскрасить';
          button.classList.remove('loading');
        }
      }
    } catch (err) {
      console.error("Сетевая ошибка:", err);
      if (button) {
        button.textContent = '✨ Раскрасить';
        button.classList.remove('loading');
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="colorizer-container"
    >
      <div className="colorizer-content">
         <p className="colorizer-title">
            Теперь, когда у тебя есть готовый скетч, ты можешь раскрасить его магией!
          </p>
        <div className="colorizer-main">
          <div className="colorizer-palette-section">
            <div className="color-palette-grid">
              {[
                '#2f4f4f', '#c0c0c0', '#ffffff', '#00008b',
                '#0000cd', '#4169e1', '#00ced1', '#1e90ff',
                '#add8e6', '#20b2aa', '#40e0d0', '#7fffd4',
                '#b0e0e6', '#006400', '#2e8b57', '#32cd32',
                '#00fa9a', '#7fff00', '#800080', '#9370db',
                '#8b0000', '#a52a2a', '#b22222', '#ff4500',
                '#dc143c', '#ff69b4', '#dda0dd', '#ff8c00',
                '#ff6347', '#ffa500', '#daa520', '#b8860b',
                '#ffe4b5', '#fafad2', '#ffffe0', '#fffacd',
                '#f0e68c', '#eee8aa', '#f5deb3', '#ffe4c4',
                '#deb887', '#d2b48c', '#bc8f8f', '#f4a460',
                '#a0522d', '#cd853f', '#000000', '#f0ffff',
                '#00ffff', '#ffffff', '#9acd32', '#87ceeb',
                '#ffff00', '#ff0000', '#191970', '#ffffe0', '#dcdcdc',
                '#ffe4e1', '#ffc0cb', '#ffb6c1', '#db7093',
                '#ffdab9', '#e6e6fa', '#d8bfd8', '#dda0dd',
                '#e0ffff', '#afeeee', '#b0c4de', '#5f9ea0',
                '#f08080', '#cd5c5c', '#ffeeba'
              ].map((c, i) => (
                <div
                  key={i}
                  onClick={() => setColor(c)}
                  className={`color-palette-swatch${color === c ? ' selected' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="colorizer-controls">
              {/* Кнопки размытия временно отключены */}
              <button className="colorizer-button colorizer-button-undo" onClick={handleUndo}>↩ Отмена</button>
              <button className="colorizer-button colorizer-button-clear" onClick={handleClear}>🗑 Очистить</button>
            </div>
          </div>
          <div className="colorizer-main-content">
            <div className="colorizer-canvas-wrapper">
              <canvas
                ref={sketchCanvasRef}
                width={512}
                height={512}
                className="colorizer-canvas-sketch"
              />
              <canvas
                ref={drawingCanvasRef}
                onClick={handleCanvasClick}
                width={512}
                height={512}
                className="colorizer-canvas-drawing"
              /> 
              <canvas
                ref={placeCanvasRef}
                width={512}
                height={512}
                style={{ display: 'none' }}
              />
              {resultSrc && (
                <img
                  className="colorizer-result-img"
                  src={resultSrc}
                  alt="Colorized"
                  onLoad={() => {
                    const img = document.querySelector('.colorizer-result-img');
                    if (img) {
                      img.classList.add('visible');
                    }
                  }}
                />
              )}
            </div>
            <div className="colorizer-actions">
              <button
                className="colorizer-action-button colorize"
                onClick={handleColorize}
                aria-label="Раскрасить"
                type="button"
              >
                ✨ Раскрасить
              </button>
              <button
                className="colorizer-action-button save"
                onClick={() => {
                  if (resultSrc) {
                    const link = document.createElement('a');
                    link.href = resultSrc;
                    link.download = 'colorized.png';
                    link.click();
                  } else {
                    alert('Нет результата для сохранения!');
                  }
                }}
                aria-label="Сохранить"
                type="button"
              >
                💾 Сохранить
              </button>
            </div>
          </div>
        </div>

      </div>
      <style jsx>{`
        .colorizer-main-content {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          gap: 24px;
          position: relative; /* new stacking context */
        }
        .colorizer-canvas-wrapper {
          position: relative;
          z-index: 1;         /* keep below the actions */
          flex: 0 0 auto;     /* do not stretch over actions */
        }
        .colorizer-actions {
          position: relative;
          z-index: 5;         /* above any canvas layers */
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex-shrink: 0;     /* prevent squeezing */
          min-width: 220px;   /* reserve space at the right */
          justify-content: center; /* center buttons vertically */
          align-self: center;  /* align block relative to canvas top */
          margin-top: 40px;        /* push down a bit for better centering */
        }
        .colorizer-action-button {
          position: relative; /* ensure z-index applies */
          z-index: 6;         /* above canvas */
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 200px;
          min-height: 48px;
          pointer-events: auto; /* clickable even if overlay nearby */
        }
        .colorizer-controls { position: relative; z-index: 10; }
      `}</style>
    </div>
  );
}
