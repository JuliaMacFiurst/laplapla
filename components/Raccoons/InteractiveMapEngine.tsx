import { GEMINI_MODEL_NAME } from "../../constants";
import { useRef, useEffect, useState } from "react";
import { prompts } from "@/utils/prompts";
import flagCodeMap from "@/public/images/map/confirmed_country_codes.json";

interface InteractiveMapProps {
  svgPath: string;
  type: 'country' | 'river' | 'sea' | 'physic' | 'flag' | 'animal' | 'culture' | 'weather' | 'food';
  popupFormatter: (id: string) => string;
  styleClass: string;
}

function formatText(input: string): string {
  return input
    .replace(/#+\s*/g, "") // remove markdown headings like ###
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

export default function InteractiveMap({ svgPath, type }: InteractiveMapProps) {
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTimeRef = useRef(0);
  const fetchIdRef = useRef(0);
  
function getPrompt(mapType: InteractiveMapProps['type'], id: string): string {
  // ✅ Гарантируем использование правильного промпта, включая флаги
  const template = prompts.map[mapType]?.prompt;

  if (!template) {
    console.warn("⚠️ Нет промпта для типа карты:", mapType);
    return `Расскажи про ${id}`;
  }

  return template.replace("{{name}}", id);
}

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

  const getFlagUrl = (countryName: string): string | null => {
    const map = flagCodeMap as Record<string, string>;
    const code = map[countryName.toLowerCase()];
    return code ? `/images/map/flags-svg/${code.toLowerCase()}.svg` : null;
  };

  useEffect(() => {
    fetch(svgPath)
      .then(res => res.text())
      .then(text => {
        // Добавим id внутрь <svg>
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "image/svg+xml");
        const svgElement = doc.querySelector("svg");
        if (svgElement) {
          const className = `${type}-map`;
          svgElement.classList.add(className);
          setSvgContent(svgElement.outerHTML);
        } else {
          setSvgContent(text); // fallback
        }
        setTimeout(() => setIsVisible(true), 0);
      });
  }, [svgPath, type]);

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

  if (type === 'country' || type === 'flag') {
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


// Новый useEffect для загрузки/генерации истории по выбранному элементу
useEffect(() => {
  setAiResponse(null);
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
      const res = await fetch(`/api/get-story?type=${type}&target_id=${selectedElement}&language=ru`);
      const existing = await res.json();

      // Проверка устаревшего запроса
      if (currentFetchId !== fetchIdRef.current) {
        console.warn("⏩ Старый запрос, пропускаем результат");
        return;
      }

      let content: string | null = null;

      if (existing && existing.content) {
        content = existing.content;
        setAiResponse(content);
        // Проверка устаревшего запроса
        if (currentFetchId !== fetchIdRef.current) {
          console.warn("⏩ Старый запрос, пропускаем результат");
          return;
        }
      } else {
        const prompt = getPrompt(type, selectedElement);
        console.log("📤 Prompt для Gemini:", prompt);
        const geminiRes = await fetch("/api/raccoon-popups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: GEMINI_MODEL_NAME, prompt }),
        });

        const data = await geminiRes.json();
        // Проверка устаревшего запроса
        if (currentFetchId !== fetchIdRef.current) {
          console.warn("⏩ Старый запрос, пропускаем результат");
          return;
        }
        content = data.output || data.text;
        setAiResponse(content);
        // Проверка устаревшего запроса
        if (currentFetchId !== fetchIdRef.current) {
          console.warn("⏩ Старый запрос, пропускаем результат");
          return;
        }
        console.log("🤖 История сгенерирована через Gemini");

        await fetch("/api/save-story", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            target_id: selectedElement,
            language: "ru",
            content,
          }),
        });
        // Проверка устаревшего запроса
        if (currentFetchId !== fetchIdRef.current) {
          console.warn("⏩ Старый запрос, пропускаем результат");
          return;
        }
        console.log("💾 История сохранена после генерации");
      }

      // 🔎 Проверяем, есть ли уже сохранённые изображения в Supabase
      const existingImagesRes = await fetch(`/api/get-image-from-supabase?type=${type}&target_id=${selectedElement}`);
      

      let existingImagesData: any = null;
      try {
        existingImagesData = await existingImagesRes.json();
      } catch (err) {
        console.error("⚠️ Ошибка парсинга ответа Supabase:", err);
      }

      const existingImages = existingImagesData?.images || [];

      if (existingImages.length > 0) {
        const formatted = formatText(content || "");
        function insertImagesIntoText(html: string, imageUrls: string[]): string {
          const paragraphs = html.split(/<\/p>/);
          return paragraphs
            .map((p, i) => {
              if (i < imageUrls.length && p.trim()) {
                const float = i % 2 === 0 ? "left" : "right";
                const imgTag = `<img src="${imageUrls[i]}" style="float:${float}; width:200px; margin:8px;">`;
                return `${imgTag}${p}</p>`;
              }
              return p + "</p>";
            })
            .join("");
        }
        const illustratedContent = insertImagesIntoText(formatted, existingImages);
        setAiResponse(illustratedContent);
        setIsLoading(false);
        return; // ✅ Завершаем выполнение, Pexels не вызывается
      }


      // 🖼 Извлекаем ключевые слова через Gemini (для любого текста — из базы или нового)
      if (content) {
        const keywordPrompt = prompts.images.extractKeywords + "\n\n" + content;
        const keywordRes = await fetch("/api/raccoon-popups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: GEMINI_MODEL_NAME, prompt: keywordPrompt }),
        });
        const keywordData = await keywordRes.json();
        // Проверка устаревшего запроса
        if (currentFetchId !== fetchIdRef.current) {
          console.warn("⏩ Старый запрос, пропускаем результат");
          return;
        }
        let rawKeywords = keywordData.output || keywordData.text || "[]";

        // Убираем Markdown-обёртки типа ```json ... ```
        rawKeywords = rawKeywords
          .replace(/```json/i, "")
          .replace(/```/g, "")
          .trim();

        // Если Gemini вернул строку с кавычками, но не JSON — оборачиваем
        if (!rawKeywords.startsWith("[") && !rawKeywords.endsWith("]")) {
          rawKeywords = `[${rawKeywords}]`;
        }

        let keywords: string[] = [];
        try {
          keywords = JSON.parse(rawKeywords);
        } catch (err) {
          console.warn("⚠️ Не удалось распарсить keywords:", rawKeywords);
        }

        // 🪄 Запрашиваем картинки из Pexels
        const pexelsRes = await fetch("/api/fetch-pexels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords, type }),
        });
        const pexelsData = await pexelsRes.json();
        // Проверка устаревшего запроса
        if (currentFetchId !== fetchIdRef.current) {
          console.warn("⏩ Старый запрос, пропускаем результат");
          return;
        }
        const imageUrls: string[] = pexelsData.images || [];

        // 💾 Сохраняем изображения в Supabase
        await fetch("/api/save-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedElement,
            type,
            images: imageUrls
          }),
        });
        // Проверка устаревшего запроса
        if (currentFetchId !== fetchIdRef.current) {
          console.warn("⏩ Старый запрос, пропускаем результат");
          return;
        }

        // 🧩 Встраиваем изображения в текст
        function insertImagesIntoText(html: string, imageUrls: string[]): string {
          
          const paragraphs = html.split(/<\/p>/);
          return paragraphs
            .map((p, i) => {
              if (i < imageUrls.length && p.trim()) {
                const float = i % 2 === 0 ? "left" : "right";
                const imgTag = `<img src="${imageUrls[i]}" style="float:${float}; width:200px; margin:8px;">`;
                return `${imgTag}${p}</p>`;
              }
              return p + "</p>";
            })
            .join("");
        }

        // Удаляем дубликаты изображений
        const uniqueUrls = Array.from(new Set(imageUrls));

        // Если все картинки одинаковые или нет подходящих — пропускаем вставку
        if (uniqueUrls.length === 0 || (uniqueUrls.length === 1 && imageUrls.length > 1)) {
          console.log("🚫 Нет уникальных изображений — вставка пропущена");
          const formatted = formatText(content);
          setAiResponse(formatted);
          // Проверка устаревшего запроса
          if (currentFetchId !== fetchIdRef.current) {
            console.warn("⏩ Старый запрос, пропускаем результат");
            return;
          }
        } else {
          // Сначала форматируем текст, затем вставляем уникальные картинки
          const formatted = formatText(content);
          const illustratedContent = insertImagesIntoText(formatted, uniqueUrls);
          setAiResponse(illustratedContent);
          // Проверка устаревшего запроса
          if (currentFetchId !== fetchIdRef.current) {
            console.warn("⏩ Старый запрос, пропускаем результат");
            return;
          }
        }
      }
    } catch (err) {
      console.error("❌ Ошибка при загрузке или генерации истории:", err);
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
                  <img src="/images/raccoons/raccoons-with-mops.gif" alt="Еноты отдыхают" style="width:260px; margin-bottom:20px;" />
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
}, [selectedElement]);

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
<<<<<<< HEAD
              <img src="/images/raccoons-with-mops.gif" alt="Еноты заняты уборкой" style="width:220px; margin-bottom:10px;" />
