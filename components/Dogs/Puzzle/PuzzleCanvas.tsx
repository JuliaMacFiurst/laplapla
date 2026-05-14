"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { devLog } from "@/utils/devLog";
import { PuzzleEngine } from "./PuzzleEngine";

type Props = {
  sourceCanvas: HTMLCanvasElement;
  traySelector?: string;
};

export default function PuzzleCanvas({
  sourceCanvas,
  traySelector = ".lesson-puzzle-tray-inner",
}: Props) {
  devLog("PuzzleCanvas mounted");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PuzzleEngine | null>(null);
  const trayRef = useRef<HTMLDivElement | null>(null);

  const dragSourceRef = useRef<"tray" | "board" | null>(null);
  const draggedTrayImgRef = useRef<HTMLElement | null>(null);

  const draggingPieceRef = useRef<any>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const activePointerIdRef = useRef<number | null>(null);
  const loopFrameRef = useRef<number | null>(null);
  const snapFlashRef = useRef<number>(0);
  const winTriggeredRef = useRef(false);
  const winTimeRef = useRef<number>(0);
  const audioUnlockedRef = useRef(false);
  const snapAudioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);
  const returnAudioRef = useRef<HTMLAudioElement | null>(null);
  const trayScrollGestureRef = useRef<{
    pointerId: number;
    startY: number;
    startScrollTop: number;
  } | null>(null);
  const starsRef = useRef<
    { x: number; y: number; vx: number; vy: number; size: number }[]
  >([]);

  const getAudio = (
    ref: MutableRefObject<HTMLAudioElement | null>,
    src: string,
    volume: number,
  ) => {
    if (!ref.current) {
      ref.current = new Audio(src);
      ref.current.preload = "auto";
      ref.current.volume = volume;
    }

    return ref.current;
  };

  const unlockPuzzleAudio = () => {
    if (audioUnlockedRef.current) return;

    audioUnlockedRef.current = true;
    const audioItems = [
      getAudio(snapAudioRef, "/sounds/puzzle-click.mp3", 0.6),
      getAudio(winAudioRef, "/sounds/you-win.mp3", 0.7),
      getAudio(returnAudioRef, "/sounds/clap.mp3", 0.5),
    ];

    audioItems.forEach((audio) => {
      const previousVolume = audio.volume;
      audio.volume = 0;
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = previousVolume;
        })
        .catch(() => {
          audio.volume = previousVolume;
        });
    });
  };

  const playPuzzleSound = (
    ref: MutableRefObject<HTMLAudioElement | null>,
    src: string,
    volume: number,
  ) => {
    try {
      const audio = getAudio(ref, src, volume);
      audio.volume = volume;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {}
  };

  const renderPieces = (
    ctx: CanvasRenderingContext2D,
    activePiece: any | null,
  ) => {
    const engine = engineRef.current;
    if (!engine) return;

    const activeGroupId = activePiece?.groupId ?? null;
    const inactivePieces = engine.pieces.filter(
      (piece) => piece.groupId !== activeGroupId,
    );
    const lockedPieces = inactivePieces.filter((piece) => piece.locked);
    const unlockedPieces = inactivePieces.filter((piece) => !piece.locked);
    const activeGroupPieces = activeGroupId === null
      ? []
      : engine.getGroupPieces(activeGroupId);

    ctx.clearRect(0, 0, engine.width, engine.height + 300);

    lockedPieces.forEach((piece) => {
      ctx.drawImage(piece.canvas, piece.x, piece.y);
    });

    unlockedPieces.forEach((piece) => {
      ctx.drawImage(piece.canvas, piece.x, piece.y);
    });

    activeGroupPieces.forEach((piece) => {
      ctx.drawImage(piece.canvas, piece.x, piece.y);
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    let destroyed = false;

    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    const engine = new PuzzleEngine(canvas.width, canvas.height);
    engineRef.current = engine;

    function getCanvasPoint(clientX: number, clientY: number) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    }

    function handleGlobalPointerMove(e: PointerEvent) {
      if (
        activePointerIdRef.current !== null &&
        e.pointerId !== activePointerIdRef.current
      ) {
        return;
      }

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

    function handleGlobalPointerUp(e: PointerEvent) {
      if (
        activePointerIdRef.current !== null &&
        e.pointerId !== activePointerIdRef.current
      ) {
        return;
      }

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
          playPuzzleSound(snapAudioRef, "/sounds/puzzle-click.mp3", 0.6);

          // trigger flash effect
          snapFlashRef.current = performance.now();
        }
        if (!winTriggeredRef.current && engine.pieces.every((p) => p.locked)) {
          winTriggeredRef.current = true;
          winTimeRef.current = performance.now();

          playPuzzleSound(winAudioRef, "/sounds/you-win.mp3", 0.7);

          // spawn stars
          starsRef.current = Array.from({ length: 120 }).map(() => ({
            x: Math.random() * canvas.width,
            y: -40 - Math.random() * 200,
            vx: (Math.random() - 0.5) * 1.2,
            vy: 0.6 + Math.random() * 1.2,
            size: 4 + Math.random() * 8,
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
            ) as HTMLElement | null;

            let img = existing;

            if (!img) {
              img = createTrayPieceElement(piece);

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

          playPuzzleSound(returnAudioRef, "/sounds/clap.mp3", 0.5);

          // hide piece from the board
          piece.x = -1000;
          piece.y = -1000;
        }
      }

      draggingPieceRef.current = null;
      dragSourceRef.current = null;
      draggedTrayImgRef.current = null;
      activePointerIdRef.current = null;
    }

    const attachTrayPointerHandler = (
      handle: HTMLElement,
      trayItem: HTMLElement,
      piece: any,
    ) => {
      handle.onpointerdown = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        unlockPuzzleAudio();
        activePointerIdRef.current = ev.pointerId;
        draggingPieceRef.current = piece;
        dragSourceRef.current = "tray";
        draggedTrayImgRef.current = trayItem;
        trayItem.style.opacity = "0.35";
      };
    };

    const createTrayPieceElement = (piece: any) => {
      const isMobileTray = traySelector.includes("mobile");
      const isTabletTray =
        isMobileTray &&
        typeof window !== "undefined" &&
        window.matchMedia("(min-width: 768px)").matches;
      const item = document.createElement("div");
      item.dataset.pieceId = piece.id;
      item.className = "lesson-puzzle-tray-piece";
      item.style.position = "relative";
      item.style.display = "inline-flex";
      item.style.alignItems = "center";
      item.style.justifyContent = "center";
      item.style.width = isTabletTray
        ? "128px"
        : isMobileTray
          ? "84px"
          : `${piece.canvas.width}px`;
      item.style.minWidth = isTabletTray
        ? "128px"
        : isMobileTray
          ? "84px"
          : `${piece.canvas.width}px`;
      item.style.height = isTabletTray
        ? "104px"
        : isMobileTray
          ? "64px"
          : `${piece.canvas.height}px`;
      item.style.padding = isTabletTray ? "8px" : isMobileTray ? "6px" : "0";
      item.style.borderRadius = isMobileTray ? "14px" : "0";
      item.style.background = isMobileTray ? "rgba(255,255,255,0.08)" : "transparent";
      item.style.boxSizing = "border-box";
      item.style.flex = "0 0 auto";
      if (isMobileTray) {
        item.style.pointerEvents = "auto";
        item.style.touchAction = isTabletTray ? "none" : "pan-x";
        item.style.cursor = isTabletTray ? "grab" : "default";
      }

      const img = document.createElement("img");
      img.src = piece.canvas.toDataURL();
      img.alt = "";
      img.style.width = isMobileTray ? "auto" : `${piece.canvas.width}px`;
      img.style.height = isTabletTray
        ? "86px"
        : isMobileTray
          ? "48px"
          : `${piece.canvas.height}px`;
      img.style.maxWidth = isTabletTray
        ? "104px"
        : isMobileTray
          ? "60px"
          : `${piece.canvas.width}px`;
      img.style.objectFit = "contain";
      img.style.pointerEvents = "none";
      img.style.userSelect = "none";

      item.appendChild(img);

      if (isMobileTray && !isTabletTray) {
        const handle = document.createElement("button");
        handle.type = "button";
        handle.textContent = "↗";
        handle.setAttribute("aria-label", "Drag puzzle piece");
        handle.style.position = "absolute";
        handle.style.right = "4px";
        handle.style.bottom = "4px";
        handle.style.width = "22px";
        handle.style.height = "22px";
        handle.style.border = "0";
        handle.style.borderRadius = "999px";
        handle.style.background = "rgba(29,31,38,0.86)";
        handle.style.color = "#fff";
        handle.style.fontSize = "12px";
        handle.style.lineHeight = "1";
        handle.style.display = "inline-flex";
        handle.style.alignItems = "center";
        handle.style.justifyContent = "center";
        handle.style.touchAction = "none";
        handle.style.pointerEvents = "auto";

        attachTrayPointerHandler(handle, item, piece);
        item.appendChild(handle);
      } else {
        item.style.cursor = "grab";
        item.style.pointerEvents = "auto";
        item.style.touchAction = "none";
        attachTrayPointerHandler(item, item, piece);
      }

      return item;
    };

    async function init() {
      if (!sourceCanvas) return;

      await engine.init(sourceCanvas);

      trayRef.current = document.querySelector(
        traySelector,
      ) as HTMLDivElement | null;
      // put puzzle pieces into tray
      if (trayRef.current) {
        trayRef.current.innerHTML = "";
        const isMobileTray = traySelector.includes("mobile");
        if (isMobileTray) {
          const isTabletLandscape =
            window.matchMedia("(min-width: 768px)").matches &&
            window.matchMedia("(orientation: landscape)").matches;
          trayRef.current.style.touchAction = isTabletLandscape ? "pan-y" : "pan-x";
          trayRef.current.style.pointerEvents = "auto";

          if (isTabletLandscape) {
            trayRef.current.onpointerdown = (event) => {
              const target = event.target as HTMLElement | null;
              if (target?.closest(".lesson-puzzle-tray-piece")) {
                return;
              }

              trayScrollGestureRef.current = {
                pointerId: event.pointerId,
                startY: event.clientY,
                startScrollTop: trayRef.current?.scrollTop ?? 0,
              };
              trayRef.current?.setPointerCapture(event.pointerId);
            };

            trayRef.current.onpointermove = (event) => {
              const gesture = trayScrollGestureRef.current;
              if (!gesture || gesture.pointerId !== event.pointerId || !trayRef.current) {
                return;
              }

              event.preventDefault();
              trayRef.current.scrollTop =
                gesture.startScrollTop + (gesture.startY - event.clientY);
            };

            trayRef.current.onpointerup = (event) => {
              if (trayScrollGestureRef.current?.pointerId === event.pointerId) {
                trayScrollGestureRef.current = null;
              }
            };

            trayRef.current.onpointercancel = trayRef.current.onpointerup;
          }
        }

        // shuffle pieces so tray order is random
        const shuffledPieces = [...engine.pieces];
        for (let i = shuffledPieces.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledPieces[i], shuffledPieces[j]] = [shuffledPieces[j], shuffledPieces[i]];
        }

        shuffledPieces.forEach((piece) => {
          const item = createTrayPieceElement(piece);
          if (!isMobileTray) {
            item.style.width = `${piece.canvas.width}px`;
            item.style.minWidth = `${piece.canvas.width}px`;
            item.style.height = `${piece.canvas.height}px`;
          }
          trayRef.current!.appendChild(item);
        });
      }

      if (destroyed) return;
      loopFrameRef.current = requestAnimationFrame(loop);
    }

    function loop() {
      if (!engineRef.current) return;

      renderPieces(ctx, draggingPieceRef.current);

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
        if (elapsed > 1800 && sourceCanvas) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, (elapsed - 1800) / 800);
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

      if (destroyed) return;
      loopFrameRef.current = requestAnimationFrame(loop);
    }

    init();

    document.addEventListener("pointermove", handleGlobalPointerMove);
    document.addEventListener("pointerup", handleGlobalPointerUp);
    document.addEventListener("pointercancel", handleGlobalPointerUp);

    return () => {
      destroyed = true;
      if (loopFrameRef.current !== null) {
        cancelAnimationFrame(loopFrameRef.current);
        loopFrameRef.current = null;
      }
      document.removeEventListener("pointermove", handleGlobalPointerMove);
      document.removeEventListener("pointerup", handleGlobalPointerUp);
      document.removeEventListener("pointercancel", handleGlobalPointerUp);
    };
  }, [sourceCanvas, traySelector]);

  function getPointerPos(clientX: number, clientY: number) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    unlockPuzzleAudio();

    const engine = engineRef.current;
    if (!engine) return;

    activePointerIdRef.current = e.pointerId;
    const pos = getPointerPos(e.clientX, e.clientY);

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

  function handlePointerMove(e: React.PointerEvent) {
    if (
      activePointerIdRef.current !== null &&
      e.pointerId !== activePointerIdRef.current
    ) {
      return;
    }

    const piece = draggingPieceRef.current;
    if (!piece || piece.locked || dragSourceRef.current !== "board") return;

    const engine = engineRef.current;
    if (!engine) return;

    const group = engine.getGroupPieces(piece.groupId);

    const pos = getPointerPos(e.clientX, e.clientY);

    const targetX = pos.x - offsetRef.current.x;
    const targetY = pos.y - offsetRef.current.y;

    const dx = targetX - piece.x;
    const dy = targetY - piece.y;

    group.forEach((p) => {
      p.x += dx;
      p.y += dy;
    });
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (
      activePointerIdRef.current !== null &&
      e.pointerId !== activePointerIdRef.current
    ) {
      return;
    }

    const engine = engineRef.current;
    const piece = draggingPieceRef.current;

    if (!engine || !piece) return;

    // Only process mouseup here if the piece originated from the board
    if (dragSourceRef.current === "board") {
      const wasLocked = piece.locked;

      engine.trySnap(piece);

      if (!wasLocked && piece.locked) {
        playPuzzleSound(snapAudioRef, "/sounds/puzzle-click.mp3", 0.6);

        snapFlashRef.current = performance.now();
      }
      if (!winTriggeredRef.current && engine.pieces.every((p) => p.locked)) {
        winTriggeredRef.current = true;
        winTimeRef.current = performance.now();

        playPuzzleSound(winAudioRef, "/sounds/you-win.mp3", 0.7);

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

    activePointerIdRef.current = null;
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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          border: "2px solid #d9d9d9",
          background: "#d8d8d8",
          display: "block",
          margin: "0 auto",
          cursor: "grab",
          width: "100%",
          maxWidth: "100%",
          maxHeight: "100%",
          boxSizing: "border-box",
          touchAction: "none",
        }}
      />
    </div>
  );
}
