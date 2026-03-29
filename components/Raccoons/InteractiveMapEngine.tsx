import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";
import type { MapPopupContent } from "@/types/mapPopup";
import { buildStudioSlidesFromCapybaraSlides } from "@/lib/capybaraStudioSlides";
import flagCodeMap from "@/utils/confirmed_country_codes.json";
import { getMapSvg } from "@/utils/storageMaps";

interface InteractiveMapProps {
  svgPath: string;
  type: 'country' | 'river' | 'sea' | 'physic' | 'flag' | 'animal' | 'culture' | 'weather' | 'food';
  popupFormatter: (id: string) => string;
  styleClass: string;
}

function splitTextToParagraphs(input: string | null | undefined): string[] {
  if (!input) {
    return [];
  }

  return input
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function isVideoMediaUrl(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }

  return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);
}

export default function InteractiveMap({ svgPath, type }: InteractiveMapProps) {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [popupContent, setPopupContent] = useState<MapPopupContent | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"slides" | "video">("slides");
  const [toast, setToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTimeRef = useRef(0);
  const fetchIdRef = useRef(0);

  const lastSelectedPath = useRef<SVGPathElement | null>(null);
  const selectedElementRef = useRef<string | null>(null);

  const [zoom, setZoom] = useState(1);
  const mapContentRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const currentYRef = useRef(0);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const popupSlides = popupContent?.slides ?? [];
  const safeCurrentSlideIndex = popupSlides.length === 0
    ? 0
    : Math.min(currentSlideIndex, Math.max(0, popupSlides.length - 1));
  const currentPopupSlide = popupSlides[safeCurrentSlideIndex] ?? null;

  const getFlagUrl = (id: string): string | null => {
    if (!id) return null;

    const lower = id.toLowerCase();

    // ✅ ISO‑коды (две буквы)
    if (/^[a-z]{2}$/.test(lower)) {
      return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/flags-svg/flags-svg/${lower}.svg`;
    }

    // ✅ Поиск кода страны по названию
    const map = flagCodeMap as Record<string, string>;
    const code = map[lower];

    return code
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/flags-svg/flags-svg/${code}.svg`
      : null;
  };

  useEffect(() => {
    getMapSvg(svgPath).then((text) => {
      if (!text) return;

      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "image/svg+xml");
      const svgElement = doc.querySelector("svg");

      if (svgElement) {
        svgElement.classList.add(`${type}-map`);
        setSvgContent(svgElement.outerHTML);
      } else {
        setSvgContent(text);
      }

      setTimeout(() => setIsVisible(true), 0);
    });
  }, [svgPath, type]);

useEffect(() => {
  setCurrentSlideIndex(0);
  setViewMode("slides");
}, [selectedElement]);

  const handleOpenCatsEditor = () => {
    if (!popupContent || popupSlides.length === 0) {
      setToast("Для этого места пока нет слайдов для редактора.");
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const importedSlides = buildStudioSlidesFromCapybaraSlides(
      popupSlides.map((slide) => ({
        text: slide.text || "",
        imageUrl: slide.imageUrl || undefined,
      })),
    );

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("catsSlides", JSON.stringify(importedSlides));
    }

    void router.push(
      { pathname: "/cats/studio", query: buildLocalizedQuery(lang) },
      undefined,
      { locale: lang },
    );
  };

  const handleOpenVideo = () => {
    const youtubeUrl = popupContent?.video?.youtubeUrl;
    const youtubeId = popupContent?.video?.youtubeId;
    if (!youtubeUrl && !youtubeId) {
      setToast("Видео для этого места пока не добавлено.");
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setViewMode("video");
  };

  const handleOpenGoogleMaps = () => {
    const googleMapsUrl = popupContent?.googleMapsUrl;
    if (!googleMapsUrl) {
      setToast("Ссылка на Google Maps для этого места пока не добавлена.");
      setTimeout(() => setToast(null), 3000);
      return;
    }

    if (typeof window !== "undefined") {
      window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
    }
  };

useEffect(() => {
  const mapContent = mapContentRef.current;
  const container = document.querySelector(".map-container") as HTMLElement | null;
  if (!mapContent || !container) return;

  const svg = mapContent.querySelector("svg");
  if (!svg) return;

  const containerRect = container.getBoundingClientRect();
  const svgRect = svg.getBBox();

  // Новый расчёт масштабирования
  let optimalZoom = 1;
  if (type === 'river') {
    optimalZoom = 1; // без масштабирования
  } else {
    const zoomX = containerRect.width / svgRect.width;
    const zoomY = containerRect.height / svgRect.height;
    optimalZoom = Math.min(zoomX, zoomY); // масштабируем, чтобы влезло
  }

  setZoom(optimalZoom);

  let offsetX: number = 0;
  let offsetY: number = 0;

  if (type === 'country' || type === 'flag' || type === 'culture' || type === 'food') {
    offsetX = (containerRect.width - svgRect.width * optimalZoom) / 2 - 200;
    offsetY = (containerRect.height - svgRect.height * optimalZoom) / 2 - 300;
  } else if (type === 'river') {
    offsetX = 0;
    offsetY = 0;
  } else if (type === 'animal') {
    offsetX = 150;
    offsetY = 0;
  } 

  currentXRef.current = offsetX;
  currentYRef.current = offsetY;
  setPosition({ x: offsetX, y: offsetY });

}, [svgContent]);


  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log("MOUSEDOWN triggered");
    isDraggingRef.current = true;
    startXRef.current = e.clientX - currentXRef.current;
    startYRef.current = e.clientY - currentYRef.current;
    if (mapContentRef.current) {
      mapContentRef.current.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    console.log("MOUSEMOVE triggered");
    currentXRef.current = e.clientX - startXRef.current;
    currentYRef.current = e.clientY - startYRef.current;
    if (mapContentRef.current) {
      mapContentRef.current.style.transform = `translate(${currentXRef.current}px, ${currentYRef.current}px) scale(${zoom})`;
    }
  };

  const handleMouseUp = () => {
    console.log("MOUSEUP triggered");
    isDraggingRef.current = false;
    if (mapContentRef.current) {
      mapContentRef.current.style.cursor = 'grab';
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    startXRef.current = e.touches[0].clientX - currentXRef.current;
    startYRef.current = e.touches[0].clientY - currentYRef.current;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    currentXRef.current = e.touches[0].clientX - startXRef.current;
    currentYRef.current = e.touches[0].clientY - startYRef.current;
    if (mapContentRef.current) {
      mapContentRef.current.style.transform = `translate(${currentXRef.current}px, ${currentYRef.current}px) scale(${zoom})`;
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };
  
//обновление положения и масштаба SVG-карты на экране, когда изменяется позиция или зум.
useEffect(() => {
  
  const mapContent = mapContentRef.current;
  if (!mapContent) return;
  // Центрировать при первоначальной установке позиции
  const offsetX = currentXRef.current;
  const offsetY = currentYRef.current;

  mapContent.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;
}, [position, zoom, svgContent, svgPath, type]);


// Read-only загрузка готового popup-контента по выбранному элементу
useEffect(() => {
  setPopupContent(null);
  const fetchAndHandleStory = async () => {
    if (!selectedElement || selectedElement === "__none__") return;
    if (isLoading) return;
    const currentFetchId = ++fetchIdRef.current;
    setIsLoading(true);

    // 🟣 Установить сиреневое выделение выбранной страны, даже если рассказ уже загружен
    const svg = mapContentRef.current?.querySelector("svg");
    const pathToColor = svg?.querySelector(`path[id='${selectedElement}']`) as SVGPathElement | null;

    if (pathToColor) {
      // Снять предыдущее выделение, если есть
      if (lastSelectedPath.current && lastSelectedPath.current !== pathToColor) {
        lastSelectedPath.current.style.fill = "#fdc09f";
      }

      // Новый способ отслеживания выбранного path
      pathToColor.setAttribute("data-selected", "true");
      pathToColor.style.fill = "#e0d4f7";
      lastSelectedPath.current = pathToColor;
      selectedElementRef.current = selectedElement;
    }

    try {
      const response = await fetch(
        `/api/map-popup-content?type=${encodeURIComponent(type)}&target_id=${encodeURIComponent(selectedElement)}&lang=${encodeURIComponent(lang)}`,
      );

      // Проверка устаревшего запроса
      if (currentFetchId !== fetchIdRef.current) {
        console.warn("⏩ Старый запрос, пропускаем результат");
        return;
      }

      if (response.status === 404) {
        setPopupContent(null);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to load popup content: ${response.status}`);
      }

      const nextPopupContent = (await response.json()) as MapPopupContent;

      if (currentFetchId !== fetchIdRef.current) {
        console.warn("⏩ Старый запрос, пропускаем результат");
        return;
      }

      setPopupContent(nextPopupContent);
    } catch (err) {
      console.error("❌ Ошибка при загрузке popup-контента:", err);
      setPopupContent(null);
    } finally {
      setIsLoading(false);
      // Проверка устаревшего запроса
      if (currentFetchId !== fetchIdRef.current) {
        console.warn("⏩ Старый запрос, пропускаем результат");
        return;
      }
    }
  };

  // --- SVG path listeners for popup/selection (for story popup) ---
  const svg = mapContentRef.current?.querySelector("svg");
  if (svg) {
    const paths = svg.querySelectorAll("path");
    if (['country', 'flag', 'physic', 'animal', 'culture', 'weather', 'food', 'sea', 'river'].includes(type)) {
      setTimeout(() => {
        paths.forEach((path) => {
          // Remove previous listeners if any
          path.onmouseenter = null;
          path.onmouseleave = null;
          path.onclick = null;

          // Mouse enter: подсветка если не lastSelectedPath.current или не тот path
          path.addEventListener("mouseenter", () => {
            if (!lastSelectedPath.current || lastSelectedPath.current !== path) {
              if (type === 'sea') {
                path.style.fill = "#99dbf5"; // голубой для моря
              } else if (type === 'river') {
                path.style.fill = "#4cb3ff"; // мягкий голубой для рек
              } else {
                path.style.fill = "#f97316"; // оранжевый для остальных
              }
            }
          });

          // Mouse leave: сбрасывать только если не выбранный path
          path.addEventListener("mouseleave", () => {
            // Если path не выбран, сбрасываем цвет
            if (!path.hasAttribute("data-selected")) {
              path.style.fill = "";
            }
            // иначе оставить сиреневым (ничего не делать)
          });

          // Click: только один path сиреневый (выбранный)
          path.onclick = (e: Event) => {
            const now = Date.now();
            if (now - lastClickTimeRef.current < 300) {
              console.log("🚫 Клик слишком частый — проигнорирован");
              return;
            }
            lastClickTimeRef.current = now;

            // 1. Блокировка во время загрузки
            if (isLoading) {
              console.log("🦝 История всё ещё загружается, клики временно заблокированы");
              setToast("Еноты ещё рассказывают предыдущую историю...");
              setTimeout(() => setToast(null), 3000);
              return;
            }

            // 2. Подсчёт кликов (антишквал)
            clickCountRef.current++;
            if (clickCountRef.current >= 7) {
              console.warn("⚠️ Слишком много кликов подряд — требуется перезагрузка страницы");
              const overlay = document.createElement("div");
              overlay.innerHTML = `
                <div style="
                  position: fixed;
                  top: 0;
                  left: 0;
                  width: 100vw;
                  height: 100vh;
                  background: rgba(0,0,0,0.7);
                  color: white;
                  font-size: 22px;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  z-index: 99999;
                ">
                  <img src="\${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/raccoons/raccoons-with-mops.gif" 
                    alt="Еноты отдыхают" 
                    style="width:260px; margin-bottom:20px;" />
                  <p>Еноты устали от кликов и ушли спать 🦝💤</p>
                  <p>Чтобы карта снова заработала, перезагрузи страницу.</p>
                  <button onclick="location.reload()" style="
                    margin-top: 20px;
                    font-size: 18px;
                    padding: 10px 20px;
                    background: #f97316;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                  ">🔄 Перезагрузить</button>
                </div>
              `;
              document.body.appendChild(overlay);
              clickCountRef.current = 0;
              return;
            }

            if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
            clickTimerRef.current = setTimeout(() => (clickCountRef.current = 0), 8000);

            // 3. Обработка нормального клика
            const id = (e.currentTarget as SVGPathElement).id;
            // ✅ Diagnostic: path clicked but missing ID
            if (!id) {
              window.__browserCapture?.capture?.("map-click:no-id", {
                elementClass: (e.currentTarget as HTMLElement)?.className,
                tag: (e.currentTarget as HTMLElement)?.tagName,
                ts: Date.now(),
              });
              console.warn("⚠️ map-click:no-id — missing ID on clicked path");
              return;
            }
            console.log("✅ CLICK handler — id:", id);
            // 🗺 AI Capture — попытка открытия попапа
            window.__browserCapture?.capture?.("map-popup:open-attempt", {
              id,
              mapType: type,
              ts: Date.now(),
            });
            // 🦝 Log popup open failed if loading
            if (isLoading) {
              window.__browserCapture?.capture?.("map-popup:open-failed", {
                id,
                mapType: type,
                reason: "loading-blocked",
                ts: Date.now(),
              });
            }

            // 🐾 AI Capture — клик по стране
            window.__browserCapture?.capture?.("country-click", {
              id,
              mapType: type,
              ts: Date.now(),
            });

            if (type === "river") {
              const bbox = (e.currentTarget as SVGPathElement).getBBox();
              if (bbox.width > 150 && bbox.height > 80) {
                console.log("🚫 Клик по фону материка проигнорирован");
                return;
              }
            }

            if (lastSelectedPath.current && lastSelectedPath.current !== e.currentTarget) {
              lastSelectedPath.current.style.fill = "#fdc09f";
            }

            const pathElement = e.currentTarget as SVGPathElement;
            pathElement.style.fill = "#e0d4f7";
            lastSelectedPath.current = pathElement;
            selectedElementRef.current = id;

            setSelectedElement(id);
            setPosition({ x: 0, y: 0 });
          };
        });
      }, 0);
    }
  }

  fetchAndHandleStory();
}, [lang, selectedElement, type]);

  // --- Добавляем refs и состояние для перетаскивания попапа ---
 const popupRef = useRef<HTMLDivElement | null>(null);
  const isPopupDraggingRef = useRef(false);
  const [popupPos, setPopupPos] = useState({ x: 60, y: 60 });

  // Обработчик для перетаскивания попапа
  const handlePopupMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {

    isPopupDraggingRef.current = true;
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = popupPos.x;
    const startTop = popupPos.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setPopupPos({ x: startLeft + dx, y: startTop + dy });
      
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      isPopupDraggingRef.current = false;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // --- Обработчик клика по фону для закрытия попапа ---
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Новое условие — если сейчас идёт перетаскивание попапа, игнорируем клик
      if (isPopupDraggingRef.current) {
        console.log("🛑 Клик игнорируется — в процессе перетаскивания попапа");
        return;
      }
      const path = e.composedPath();
      let clickedInsidePopup = false;
      if (popupRef.current && path && path.length) {
        // Если любой элемент в composedPath находится внутри popupRef.current — считаем клик внутри
        clickedInsidePopup = path.some((el) => {
          try {
            return el instanceof Node && popupRef.current && popupRef.current.contains(el as Node);
          } catch (err) {
            return false;
          }
        });
      }
      // также, на всякий случай, учитывать классы (fallback)
      if (!clickedInsidePopup) {
        clickedInsidePopup = path.some(
          (el) =>
            el instanceof HTMLElement &&
            (
              el.classList.contains("country-popup") ||
              el.classList.contains("map-text")
            )
        );
      }

      if (!clickedInsidePopup) {
        // 🦝 AI Capture: map-popup:close (reason = map-click)
              if (window.__browserCapture?.capture) {
        window.__browserCapture.capture("map-popup:close-attempt", {
          mapType: type,
          reason: "map-click",
          ts: Date.now(),
        });
      }
        setSelectedElement("__none__");
        // ✅ Close success
        if (window.__browserCapture?.capture) {
          window.__browserCapture.capture("map-popup:close-success", {
            mapType: type,
            ts: Date.now(),
          });
        }
        selectedElementRef.current = "__none__";
        setAiResponse(null);
        if (lastSelectedPath.current) {
          lastSelectedPath.current.style.fill = "#fdc09f";
          lastSelectedPath.current.removeAttribute("data-selected");
          lastSelectedPath.current = null;
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔁 Повторная установка path onclick при zoom, если попап закрыт
  useEffect(() => {
    // Только если DOM готов
    const mapContent = mapContentRef.current;
    if (!mapContent) return;

    const svg = mapContent.querySelector("svg");
    if (!svg) return;

    const paths = svg.querySelectorAll("path");
    // ✅ Diagnostic: handlers rebound due to zoom change
    window.__browserCapture?.capture?.("map-rebind:paths", {
      count: paths.length,
      reason: "zoom-change",
      ts: Date.now(),
    });

    paths.forEach((path) => {
      // Remove previous listeners if any
      path.onmouseenter = null;
      path.onmouseleave = null;
      path.onclick = null;

      // Mouse enter: подсветка если не lastSelectedPath.current или не тот path
      path.addEventListener("mouseenter", () => {
        if (!lastSelectedPath.current || lastSelectedPath.current !== path) {
          if (type === 'sea') {
            path.style.fill = "#99dbf5"; // голубой для моря
          } else if (type === 'river') {
            path.style.fill = "#4cb3ff"; // мягкий голубой для рек
          } else {
            path.style.fill = "#f97316"; // оранжевый для остальных
          }
        }
      });

      // Mouse leave: сбрасывать только если не выбранный
      path.addEventListener("mouseleave", () => {
        if (!lastSelectedPath.current || lastSelectedPath.current !== path) {
          path.style.fill = "";
        }
      });

      // Click: только один path сиреневый (выбранный)
      path.onclick = (e: Event) => {
        // --- Антишторм-механизм кликов ---
        const now = Date.now();
        if (now - lastClickTimeRef.current < 300) {
          console.log("🚫 Клик слишком частый — проигнорирован");
          return;
        }
        lastClickTimeRef.current = now;
        // Если идёт генерация — блокируем новые клики
        if (isLoading) {
          console.log("🦝 История ещё загружается, новый клик заблокирован");
            setToast("Енот ещё рассказывает предыдущую историю...");
            setAiResponse(`
              <div style='text-align:center;'>
              <img src=\`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/raccoons/raccoons-with-mops.gif\` alt="Еноты заняты уборкой" style="width:220px; margin-bottom:10px;" />
              <p>Подожди немного — еноты моют карту после предыдущей истории!</p>
            </div>
          `);
          return;
        }
        // Счётчик кликов подряд
        clickCountRef.current++;
        if (clickCountRef.current >= 7) {
          console.warn("⚠️ Слишком много кликов подряд — требуется перезагрузка страницы");

          // Прямое уведомление поверх всего интерфейса, вне React
          const overlay = document.createElement("div");
          overlay.innerHTML = `
            <div style="
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              background: rgba(0,0,0,0.7);
              color: white;
              font-size: 22px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              z-index: 99999;
            ">
              <img src="\${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/raccoons/raccoons-with-mops.gif" alt="Еноты отдыхают" style="width:260px; margin-bottom:20px;" />
              <p>Еноты устали от кликов и ушли спать 🦝💤</p>
              <p>Чтобы карта снова заработала, перезагрузи страницу.</p>
              <button onclick="location.reload()" style="
                margin-top: 20px;
                font-size: 18px;
                padding: 10px 20px;
                background: #f97316;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
              ">🔄 Перезагрузить</button>
            </div>
          `;
          document.body.appendChild(overlay);
          clickCountRef.current = 0;
          return;
        }
        if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
        clickTimerRef.current = setTimeout(() => {
          clickCountRef.current = 0;
        }, 8000);
        //Это переназначение обработчиков после изменения zoom
        const id = (e.currentTarget as SVGPathElement).id;
        console.log("✅ CLICK handler — id:", id);
        // 🦝 Log popup open attempt
        if (window.__browserCapture?.capture) {
          window.__browserCapture.capture("map-popup:open-attempt", {
            id,
            mapType: type,
            ts: Date.now(),
          });
        }
        // 🦝 Log popup open failed if loading
        if (isLoading) {
          window.__browserCapture?.capture?.("map-popup:open-failed", {
            id,
            mapType: type,
            reason: "loading-blocked",
            ts: Date.now(),
          });
        }
        // 🏞 Игнорируем клики по фоновым материкам на карте рек
        if (type === "river") {
          const bbox = (e.currentTarget as SVGPathElement).getBBox();
          // Если path слишком большой (фон), пропускаем
          if (bbox.width > 150 && bbox.height > 80) {
            console.log("🚫 Клик по фону материка проигнорирован");
            return;
          }
        }

        const prevSelected = lastSelectedPath.current;
        if (prevSelected && prevSelected !== path) {
          prevSelected.style.fill = "#fdc09f";
        }

        // persist current
        selectedElementRef.current = id;
        lastSelectedPath.current = path;

        setSelectedElement(id);
          // ✅ Log popup open success
          if (window.__browserCapture?.capture) {
            window.__browserCapture.capture("map-popup:open-success", {
              id,
              mapType: type,
              ts: Date.now(),
            });
          }
        setPosition({ x: 0, y: 0 });

        path.style.fill = "#e0d4f7";
      };
    });

  }, [zoom]);

  // 🔁 Повторное применение выделения и обработчиков после получения popupContent
  useEffect(() => {
    if (!popupContent || !selectedElementRef.current) return;

    const svg = mapContentRef.current?.querySelector("svg");
    if (!svg) return;

    const path = svg.querySelector(`path#${selectedElementRef.current}`) as SVGPathElement | null;
    if (!path) return;

    // ✅ Diagnostic: check if selectedElementRef and highlighted path match
    if (lastSelectedPath.current?.id !== selectedElementRef.current) {
      window.__browserCapture?.capture?.("map-id-mismatch", {
        lastSelected: lastSelectedPath.current?.id,
        refId: selectedElementRef.current,
        ts: Date.now(),
      });
      console.warn("⚠️ map-id-mismatch — persisted selected path differs from ref");
    }

    // Восстановить выделение
    path.style.fill = "#e0d4f7";
    path.setAttribute("data-selected", "true");
    lastSelectedPath.current = path;

    // Повторно навесить mouseenter/mouseleave
    path.addEventListener("mouseenter", () => {
      if (!lastSelectedPath.current || lastSelectedPath.current !== path) {
        if (type === 'sea') {
          path.style.fill = "#99dbf5"; // голубой для моря
        } else if (type === 'river') {
          path.style.fill = "#4cb3ff"; // мягкий голубой для рек
        } else {
          path.style.fill = "#f97316"; // оранжевый для остальных
        }
      }
    });

    path.addEventListener("mouseleave", () => {
      if (!path.hasAttribute("data-selected")) {
        path.style.fill = "";
      }
    });

  }, [popupContent]);

  // --- Сторожевой механизм от зависания интерфейса ---
  useEffect(() => {
    const watchdog = setInterval(() => {
      if (isLoading && selectedElement === "__none__") {
        console.warn("🦝 Карта зависла: isLoading=true, но элемент не выбран. Показываем оверлей.");

        const overlay = document.createElement("div");
        overlay.innerHTML = `
          <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.7);
            color: white;
            font-size: 22px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 99999;
          ">
            <img src="\${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/raccoons/raccoons-with-mops.gif" alt="Еноты отдыхают" style="width:260px; margin-bottom:20px;" />
            <p>Кажется, еноты застряли с предыдущей историей 🦝💤</p>
            <p>Перезагрузи страницу, чтобы вернуть карту к жизни.</p>
            <button onclick="location.reload()" style="
              margin-top: 20px;
              font-size: 18px;
              padding: 10px 20px;
              background: #f97316;
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
            ">🔄 Перезагрузить</button>
          </div>
        `;
        document.body.appendChild(overlay);
        clearInterval(watchdog);
      }
    }, 5000);

    return () => clearInterval(watchdog);
  }, [isLoading, selectedElement]);

  return (
    <div className="world-map-wrapper">
      <div className="map-container">
        <div
          ref={mapContentRef}
          className={`map-content transition-opacity duration-700 ease-in-out ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          dangerouslySetInnerHTML={{ __html: svgContent || "" }}
        />

        {/* --- SVG Path Bind Effect --- */}
        {/*
          After SVG content changes, rebind path click handlers (for explicit diagnostic and robustness).
        */}
        {(() => { return null; })()}
        {/* EFFECT: Bind svg paths after svgContent changes */}
        {null}
        {/* The effect is below */}
        {/* (see end of file for useEffect) */}

        {selectedElement !== "__none__" && (
          <div
            ref={popupRef}
            onMouseDown={handlePopupMouseDown}
            className="country-popup"
            style={{
              left: popupPos.x,
              top: popupPos.y,
              position: "absolute",
            }}
          >
            <button
              onClick={() => {
                setSelectedElement("__none__");
                // 🦝 AI Capture: map-popup:close event (NEW)
                if (window.__browserCapture?.capture) {
                  window.__browserCapture.capture("map-popup:close", {
                    mapType: type,
                    ts: Date.now(),
                  });
                }
                selectedElementRef.current = "__none__";
                setPosition({ x: 0, y: 0 });
                setPopupContent(null);
                if (lastSelectedPath.current) {
                  lastSelectedPath.current.style.fill = "#fdc09f";
                  lastSelectedPath.current = null;
                }
              }}
              className="country-close-button"
              aria-label="Закрыть"
            >
              ×
            </button>
            <>
              {type === "flag" && getFlagUrl(selectedElement || "") && (
                <div style={{ textAlign: "center", marginBottom: "12px" }}>
                  <img
                    src={getFlagUrl(selectedElement!)!}
                    alt={`Флаг ${selectedElement}`}
                    style={{
                      width: "280px",
                      height: "auto",
                      borderRadius: "6px",
                      border: "1px solid #ddd",
                      marginBottom: "10px"
                    }}
                  />
                  <div style={{ fontSize: "20px", fontWeight: "600", marginBottom: "10px" }}>
                    {selectedElement?.toUpperCase()}
                  </div>
                </div>
              )}

              <div className="map-text">
                {popupContent ? (
                  <>
                    {viewMode === "video" ? (
                      (() => {
                        const youtubeId = popupContent.video?.youtubeId?.trim() || "";
                        return youtubeId ? (
                          <>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "8px",
                                marginBottom: "12px",
                              }}
                            >
                              <div style={{ fontSize: "14px", fontWeight: 600 }}>
                                Видео
                              </div>
                              <button
                                type="button"
                                onClick={() => setViewMode("slides")}
                                style={{ padding: "6px 10px", fontSize: "14px", borderRadius: "8px" }}
                              >
                                ×
                              </button>
                            </div>

                            <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", marginBottom: "12px" }}>
                              <iframe
                                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&controls=1&modestbranding=1&rel=0`}
                                title={popupContent.video?.title || popupContent.title || selectedElement || "Map video"}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  width: "100%",
                                  height: "100%",
                                  border: 0,
                                  borderRadius: "8px",
                                }}
                              />
                            </div>

                            {popupContent.video?.title ? (
                              <p style={{ marginTop: 0 }}>{popupContent.video.title}</p>
                            ) : null}
                          </>
                        ) : (
                          <p>Видео для этого места пока не добавлено.</p>
                        );
                      })()
                    ) : (
                      (() => {
                        const imageUrl =
                          typeof currentPopupSlide?.imageUrl === "string" ? currentPopupSlide.imageUrl.trim() : "";
                        const isVideoSlide = isVideoMediaUrl(imageUrl);
                        const paragraphs = splitTextToParagraphs(currentPopupSlide?.text || "");
                        const creditLine = currentPopupSlide?.imageCreditLine?.trim() || "";

                        return (
                          <>
                            {popupSlides.length > 0 ? (
                              <>
                                {imageUrl ? (
                                  <div style={{ marginBottom: "12px", textAlign: "center" }}>
                                    {isVideoSlide ? (
                                      <video
                                        src={imageUrl}
                                        autoPlay
                                        muted
                                        loop
                                        controls
                                        playsInline
                                        style={{ width: "100%", maxWidth: "320px", borderRadius: "8px" }}
                                      />
                                    ) : (
                                      <img
                                        src={imageUrl}
                                        style={{ width: "100%", maxWidth: "320px", borderRadius: "8px" }}
                                        alt={popupContent.title || selectedElement || "Map slide"}
                                      />
                                    )}
                                    {creditLine ? (
                                      <div
                                        style={{
                                          marginTop: "6px",
                                          fontSize: "12px",
                                          lineHeight: 1.35,
                                          color: "#666",
                                          textAlign: "left",
                                        }}
                                      >
                                        {creditLine}
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}

                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "8px",
                                    marginBottom: "12px",
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                                    disabled={safeCurrentSlideIndex === 0}
                                    style={{ padding: "6px 10px", fontSize: "16px" }}
                                  >
                                    ←
                                  </button>
                                  <div style={{ fontSize: "14px", fontWeight: 600 }}>
                                    {safeCurrentSlideIndex + 1} / {popupSlides.length}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setCurrentSlideIndex((prev) => Math.min(popupSlides.length - 1, prev + 1))}
                                    disabled={safeCurrentSlideIndex === popupSlides.length - 1}
                                    style={{ padding: "6px 10px", fontSize: "16px" }}
                                  >
                                    →
                                  </button>
                                </div>

                                {paragraphs.length > 0 ? (
                                  paragraphs.map((paragraph, index) => (
                                    <p key={`${selectedElement}-slide-${safeCurrentSlideIndex}-paragraph-${index}`}>{paragraph}</p>
                                  ))
                                ) : (
                                  <p>У этого слайда пока нет текста.</p>
                                )}

                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr",
                                    gap: "8px",
                                    marginTop: "16px",
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={handleOpenVideo}
                                    style={{ padding: "10px 12px", fontSize: "14px", borderRadius: "8px" }}
                                  >
                                    Посмотреть видео
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleOpenCatsEditor}
                                    style={{ padding: "10px 12px", fontSize: "14px", borderRadius: "8px" }}
                                  >
                                    Открыть в редакторе котиков
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleOpenGoogleMaps}
                                    style={{ padding: "10px 12px", fontSize: "14px", borderRadius: "8px" }}
                                  >
                                    Открыть на большой Google карте
                                  </button>
                                </div>
                              </>
                            ) : (
                              <p>Для этого места контент пока не готов.</p>
                            )}
                          </>
                        );
                      })()
                    )}
                  </>
                ) : selectedElement && selectedElement !== "__none__" ? (
                  isLoading ? (
                    <p>Загружаю готовый контент, подожди минутку...</p>
                  ) : (
                    <p>Для этого места контент пока не готов.</p>
                  )
                ) : (
                  <p>Нажми на любое место на карте, и я покажу тебе готовый материал о нём.</p>
                )}
              </div>
            </>
          </div>
        )}
      </div>

      {/* Переместили сюда */}
      <div className="zoom-buttons">
        <button
          onClick={() => {
            setZoom((prev) => {
              const newZoom = Math.min(prev * 1.2, 3);
              currentXRef.current = 0;
              currentYRef.current = 0;
              setPosition({ x: 0, y: 0 });
              return newZoom;
            });
          }}
        >
          ＋
        </button>
        <button
          onClick={() => {
            setZoom((prev) => {
              const newZoom = Math.max(prev / 1.2, 0.5);
              currentXRef.current = 0;
              currentYRef.current = 0;
              setPosition({ x: 0, y: 0 });
              return newZoom;
            });
          }}
        >
          －
        </button>
      </div>
    {toast && (
      <div
        className="toast fixed bottom-6 right-6 z-50 bg-black text-white px-4 py-2 rounded shadow"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          backgroundColor: "black",
          color: "white",
          padding: "10px 16px",
          borderRadius: "6px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
        }}
      >
        {toast}
      </div>
    )}
    </div>
  );
}