=======
              <img src="/images/raccoons/raccoons-with-mops.gif" alt="Еноты заняты уборкой" style="width:220px; margin-bottom:10px;" />
>>>>>>> ef90e18 (Rebuild clean history)
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
<<<<<<< HEAD
              <img src="/images/raccoons-with-mops.gif" alt="Еноты отдыхают" style="width:260px; margin-bottom:20px;" />
=======
              <img src="/images/raccoons/raccoons-with-mops.gif" alt="Еноты отдыхают" style="width:260px; margin-bottom:20px;" />
>>>>>>> ef90e18 (Rebuild clean history)
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

  // 🔁 Повторное применение выделения и обработчиков после получения aiResponse
  useEffect(() => {
    if (!aiResponse || !selectedElementRef.current) return;

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

  }, [aiResponse]);

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
<<<<<<< HEAD
            <img src="/images/raccoons-with-mops.gif" alt="Еноты отдыхают" style="width:260px; margin-bottom:20px;" />
=======
            <img src="/images/raccoons/raccoons-with-mops.gif" alt="Еноты отдыхают" style="width:260px; margin-bottom:20px;" />
>>>>>>> ef90e18 (Rebuild clean history)
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
                setAiResponse(null);
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

              <div
                className="map-text"
                dangerouslySetInnerHTML={{
                  __html: aiResponse
                    ? formatText(aiResponse)
                    : selectedElement && selectedElement !== "__none__"
                      ? "<p>Генерирую рассказ, подожди минутку...</p>"
                      : "<p>Нажми на любое место на карте, и я расскажу тебе о нём!</p>"
                }}
              />

              {aiResponse && (
                <>
                  <button
                    onClick={async () => {
                      if (window.__browserCapture?.capture) {
                        window.__browserCapture.capture("map-story:save", {
                          id: selectedElement,
                          mapType: type,
                          ts: Date.now(),
                        });
                      }
                      try {
                        await fetch("/api/save-story", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            type,
                            target_id: selectedElement,
                            language: "ru",
                            content: aiResponse,
                          }),
                        });
                        setToast(`История про "${selectedElement}" сохранена в базу!`);
                        setTimeout(() => setToast(null), 4000);
                      } catch (err) {
                        console.error("Ошибка сохранения:", err);
                        setToast("Не удалось сохранить историю.");
                        setTimeout(() => setToast(null), 4000);
                      }
                    }}
                    style={{ marginTop: "12px", fontSize: "16px", padding: "6px 12px", marginRight: "10px" }}
                  >
                    💾 Сохранить рассказ
                  </button>

                  <button
                    onClick={async () => {
                      if (window.__browserCapture?.capture) {
                        window.__browserCapture.capture("map-story:regen", {
                          id: selectedElement,
                          mapType: type,
                          ts: Date.now(),
                        });
                      }
                      const prompt = getPrompt(type, selectedElement || "");
                      try {
                        const response = await fetch("/api/raccoon-popups", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ model: GEMINI_MODEL_NAME, prompt }),
                        });
                        const data = await response.json();
                        const content = data.output || data.text;
                        setAiResponse(content);
                      } catch (err) {
                        console.error("Ошибка повторной генерации:", err);
                      }
                    }}
                    style={{ marginTop: "12px", fontSize: "16px", padding: "6px 12px" }}
                  >
                    🔁 Сгенерировать по новой
                  </button>
                </>
              )}
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