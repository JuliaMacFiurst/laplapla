import type { Lang } from "@/i18n";
import { getLocalizedExplanationModeLabel } from "@/lib/books/shared";
import type { ExplanationMode } from "@/types/types";

interface MobileModeTabsProps {
  lang: Lang;
  modes: ExplanationMode[];
  selectedModeId: string | number | null;
  disabled?: boolean;
  onSelect: (modeId: string | number) => void;
}

export default function MobileModeTabs({
  lang,
  modes,
  selectedModeId,
  disabled,
  onSelect,
}: MobileModeTabsProps) {
  if (!modes.length) {
    return null;
  }

  return (
    <div className="mobile-mode-tabs" role="tablist" aria-label="Book sections">
      {modes.map((mode) => {
        const isActive = String(selectedModeId) === String(mode.id);

        return (
          <button
            key={String(mode.id)}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={disabled}
            onClick={() => onSelect(mode.id)}
            className={`mobile-mode-tab ${isActive ? "mobile-mode-tab-active" : ""}`}
          >
            <span className="mobile-mode-tab-label">{getLocalizedExplanationModeLabel(mode, lang)}</span>
          </button>
        );
      })}
    </div>
  );
}
