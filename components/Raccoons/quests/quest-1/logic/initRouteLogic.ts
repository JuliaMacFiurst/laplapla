import countryNames from "@/utils/country_names.json";
// initRouteLogic.ts

export interface RouteLogicParams {
  wrap: HTMLDivElement;
  pinStart: HTMLDivElement;
  pinEnd: HTMLDivElement;
  racText: HTMLDivElement;
  svalMk: HTMLDivElement;
  start: { x: number; y: number };
  sval: { x: number; y: number };
  onStartMove?: () => void;
}

export function initRouteLogic(params: RouteLogicParams) {
  const { wrap, pinStart, pinEnd, racText, svalMk, start, sval, onStartMove } = params;

  racText.innerHTML = "Енот: «Карта готова. Шпицберген отмечен кружочком!»";

  // -------------------------------
  // POSITION PINS
  // -------------------------------
  function layoutPins() {
    const r = wrap.getBoundingClientRect();
    const PAD = 16;
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

    const sx = clamp(start.x * r.width, PAD, r.width - PAD);
    const sy = clamp(start.y * r.height, PAD, r.height - PAD);
    const ex = clamp(sval.x * r.width, PAD, r.width - PAD);
    const ey = clamp(sval.y * r.height, PAD, r.height - PAD);

    pinStart.style.left = sx + "px";
    pinStart.style.top = sy + "px";

    pinEnd.style.left = ex + "px";
    pinEnd.style.top = ey + "px";

    svalMk.style.left = ex + "px";
    svalMk.style.top = ey + "px";

    const lbl = wrap.querySelector("#svalbard-label") as HTMLElement | null;
    if (lbl) {
      lbl.style.left = ex + "px";
      lbl.style.top = ey + 26 + "px";
    }
  }

  // -------------------------------
  // DRAG START PIN
  // -------------------------------
  function makeDraggable(el: HTMLElement) {
    let drag = false;

    el.addEventListener("pointerdown", (e) => {
      drag = true;
      el.setPointerCapture(e.pointerId);
    });

    el.addEventListener("pointermove", (e) => {
      if (!drag) return;

      const r = wrap.getBoundingClientRect();
      const x = Math.min(r.width, Math.max(0, e.clientX - r.left));
      const y = Math.min(r.height, Math.max(0, e.clientY - r.top));

      start.x = x / r.width;
      start.y = y / r.height;

      layoutPins();
      if (onStartMove) onStartMove();
    });

    el.addEventListener("pointerup", () => (drag = false));
    el.addEventListener("pointercancel", () => (drag = false));
  }

  makeDraggable(pinStart);

  window.addEventListener("resize", layoutPins, { passive: true });
  layoutPins();
}