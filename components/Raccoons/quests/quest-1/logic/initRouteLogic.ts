// initRouteLogic.ts

export interface RouteLogicParams {
  wrap: HTMLDivElement;
  pathEl: SVGPathElement;
  routeSvg: SVGSVGElement;
  pinStart: HTMLDivElement;
  pinEnd: HTMLDivElement;
  racText: HTMLDivElement;
  svalMk: HTMLDivElement;
  start: { x: number; y: number };
  sval: { x: number; y: number };
}

export function initRouteLogic(params: RouteLogicParams) {
  const { wrap, pathEl, routeSvg, pinStart, pinEnd, racText, svalMk, start, sval } = params;

  let routeType = "";

  // Вот они — вшиты прямо тут, как ты просила
  const BAD_IDS = new Set([
    "btn-start",
    "btn-end",
    "map-svg-container",
    "route-svg",
    "route-path",
    "map-wrap",
    "route-root",
    "svalbard-marker",
    "__next",
  ]);

  const COUNTRY_NAMES_RU: Record<string, string> = {
    "united-kingdom": "Великобритания",
    "france": "Франция",
    "norway": "Норвегия",
    "sweden": "Швеция",
    "finland": "Финляндия",
    "russia": "Россия",
    "ukraine": "Украина",
    "turkey": "Турция",
    "tunisia": "Тунис",
    "libya": "Ливия",
    "chad": "Чад"
  };

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

    drawRoute();
  }

  // -------------------------------
  // PX → SVG coords
  // -------------------------------
  function toSvg(px: number, py: number) {
    const vb = routeSvg.viewBox.baseVal;
    const r = wrap.getBoundingClientRect();

    return {
      x: vb.x + (px / r.width) * vb.width,
      y: vb.y + (py / r.height) * vb.height,
    };
  }

  // -------------------------------
  // DRAW ROUTE
  // -------------------------------
  function drawRoute() {
    if (!routeType) return pathEl.setAttribute("d", "");

    const r = wrap.getBoundingClientRect();
    const A = toSvg(start.x * r.width, start.y * r.height);
    const B = toSvg(sval.x * r.width, sval.y * r.height);

    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const dist = Math.hypot(dx, dy);

    let d = "";

    if (routeType === "straight") {
      d = `M ${A.x} ${A.y} L ${B.x} ${B.y}`;
    } else if (routeType === "arc") {
      const mx = (A.x + B.x) / 2;
      const my = (A.y + B.y) / 2 - dist * 0.5;
      d = `M ${A.x} ${A.y} Q ${mx} ${my} ${B.x} ${B.y}`;
    } else if (routeType === "zigzag") {
      const N = 8;
      const amp = dist * 0.3;
      const ang = Math.atan2(dy, dx);
      const nx = -Math.sin(ang);
      const ny = Math.cos(ang);
      const seg = [];

      for (let i = 1; i < N; i++) {
        const t = i / N;
        const bx = A.x + dx * t;
        const by = A.y + dy * t;
        const s = i % 2 === 0 ? 1 : -1;
        seg.push(`L ${bx + nx * amp * s} ${by + ny * amp * s}`);
      }

      d = `M ${A.x} ${A.y} ${seg.join(" ")} L ${B.x} ${B.y}`;
    }

    pathEl.setAttribute("d", d);
  }

  // -------------------------------
  // HIT TEST
  // -------------------------------
  function getCountries() {
    const out = new Set<string>();
    const len = pathEl.getTotalLength();
    const STEP = 12;

    for (let L = 0; L <= len; L += STEP) {
      const p = pathEl.getPointAtLength(L);
      const sp = routeSvg.createSVGPoint();
      sp.x = p.x;
      sp.y = p.y;

      const scr = sp.matrixTransform(routeSvg.getScreenCTM()!);

      const prev = pathEl.style.pointerEvents;
      pathEl.style.pointerEvents = "none";

      const el = document.elementFromPoint(scr.x, scr.y);

      pathEl.style.pointerEvents = prev;
      if (!el) continue;

      const hit = (el as HTMLElement).closest("[id]") as HTMLElement | null;
      if (!hit) continue;

      const id = hit.id.toLowerCase();

      if (!BAD_IDS.has(id)) out.add(id);
    }

    return [...out];
  }

  // -------------------------------
  // Raccoon speaks
  // -------------------------------
  function speak() {
    if (!routeType) {
      racText.innerHTML = "Енот: «Выбери тип маршрута — прямая, дуга или зигзаг.»";
      return;
    }

    const ids = getCountries();
    if (!ids.length) {
      racText.innerHTML = "Енот щурится: «Похоже, летим над океаном!»";
      return;
    }

    const names = ids.map((id) => COUNTRY_NAMES_RU[id] || id);

    racText.innerHTML = `Енот ведёт пальцем: «Мы пролетаем над: <strong>${names.join(
      ", "
    )}</strong>»`;
  }

  // -------------------------------
  // BUTTONS
  // -------------------------------
  document.querySelectorAll(".quest-route-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      routeType = (btn as HTMLElement).dataset.type!;
      document
        .querySelectorAll(".quest-route-btn")
        .forEach((b) => b.classList.remove("active"));

      btn.classList.add("active");
      drawRoute();
      speak();
    });
  });

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
      if (routeType) speak();
    });

    el.addEventListener("pointerup", () => (drag = false));
    el.addEventListener("pointercancel", () => (drag = false));
  }

  makeDraggable(pinStart);

  window.addEventListener("resize", layoutPins, { passive: true });
  layoutPins();
}