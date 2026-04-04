import type { Lang } from "@/i18n";
import { getLocalizedExplanationModeLabel } from "@/lib/books/shared";
import type { ExplanationMode } from "@/types/types";

interface ModeButtonsProps {
  lang: Lang;
  modes: ExplanationMode[];
  selectedModeId: string | number | null;
  disabled?: boolean;
  onSelect: (modeId: string | number) => void;
}

export default function ModeButtons({
  lang,
  modes,
  selectedModeId,
  disabled,
  onSelect,
}: ModeButtonsProps) {
  if (!modes.length) {
    return null;
  }

  return (
    <div className="mode-buttons">
      {modes.map((mode) => (
        <button
          key={String(mode.id)}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(mode.id)}
          className={`mode-button ${selectedModeId === mode.id ? "mode-button-active" : ""}`}
        >
          {getLocalizedExplanationModeLabel(mode, lang)}
        </button>
      ))}
    </div>
  );
}
