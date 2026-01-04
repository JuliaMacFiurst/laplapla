"use client";

/**
 * SnowDriftVisual
 * =================
 *
 * ВИЗУАЛЬНЫЙ компонент обочины / сужения дороги.
 *
 * ❗️Ответственность:
 * - отрисовать ОДИН логический сегмент SnowDriftSegment
 * - перевести world-координаты → screen-координаты
 * - гарантировать, что визуал и hit-zone
 *   используют ОДНУ И ТУ ЖЕ геометрию
 *
 * ❌ НЕ:
 * - не решает когда спавниться
 * - не знает про game loop
 * - не влияет на obstacles
 * - не содержит логики движения
 */

import { SNOWDRIFT_VARIANTS } from "./obstacles";
import { SnowDriftSegment } from "../SnowdriftController";

interface SnowDriftVisualProps {
  segment: SnowDriftSegment;

  /** текущий world scroll */
  scrollX: number;

  /** границы базового коридора */
  baseUpperLimit: number;
  baseLowerLimit: number;

  /** высота сцены (для overlay-изображений) */
  stageHeight: number;

  /** ширина сцены (чтобы overlay совпадал с фоном по масштабу) */
  stageWidth?: number;

  /** debug: показывать hit-zone */
  debug?: boolean;
}

export default function SnowDriftVisual({
  segment,
  scrollX,
  baseUpperLimit,
  baseLowerLimit,
  stageHeight,
  stageWidth,
  debug = false,
}: SnowDriftVisualProps) {
  /**
   * ─────────────────────────
   * Геометрия (source of truth)
   * ─────────────────────────
   *
   * ВАЖНО:
   * Сугроб — это ПОЛНОРАЗМЕРНАЯ PNG-калька сцены.
   * Мы НИКОГДА не двигаем её по Y.
   * Мы ТОЛЬКО вырезаем нужный сегмент по X.
   */

  // world → screen
  const segmentLeft = segment.fromX - scrollX;

  // ⚠️ Визуал сугроба остаётся полноразмерным и режется контейнером
  const visualWidth = stageWidth ?? 0;

  // ⚙️ НАСТРАИВАЕМЫЕ ПАРАМЕТРЫ HIT-ZONE
  // Эти параметры НИКОГДА не влияют на визуал, только на физику столкновения.
  // ширина опасной зоны
  const HIT_ZONE_WIDTH = 340;
  // базовое смещение hit-zone относительно начала сегмента
  // (+) вправо, (-) влево
  const HIT_ZONE_OFFSET_X = 250;
  // дополнительная «тонкая» ручка для подстройки ощущений
  // полезна, если hit-zone кажется слишком "впереди" или "позади"
  const HIT_ZONE_FINE_TUNE_X = 250;

  const isUpper = segment.blocksLane === "upper";

  /**
   * Hit-zone в координатах СЦЕНЫ
   * (совпадает с визуальным телом сугроба)
   */
  const hitTop = isUpper
    ? baseUpperLimit
    : baseLowerLimit - segment.offsetY;

  const hitHeight = segment.offsetY;

  return (
    <>
      {/* ───────────── ВИЗУАЛ СУГРОБА (X-срез PNG-кальки) ───────────── */}
      <div
        style={{
          position: "absolute",
          left: segmentLeft,
          top: 0,
          width: visualWidth,
          height: stageHeight,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 20,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: stageWidth ?? "100%",
            height: stageHeight,
            backgroundImage: `url(${SNOWDRIFT_VARIANTS[segment.blocksLane]})`,
            backgroundRepeat: "no-repeat",
            backgroundPositionX: "0px",
            backgroundPositionY: "0px",
            backgroundSize: stageWidth
              ? `${stageWidth}px ${stageHeight}px`
              : "100% 100%",
          }}
        />
      </div>

      {/* ───────────── HIT-ZONE ───────────── */}
      {debug && (
        <div
          style={{
            position: "absolute",
            left: segmentLeft + HIT_ZONE_OFFSET_X + HIT_ZONE_FINE_TUNE_X,
            top: hitTop,
            width: HIT_ZONE_WIDTH,
            height: hitHeight,
            background: "rgba(255, 0, 0, 0.35)",
            pointerEvents: "none",
            zIndex: 30,
          }}
        />
      )}
    </>
  );
}
