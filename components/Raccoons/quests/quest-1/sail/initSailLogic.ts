export interface SailLogicParams {
  wrap: HTMLDivElement;
  seaSvg: SVGSVGElement;
  routePath: SVGPathElement;
  pinStart: HTMLDivElement;
  pinEnd: HTMLDivElement;
  racText: HTMLDivElement;
  onStartMove?: (pos: { x: number; y: number }) => void;
}

const BAD_IDS = new Set([
  "route-path",
  "route-svg",
  "pin-start",
  "pin-end",
  "sea-wrap",
  "map-wrap",
  "__next",
]);

export function initSailLogic(params: SailLogicParams) {
  const { wrap, seaSvg, routePath, pinStart, pinEnd, racText, onStartMove } = params;

  racText.innerHTML = "Енот: «Поставь синюю точку — выберем старт путешествия!»";

  let start = { x: 0.2, y: 0.8 };
  let end = { x: 0.8, y: 0.1 };
  let isDrawing = false;

  function layoutPins() {
    const r = wrap.getBoundingClientRect();
    const PAD = 10;

    const sx = start.x * r.width;
    const sy = start.y * r.height;
    const ex = end.x * r.width;
    const ey = end.y * r.height;

    pinStart.style.left = sx + "px";
    pinStart.style.top = sy + "px";

    pinEnd.style.left = ex + "px";
    pinEnd.style.top = ey + "px";
  }

  function toSvg(xPx: number, yPx: number) {
    const vb = seaSvg.viewBox.baseVal;
    const r = wrap.getBoundingClientRect();
    return {
      x: vb.x + (xPx / r.width) * vb.width,
      y: vb.y + (yPx / r.height) * vb.height,
    };
  }

  function drawRoute() {
    const r = wrap.getBoundingClientRect();
    const A = toSvg(start.x * r.width, start.y * r.height);
    const B = toSvg(end.x * r.width, end.y * r.height);

    const d = `M ${A.x} ${A.y} L ${B.x} ${B.y}`;
    routePath.setAttribute("d", d);

    checkWaters();
  }

  function checkWaters() {
    const len = routePath.getTotalLength();
    const step = 12;
    const seas = new Set<string>();
    let landDetected = false;

    for (let L = 0; L <= len; L += step) {
      const p = routePath.getPointAtLength(L);
      const pt = seaSvg.createSVGPoint();
      pt.x = p.x;
      pt.y = p.y;

      const screen = pt.matrixTransform(seaSvg.getScreenCTM()!);
      const hit = document.elementFromPoint(screen.x, screen.y) as HTMLElement | null;
      if (!hit) continue;

      const el = hit.closest("[id]") as HTMLElement | null;
      if (!el) {
        landDetected = true;
        continue;
      }

      const id = el.id.toLowerCase();

      if (BAD_IDS.has(id)) continue;

      if (id.startsWith("sea-")) {
        seas.add(id);
      } else {
        landDetected = true;
      }
    }

    if (landDetected) {
      racText.innerHTML = "Енот хлопает лапами: «Эй! Это суша! Надо проложить маршрут только по морям!»";
      return;
    }

    if (seas.size === 0) {
      racText.innerHTML = "Енот: «Мы будто плывём по безымянной воде…»";
      return;
    }

    const names = [...seas].join(", ");
    racText.innerHTML = `Енот показывает карту: «Мы плывём через: <strong>${names}</strong>»`;
  }

  function makeDraggable(el: HTMLElement, target: "start" | "end") {
    let drag = false;

    el.addEventListener("pointerdown", (e) => {
      drag = true;
      el.setPointerCapture(e.pointerId);
    });

    el.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const r = wrap.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top) / r.height;

      if (target === "start") {
        start.x = Math.min(1, Math.max(0, nx));
        start.y = Math.min(1, Math.max(0, ny));
      } else {
        end.x = Math.min(1, Math.max(0, nx));
        end.y = Math.min(1, Math.max(0, ny));
      }

      layoutPins();
      drawRoute();
      if (onStartMove) onStartMove({ x: start.x, y: start.y });
    });

    el.addEventListener("pointerup", () => (drag = false));
    el.addEventListener("pointercancel", () => (drag = false));
  }

  layoutPins();
  drawRoute();

  makeDraggable(pinStart, "start");
  makeDraggable(pinEnd, "end");

  window.addEventListener("resize", () => {
    layoutPins();
    drawRoute();
  });
}
