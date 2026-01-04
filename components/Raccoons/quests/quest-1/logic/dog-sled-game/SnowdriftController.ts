

/**
 * SnowDriftController
 * ===================
 *
 * Этот модуль — ЛОГИЧЕСКИЙ контроллер обочин (snowdrift / road narrowing).
 *
 * ❗️Важно:
 * - Здесь НЕТ React
 * - Здесь НЕТ DOM
 * - Здесь НЕТ картинок
 * - Здесь НЕТ hit-zone в пикселях экрана
 *
 * Это чистая модель мира (world space), которую можно:
 * - переиспользовать в других играх
 * - тестировать отдельно
 * - визуализировать любым способом
 *
 * Контроллер отвечает ТОЛЬКО за:
 * - когда появляется сужение дороги
 * - где (по X)
 * - какую полосу оно блокирует
 * - какой эффект оказывает на движение
 */

/* ──────────────────────────────
 * Базовые типы
 * ────────────────────────────── */

export type TrackLane = "upper" | "lower";

/**
 * Геометрическое описание одного сужения дороги.
 * Это ЕДИНСТВЕННЫЙ источник истины для:
 * - ограничения движения
 * - hit-zone
 * - визуализации
 */
export interface SnowDriftSegment {
  /** Уникальный id сегмента */
  id: string;

  /** Начало сегмента в world-X */
  fromX: number;

  /** Конец сегмента в world-X */
  toX: number;

  /**
   * Какая полоса ПОЛНОСТЬЮ заблокирована
   * (другая считается проходом)
   */
  blocksLane: TrackLane;

  /**
   * На сколько пикселей по Y сужается коридор движения
   * (используется GameStage)
   */
  offsetY: number;
}

/* ──────────────────────────────
 * Конфигурация контроллера
 * ────────────────────────────── */

export interface SnowDriftConfig {
  /** Минимальное расстояние между сугробами */
  minGapX: number;

  /** Минимальная длина одного сугроба */
  minLength: number;

  /** Максимальная длина одного сугроба */
  maxLength: number;

  /** Сужение коридора по Y */
  offsetY: number;
}

/* ──────────────────────────────
 * SnowDriftController
 * ────────────────────────────── */

export class SnowDriftController {
  private config: SnowDriftConfig;
  private segments: SnowDriftSegment[] = [];
  private lastEndX = 0;
  private idCounter = 0;

  constructor(config: SnowDriftConfig) {
    this.config = config;
  }

  /**
   * Обновление контроллера.
   * Вызывается каждый тик игрового цикла.
   *
   * @param worldX - текущая позиция мира
   * @param spawnUntilX - до какого X мы хотим гарантировать генерацию
   */
  update(worldX: number, spawnUntilX: number) {
    // Удаляем сегменты, которые гарантированно ушли влево
    this.segments = this.segments.filter(
      (s) => s.toX >= worldX
    );

    // Генерируем новые сегменты при необходимости
    while (this.lastEndX < spawnUntilX) {
      this.spawnNext();
    }
  }

  /**
   * Получить все активные сегменты
   */
  getSegments(): SnowDriftSegment[] {
    return this.segments;
  }

  /**
   * Проверка: блокирует ли сугроб данную полосу в точке X
   */
  isLaneBlockedAtX(lane: TrackLane, x: number): boolean {
    return this.segments.some(
      (s) =>
        s.blocksLane === lane &&
        x >= s.fromX &&
        x <= s.toX
    );
  }

  /* ──────────────────────────────
   * Внутренняя логика
   * ────────────────────────────── */

  private spawnNext() {
    const length =
      this.config.minLength +
      Math.random() * (this.config.maxLength - this.config.minLength);

    const fromX = this.lastEndX + this.config.minGapX;
    const toX = fromX + length;

    const blocksLane: TrackLane =
      Math.random() < 0.5 ? "upper" : "lower";

    const segment: SnowDriftSegment = {
      id: `snowdrift-${this.idCounter++}`,
      fromX,
      toX,
      blocksLane,
      offsetY: this.config.offsetY,
    };

    this.segments.push(segment);
    this.lastEndX = toX;
  }
}