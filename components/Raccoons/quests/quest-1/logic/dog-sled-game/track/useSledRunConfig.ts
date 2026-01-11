// useSledRunConfig.ts
// Чистая логика: перевод PreparationResult -> runtime-конфиг заезда
// Без React, без JSX, без сайд-эффектов

export type PreparationResult = {
  speedModifier: number;
  stability: number;
  stamina: number;
  risk: number;
};

export type SledRunConfig = {
  /** Базовая скорость саней, из подготовки */
  baseSpeed: number;

  /** Базовый стиль бега (без учёта hit/crash) */
  runStyle: "run_fast" | "run_tired";

  /** Множитель плотности препятствий */
  obstacleRateMultiplier: number;

  /** Шанс кратковременного риск-бустa на тик */
  riskBoostChance: number;
};

export function buildSledRunConfig(
  prep: PreparationResult
): SledRunConfig {
  // speedModifier: 0 = худшее (300), 1 = лучшее (450)
  const baseSpeed =
    prep.speedModifier <= 0.2
      ? 300
      : prep.speedModifier <= 0.6
      ? 400
      : 450;

  // stamina: 0 = бодрые собаки, 1 = максимально уставшие
  // от 0.6 и выше — усталый бег
  const runStyle: SledRunConfig["runStyle"] =
    prep.stamina <= 0.6 ? "run_tired" : "run_fast";

  // stability: 0 = хаос (больше препятствий), 1 = стабильность
  const stabilityMultiplier =
    prep.stability <= 0.3 ? 1.6 : 1.0;

  // risk: 0 = максимальный риск, 1 = безопасно
  const riskMultiplier =
    prep.risk <= 0.3 ? 1.4 : 1.0;

  const obstacleRateMultiplier =
    stabilityMultiplier * riskMultiplier;

  // высокий риск (низкое значение) → внезапные ускорения
  const riskBoostChance =
  prep.risk >= 0.6 ? 0.2 : 0;

  return {
    baseSpeed,
    runStyle,
    obstacleRateMultiplier,
    riskBoostChance,
  };
}