import type { ExplanationMode } from "@/types/types";

interface ModeButtonsProps {
  modes: ExplanationMode[];
  selectedModeId: string | number | null;
  disabled?: boolean;
  onSelect: (modeId: string | number) => void;
}

const getModeLabel = (mode: ExplanationMode) =>
  String(mode.title || mode.name || mode.slug || `Mode ${mode.id}`);

export default function ModeButtons({
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
          {getModeLabel(mode)}
        </button>
      ))}
    </div>
  );
}
