import { useState } from "react";

type FilterSubcategory = {
  value: string;
  label: string;
  count?: number;
  selected?: boolean;
};

type FilterOption = {
  value: string;
  label: string;
  count?: number;
  icon?: string;
  subcategories?: FilterSubcategory[];
};

type FilterGroup = {
  id: string;
  label: string;
  options: FilterOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  onSubcategoryToggle?: (categoryValue: string, subcategoryValue: string) => void;
};

interface MultiSelectFilterPanelProps {
  title: string;
  clearLabel: string;
  groups: FilterGroup[];
  onClear: () => void;
  className?: string;
  defaultExpanded?: boolean;
}

export default function MultiSelectFilterPanel({
  title,
  clearLabel,
  groups,
  onClear,
  className = "",
  defaultExpanded = true,
}: MultiSelectFilterPanelProps) {
  const visibleGroups = groups.filter((group) => group.options.length > 0);
  const hasSelections = visibleGroups.some((group) => group.selectedValues.length > 0);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [openSubcategoryValue, setOpenSubcategoryValue] = useState<string | null>(null);

  if (visibleGroups.length === 0) {
    return null;
  }

  return (
    <section className={`multi-filter-panel ${className}`.trim()}>
      <div className="multi-filter-panel-head">
        <button
          type="button"
          className="multi-filter-toggle-button"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
        >
          <span className="multi-filter-panel-title">{title}</span>
          <span
            className={`multi-filter-toggle-icon ${isExpanded ? "multi-filter-toggle-icon-expanded" : ""}`}
            aria-hidden="true"
          >
            ˅
          </span>
        </button>
        <button
          type="button"
          className={`multi-filter-clear-button ${hasSelections ? "is-visible" : ""}`}
          onClick={onClear}
          aria-label={clearLabel}
          title={clearLabel}
          disabled={!hasSelections}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      {isExpanded ? (
        visibleGroups.map((group) => (
          <div key={group.id} className="multi-filter-group">
            <div className="multi-filter-group-label">{group.label}</div>
            <div className="multi-filter-chip-grid">
              {group.options.map((option) => {
                const isSelected = group.selectedValues.includes(option.value);
                const hasSubcategories = Boolean(option.subcategories?.length);
                const isSubcategoryOpen = openSubcategoryValue === option.value;

                return (
                  <div
                    key={option.value}
                    className={`multi-filter-chip-shell ${isSubcategoryOpen ? "multi-filter-chip-shell-open" : ""}`}
                  >
                    <button
                      type="button"
                      className={`multi-filter-chip ${isSelected ? "multi-filter-chip-active" : ""}`}
                      onClick={() => group.onToggle(option.value)}
                      aria-pressed={isSelected}
                    >
                      {option.icon ? (
                        <span className="multi-filter-chip-icon" aria-hidden="true">{option.icon}</span>
                      ) : null}
                      <span className="multi-filter-chip-label">{option.label}</span>
                      {typeof option.count === "number" ? (
                        <span className="multi-filter-chip-count" aria-label={`${option.count}`}>
                          {option.count}
                        </span>
                      ) : null}
                    </button>

                    {hasSubcategories ? (
                      <button
                        type="button"
                        className="multi-filter-subcategory-trigger"
                        aria-label={`Подкатегории: ${option.label}`}
                        aria-expanded={isSubcategoryOpen}
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenSubcategoryValue((current) => current === option.value ? null : option.value);
                        }}
                      >
                        +
                      </button>
                    ) : null}

                    {hasSubcategories && isSubcategoryOpen ? (
                      <button
                        type="button"
                        className="multi-filter-subcategory-scrim"
                        aria-label="Закрыть подкатегории"
                        onClick={() => setOpenSubcategoryValue(null)}
                      />
                    ) : null}

                    {hasSubcategories ? (
                      <div className="multi-filter-subcategory-popover" role="dialog" aria-label={`Подкатегории: ${option.label}`}>
                        <div className="multi-filter-subcategory-head">
                          <span>Подкатегории</span>
                          <button
                            type="button"
                            className="multi-filter-subcategory-close"
                            aria-label="Закрыть"
                            onClick={() => setOpenSubcategoryValue(null)}
                          >
                            ×
                          </button>
                        </div>
                        <div className="multi-filter-subcategory-list">
                          {option.subcategories!.map((subcategory) => (
                            <button
                              key={subcategory.value}
                              type="button"
                              className={`multi-filter-subcategory-item ${subcategory.selected ? "multi-filter-subcategory-item-active" : ""}`}
                              onClick={() => {
                                group.onSubcategoryToggle?.(option.value, subcategory.value);
                                setOpenSubcategoryValue(null);
                              }}
                              aria-pressed={subcategory.selected}
                            >
                              <span className="multi-filter-subcategory-label">{subcategory.label}</span>
                              {typeof subcategory.count === "number" ? (
                                <span className="multi-filter-subcategory-count">{subcategory.count}</span>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ) : null}
    </section>
  );
}
