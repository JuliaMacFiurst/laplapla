"use client";

export type SledPart =
  | "reins"
  | "harness"
  | "water"
  | "food"
  | "brake"
  | "skids"
  | "loads"
  | "dogs";

export type PreparationResult = {
  speedModifier: number;
  stability: number;
  stamina: number;
  risk: number;
};

interface PreparationPopupProps {
  activePart: SledPart;
  prep: PreparationResult;
  onApply: (patch: Partial<PreparationResult>) => void;
  onClose: () => void;
  onPlayAnimation: (part: SledPart) => void;
}

const PART_DESCRIPTIONS: Record<SledPart, string> = {
  reins: "Поводья передают команды собакам. От их состояния зависит управляемость.",
  harness: "Упряжь распределяет нагрузку между собаками.",
  water: "Вода необходима собакам для выносливости в долгом пути.",
  food: "Еда поддерживает силы упряжки.",
  brake: "Тормоз позволяет контролировать скорость на спусках.",
  skids: "Полозья влияют на скольжение и устойчивость.",
  loads: "Груз влияет на баланс и скорость.",
  dogs: "Состояние собак — ключ к успешному заезду.",
};

const PART_CHOICES: Record<
  SledPart,
  { label: string;
     patch: Partial<PreparationResult>;
     playAnimation?: boolean }[]
> = {
  reins: [
    { label: "Проверить и подтянуть", patch: { stability: 0.2, risk: -0.1, speedModifier: 0.1 }, playAnimation: true },
    { label: "Оставить как есть", patch: { risk: 0.1, stability: -0.3 } },
  ],
  harness: [
    { label: "Отрегулировать упряжь", patch: { stamina: 0.2, stability: 0.1 }, playAnimation: true },
    { label: "Не трогать", patch: { risk: 0.1, stability: -0.3 } },
  ],
  water: [
    { label: "Пополнить запас воды", patch: { stamina: 0.3 }, playAnimation: true },
    { label: "Сэкономить место", patch: { risk: 0.2, stamina: -0.2 } },
  ],
  food: [
    { label: "Взять дополнительный корм", patch: { stamina: 0.3 }, playAnimation: true },
    { label: "Минимальный запас", patch: { risk: 0.2, stamina: -0.1 } },
  ],
  brake: [
    { label: "Проверить тормоз", patch: { stability: 0.3, risk: -0.3 }, playAnimation: true },
    { label: "Пропустить проверку", patch: { risk: 0.3 } },
  ],
  skids: [
    { label: "Смазать полозья", patch: { speedModifier: 0.2 }, playAnimation: true },
    { label: "Оставить без изменений", patch: { risk: 0.1, stability: -0.1 } },
  ],
  loads: [
    { label: "Распределить груз", patch: { stability: 0.2, risk: -0.1  }, playAnimation: true },
    { label: "Не перекладывать", patch: { risk: 0.2 } },
  ],
  dogs: [
    { label: "Осмотреть собак", patch: { stamina: 0.3, risk: -0.1, speedModifier: 0.1  }, playAnimation: true },
    { label: "Не задерживаться", patch: { risk: 0.2, speedModifier: -0.1, stamina: -0.3, stability: -0.2 } },
  ],
};

export default function PreparationPopup({
  activePart,
  onApply,
  onPlayAnimation,
  onClose,
}: PreparationPopupProps) {
  return (
    <div className="preparation-popup">
      <div className="preparation-popup__overlay" onClick={onClose} />
      <div className="preparation-popup__content">
        <h3 className="preparation-popup__title">{activePart}</h3>
        <p className="preparation-popup__description">
          {PART_DESCRIPTIONS[activePart]}
        </p>

        <div className="preparation-popup__choices">
          {PART_CHOICES[activePart].map((choice, idx) => (
            <button
              key={idx}
              className="preparation-popup__choice"
              onClick={() => {
                // применяем изменения
                onApply(choice.patch);

                if (choice.playAnimation === true) {
                  onPlayAnimation(activePart);
                }

                onClose();
              }}
            >
              {choice.label}
            </button>
          ))}
        </div>

        <button className="preparation-popup__close" onClick={onClose}>
          Закрыть
        </button>
      </div>
    </div>
  );
}
