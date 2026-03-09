"use client";

import { useEffect, useRef } from "react";
import { PuzzleEngine } from "./PuzzleEngine";

type Props = {
  sourceCanvas: HTMLCanvasElement;
};

export default function PuzzleCanvas({ sourceCanvas }: Props) {
  console.log("PuzzleCanvas mounted");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PuzzleEngine | null>(null);
  const trayRef = useRef<HTMLDivElement | null>(null);

  const dragSourceRef = useRef<"tray" | "board" | null>(null);
  const draggedTrayImgRef = useRef<HTMLImageElement | null>(null);

  const draggingPieceRef = useRef<any>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const snapFlashRef = useRef<number>(0);
  const winTriggeredRef = useRef(false);
  const winTimeRef = useRef<number>(0);
  const starsRef = useRef<
    { x: number; y: number; vx: number; vy: number; size: number }[]
  >([]);

  useEffect(() => {
    const canvas = canvasRef.current!;

    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    const engine = new PuzzleEngine(canvas.width, canvas.height);
    engineRef.current = engine;

    function getCanvasPoint(clientX: number, clientY: number) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    }

    function handleGlobalMouseMove(e: MouseEvent) {
      const piece = draggingPieceRef.current;
      if (!piece || piece.locked) return;

      const pos = getCanvasPoint(e.clientX, e.clientY);

      // dragging from tray → center piece under cursor
      if (dragSourceRef.current === "tray") {
        piece.x = pos.x - piece.canvas.width / 2;
        piece.y = pos.y - piece.canvas.height / 2;
      }

      // dragging from board → keep original grab offset
      if (dragSourceRef.current === "board") {
        const engine = engineRef.current;
        if (!engine) return;

        const group = engine.getGroupPieces(piece.groupId);

        const targetX = pos.x - offsetRef.current.x;
        const targetY = pos.y - offsetRef.current.y;

        const dx = targetX - piece.x;
        const dy = targetY - piece.y;

        group.forEach((p) => {
          p.x += dx;
          p.y += dy;
        });
      }
    }

    function handleGlobalMouseUp(e: MouseEvent) {
      const engine = engineRef.current;
      const piece = draggingPieceRef.current;

      if (!engine || !piece) return;

      const rect = canvas.getBoundingClientRect();
      const pos = getCanvasPoint(e.clientX, e.clientY);

      const insideBoard =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (insideBoard) {
        // place piece where user dropped it
        piece.x = pos.x - piece.canvas.width / 2;
        piece.y = pos.y - piece.canvas.height / 2;

        const wasLocked = piece.locked;
        engine.trySnap(piece);

        if (!wasLocked && piece.locked) {
          // play snap sound
          try {
            const audio = new Audio("/sounds/puzzle-click.mp3");
            audio.volume = 0.6;
            audio.play().catch(() => {});
          } catch {}

          // trigger flash effect
          snapFlashRef.current = performance.now();
        }
        if (!winTriggeredRef.current && engine.pieces.every((p) => p.locked)) {
          winTriggeredRef.current = true;
          winTimeRef.current = performance.now();

          // play win sound
          try {
            const audio = new Audio("/sounds/you-win.mp3");
            audio.volume = 0.7;
            audio.play().catch(() => {});
          } catch {}

          // spawn stars
          starsRef.current = Array.from({ length: 60 }).map(() => ({
            x: Math.random() * canvas.width,
            y: -20 - Math.random() * 100,
            vx: (Math.random() - 0.5) * 1.5,
            vy: 1 + Math.random() * 2,
            size: 4 + Math.random() * 6,
          }));

          // notify Frank bubble
          window.dispatchEvent(
            new CustomEvent("puzzle-win", {
              detail: { text: "Молодчина, у тебя получилось!" },
            }),
          );
          window.dispatchEvent(
            new CustomEvent("frank-speech", {
              detail: { text: "Молодчина, у тебя получилось!" },
            }),
          );
        }

        // if the piece came from tray, remove its tray image
        if (dragSourceRef.current === "tray" && draggedTrayImgRef.current) {
          draggedTrayImgRef.current.remove();
        }
      } else {
        // piece dropped outside board → return to tray

        if (dragSourceRef.current === "tray") {
          // simply restore the tray image with animation
          if (draggedTrayImgRef.current) {
            const img = draggedTrayImgRef.current;
            img.style.opacity = "1";
            img.style.transition =
              "transform 260ms cubic-bezier(.2,1.4,.4,1), opacity 180ms ease";
            img.style.transform = "translateY(-12px) scale(0.8)";

            requestAnimationFrame(() => {
              img.style.transform = "translateY(0px) scale(1.1)";
              setTimeout(() => {
                img.style.transform = "translateY(0px) scale(1)";
              }, 140);
            });
          }

          piece.x = -1000;
          piece.y = -1000;
        }

        if (dragSourceRef.current === "board") {
          if (trayRef.current) {
            // avoid creating duplicates if the piece is already in the tray
            const existing = trayRef.current.querySelector(
              `[data-piece-id="${piece.id}"]`,
            ) as HTMLImageElement | null;

            let img = existing;

            if (!img) {
              img = document.createElement("img");
              img.src = piece.canvas.toDataURL();
              img.dataset.pieceId = piece.id;
              img.style.width = piece.canvas.width + "px";
              img.style.height = piece.canvas.height + "px";
              img.style.cursor = "grab";
              img.style.userSelect = "none";
              img.style.pointerEvents = "auto";

              img.onmousedown = (ev) => {
                ev.preventDefault();
                draggingPieceRef.current = piece;
                dragSourceRef.current = "tray";
                draggedTrayImgRef.current = img!;
                img!.style.opacity = "0.35";
              };

              // put piece back at the start of the tray
              trayRef.current.prepend(img);
            }

            img.style.opacity = "1";
            // small return animation
            img.style.transition =
              "transform 260ms cubic-bezier(.2,1.4,.4,1), opacity 180ms ease";
            img.style.transform = "translateY(-12px) scale(0.8)";

            requestAnimationFrame(() => {
              img.style.transform = "translateY(0px) scale(1.1)";
              setTimeout(() => {
                img.style.transform = "translateY(0px) scale(1)";
              }, 140);
            });
          }

          // play tray return sound
          try {
            const audio = new Audio("/sounds/clap.mp3");
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch {}

          // hide piece from the board
          piece.x = -1000;
          piece.y = -1000;
        }
      }

      draggingPieceRef.current = null;
      dragSourceRef.current = null;
      draggedTrayImgRef.current = null;
    }

    async function init() {
      if (!sourceCanvas) return;

      await engine.init(sourceCanvas);

      trayRef.current = document.querySelector(
        ".lesson-puzzle-tray-inner",
      ) as HTMLDivElement | null;
      // put puzzle pieces into tray
      if (trayRef.current) {
        trayRef.current.innerHTML = "";

        engine.pieces.forEach((piece) => {
          const img = document.createElement("img");
          img.src = piece.canvas.toDataURL();
          img.dataset.pieceId = piece.id;
          img.style.width = piece.canvas.width + "px";
          img.style.height = piece.canvas.height + "px";
          img.style.cursor = "grab";
          img.style.userSelect = "none";
          img.style.pointerEvents = "auto";

          img.onmousedown = (ev) => {
            ev.preventDefault();
            draggingPieceRef.current = piece;
            dragSourceRef.current = "tray";
            draggedTrayImgRef.current = img;
            img.style.opacity = "0.35";
          };

          trayRef.current!.appendChild(img);
        });
      }

      requestAnimationFrame(loop);
    }

    function loop() {
      if (!engineRef.current) return;

      engineRef.current.render(ctx);

      if (winTriggeredRef.current) {
        const elapsed = performance.now() - winTimeRef.current;

        // star rain
        starsRef.current.forEach((s) => {
          s.x += s.vx;
          s.y += s.vy;

          if ((s as any).angle === undefined) {
            (s as any).angle = Math.random() * Math.PI * 2;
            (s as any).spin = (Math.random() - 0.5) * 0.2;
          }

          (s as any).angle += (s as any).spin;

          ctx.save();

          ctx.translate(s.x, s.y);
          ctx.rotate((s as any).angle);

          ctx.fillStyle = "#FFD84D";
          ctx.shadowColor = "#FFD84D";
          ctx.shadowBlur = 12;

          const spikes = 5;
          const outerRadius = s.size;
          const innerRadius = s.size * 0.45;

          let rot = (Math.PI / 2) * 3;
          let x = 0;
          let y = 0;

          ctx.beginPath();
          ctx.moveTo(x, y - outerRadius);

          for (let i = 0; i < spikes; i++) {
            ctx.lineTo(
              x + Math.cos(rot) * outerRadius,
              y + Math.sin(rot) * outerRadius,
            );
            rot += Math.PI / spikes;

            ctx.lineTo(
              x + Math.cos(rot) * innerRadius,
              y + Math.sin(rot) * innerRadius,
            );
            rot += Math.PI / spikes;
          }

          ctx.lineTo(x, y - outerRadius);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        });

        // after short delay draw merged full image
        if (elapsed > 600 && sourceCanvas) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, (elapsed - 600) / 400);
          ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
          ctx.restore();
        }
      }

      // white flash when a piece snaps
      const flashAge = performance.now() - snapFlashRef.current;
      if (flashAge < 180) {
        const alpha = 1 - flashAge / 180;
        ctx.save();
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      if (draggingPieceRef.current && dragSourceRef.current === "tray") {
        const piece = draggingPieceRef.current;

        ctx.save();

        // subtle lift effect
        ctx.shadowColor = "rgba(0,0,0,0.35)";
        ctx.shadowBlur = 18;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 8;

        // slight scale-up so it feels lifted
        const scale = 1.05;
        const w = piece.canvas.width * scale;
        const h = piece.canvas.height * scale;

        ctx.drawImage(
          piece.canvas,
          piece.x - (w - piece.canvas.width) / 2,
          piece.y - (h - piece.canvas.height) / 2,
          w,
          h,
        );

        ctx.restore();
      }

      requestAnimationFrame(loop);
    }

    init();

    document.addEventListener("mousemove", handleGlobalMouseMove);
    document.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [sourceCanvas]);

  function getMousePos(e: React.MouseEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();

    const engine = engineRef.current;
    if (!engine) return;

    const pos = getMousePos(e);

    const piece = [...engine.pieces].reverse().find((p) => {
      if (p.locked) return false;

      return (
        pos.x >= p.x &&
        pos.x <= p.x + p.canvas.width &&
        pos.y >= p.y &&
        pos.y <= p.y + p.canvas.height
      );
    });

    if (!piece) return;

    draggingPieceRef.current = piece;
    dragSourceRef.current = "board";

    offsetRef.current = {
      x: pos.x - piece.x,
      y: pos.y - piece.y,
    };
  }

  function handleMouseMove(e: React.MouseEvent) {
    const piece = draggingPieceRef.current;
    if (!piece || piece.locked || dragSourceRef.current !== "board") return;

    const engine = engineRef.current;
    if (!engine) return;

    const group = engine.getGroupPieces(piece.groupId);

    const pos = getMousePos(e);

    const targetX = pos.x - offsetRef.current.x;
    const targetY = pos.y - offsetRef.current.y;

    const dx = targetX - piece.x;
    const dy = targetY - piece.y;

    group.forEach((p) => {
      p.x += dx;
      p.y += dy;
    });
  }

  function handleMouseUp() {
    const engine = engineRef.current;
    const piece = draggingPieceRef.current;

    if (!engine || !piece) return;

    // Only process mouseup here if the piece originated from the board
    if (dragSourceRef.current === "board") {
      const wasLocked = piece.locked;

      engine.trySnap(piece);

      if (!wasLocked && piece.locked) {
        try {
          const audio = new Audio("/sounds/puzzle-click.mp3");
          audio.volume = 0.6;
          audio.play().catch(() => {});
        } catch {}

        snapFlashRef.current = performance.now();
      }
      if (!winTriggeredRef.current && engine.pieces.every((p) => p.locked)) {
        winTriggeredRef.current = true;
        winTimeRef.current = performance.now();

        // play win sound
        try {
          const audio = new Audio("/sounds/you-win.mp3");
          audio.volume = 0.7;
          audio.play().catch(() => {});
        } catch {}

        // spawn stars
        starsRef.current = Array.from({ length: 60 }).map(() => ({
          x: Math.random() * canvasRef.current!.width,
          y: -20 - Math.random() * 100,
          vx: (Math.random() - 0.5) * 1.5,
          vy: 1 + Math.random() * 2,
          size: 4 + Math.random() * 6,
        }));

        // notify Frank bubble
        window.dispatchEvent(
          new CustomEvent("puzzle-win", {
            detail: { text: "Молодчина, у тебя получилось!" },
          }),
        );
        window.dispatchEvent(
          new CustomEvent("frank-speech", {
            detail: { text: "Молодчина, у тебя получилось!" },
          }),
        );
      }

      draggingPieceRef.current = null;
      dragSourceRef.current = null;
    }
  }

  return (
    <div
      className="lesson-puzzle-wrapper"
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
      }}
    >
      {/* Puzzle board */}
      <canvas
        ref={canvasRef}
        width={512}
        height={512}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          border: "2px solid #000",
          background: "#fff",
          display: "block",
          margin: "0 auto",
          cursor: "grab",
          maxWidth: "512px",
        }}
      />
    </div>
  );
}
