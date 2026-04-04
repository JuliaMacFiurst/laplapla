"use client";

import { useQuest1I18n } from "../../i18n";

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

const PART_CHOICES: Record<
  SledPart,
  { key: 0 | 1;
     patch: Partial<PreparationResult>;
     playAnimation?: boolean }[]
> = {
  reins: [
    { key: 0, patch: { stability: 0.2, risk: -0.1, speedModifier: 0.1 }, playAnimation: true },
    { key: 1, patch: { risk: 0.1, stability: -0.3 } },
  ],
  harness: [
    { key: 0, patch: { stamina: 0.2, stability: 0.1 }, playAnimation: true },
    { key: 1, patch: { risk: 0.1, stability: -0.3 } },
  ],
  water: [
    { key: 0, patch: { stamina: 0.3 }, playAnimation: true },
    { key: 1, patch: { risk: 0.2, stamina: -0.2 } },
  ],
  food: [
    { key: 0, patch: { stamina: 0.3 }, playAnimation: true },
    { key: 1, patch: { risk: 0.2, stamina: -0.1 } },
  ],
  brake: [
    { key: 0, patch: { stability: 0.3, risk: -0.3 }, playAnimation: true },
    { key: 1, patch: { risk: 0.3 } },
  ],
  skids: [
    { key: 0, patch: { speedModifier: 0.2 }, playAnimation: true },
    { key: 1, patch: { risk: 0.1, stability: -0.1 } },
  ],
  loads: [
    { key: 0, patch: { stability: 0.2, risk: -0.1  }, playAnimation: true },
    { key: 1, patch: { risk: 0.2 } },
  ],
  dogs: [
    { key: 0, patch: { stamina: 0.3, risk: -0.1, speedModifier: 0.1  }, playAnimation: true },
    { key: 1, patch: { risk: 0.2, speedModifier: -0.1, stamina: -0.3, stability: -0.2 } },
  ],
};

export default function PreparationPopup({
  activePart,
  onApply,
  onPlayAnimation,
  onClose,
}: PreparationPopupProps) {
  const { t } = useQuest1I18n();
  return (
    <div className="preparation-popup">
      <div className="preparation-popup__overlay" onClick={onClose} />
      <div className="preparation-popup__content">
        <h3 className="preparation-popup__title">{t.day5Garage.popup.parts[activePart]}</h3>
        <p className="preparation-popup__description">
          {t.day5Garage.popup.descriptions[activePart]}
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
              {t.day5Garage.popup.choices[activePart][choice.key]}
            </button>
          ))}
        </div>

        <button className="preparation-popup__close" onClick={onClose}>
          {t.day5Garage.popup.close}
        </button>
      </div>
    </div>
  );
}