/*
// --- Explicit SVG Path Binding with Diagnostics ---
// This is a robust re-binder for SVG path click handlers.
const svgRef = mapContentRef;
const lastBindRef = useRef<number>(0);

const onPathClick = (e: Event) => {
  // Click handler for SVG paths (diagnostic placeholder)
  // This logic can be customized if needed
};

function bindSvgPaths() {
  const container = svgRef.current;
  if (!container) return;

  const svg = container.querySelector("svg");
  if (!svg) return;

  // Поддерживаем и data-id, и id (разные версии карт)
  const paths = svg.querySelectorAll("path[data-id], path[id]");
  paths.forEach((p) => {
    (p as SVGPathElement).style.cursor = "pointer";
    (p as SVGPathElement).removeEventListener("click", onPathClick as any);
    (p as SVGPathElement).addEventListener("click", onPathClick as any);
  });

  window.__browserCapture?.capture?.("map-rebind:paths", {
    count: paths.length,
    reason: "explicit-bind",
    ts: new Date().toISOString(),
  });

  lastBindRef.current = Date.now();
}

// --- Effect: Bind SVG paths after SVG content loads ---
useEffect(() => {
  if (!svgContent) return;

  const t1 = setTimeout(bindSvgPaths, 20);
  const t2 = setTimeout(bindSvgPaths, 150);
  const t3 = setTimeout(bindSvgPaths, 400);

  return () => {
    clearTimeout(t1);
    clearTimeout(t2);
    clearTimeout(t3);
  };
}, [svgContent, type]);
*/
