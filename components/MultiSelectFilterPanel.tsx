import { useId, useState } from "react";

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
  onOptionActivated?: (value: string, hasSubcategories: boolean, wasSelected: boolean) => void;
};

interface MultiSelectFilterPanelProps {
  title: string;
  clearLabel: string;
  groups: FilterGroup[];
  onClear: () => void;
  className?: string;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  contentId?: string;
  inlineSubcategories?: boolean;
  subcategoriesLabel?: string;
  closeSubcategoriesLabel?: string;
}

export default function MultiSelectFilterPanel({
  title,
  clearLabel,
  groups,
  onClear,
  className = "",
  defaultExpanded = true,
  expanded,
  onExpandedChange,
  contentId,
  inlineSubcategories = false,
  subcategoriesLabel = "Подкатегории",
  closeSubcategoriesLabel = "Закрыть подкатегории",
}: MultiSelectFilterPanelProps) {
  const visibleGroups = groups.filter((group) => group.options.length > 0);
  const hasSelections = visibleGroups.some((group) => group.selectedValues.length > 0);
  const generatedContentId = useId();
  const resolvedContentId = contentId ?? `multi-filter-content-${generatedContentId.replace(/:/g, "")}`;
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = expanded ?? internalExpanded;
  const [openSubcategoryValue, setOpenSubcategoryValue] = useState<string | null>(null);

  const setExpanded = (nextExpanded: boolean) => {
    if (expanded === undefined) {
      setInternalExpanded(nextExpanded);
    }
    if (!nextExpanded) {
      setOpenSubcategoryValue(null);
    }
    onExpandedChange?.(nextExpanded);
  };

  if (visibleGroups.length === 0) {
    return null;
  }

  return (
    <section className={`multi-filter-panel ${inlineSubcategories ? "multi-filter-inline-subcategories" : ""} ${className}`.trim()}>
      <div className="multi-filter-panel-head">
        <button
          type="button"
          className="multi-filter-toggle-button"
          onClick={() => setExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-controls={resolvedContentId}
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

      <div
        id={resolvedContentId}
        className={`multi-filter-panel-content ${isExpanded ? "multi-filter-panel-content-expanded" : ""}`}
        aria-hidden={!isExpanded}
        inert={!isExpanded ? true : undefined}
      >
        <div className="multi-filter-panel-content-inner">
          {visibleGroups.map((group) => (
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
                      onClick={() => {
                        if (hasSubcategories) {
                          if (!isSelected) {
                            group.onToggle(option.value);
                          }
                          setOpenSubcategoryValue((current) => current === option.value ? null : option.value);
                        } else {
                          group.onToggle(option.value);
                        }
                        group.onOptionActivated?.(option.value, hasSubcategories, isSelected);
                      }}
                      aria-pressed={isSelected}
                      aria-expanded={hasSubcategories ? isSubcategoryOpen : undefined}
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
                        aria-label={`${subcategoriesLabel}: ${option.label}`}
                        aria-expanded={isSubcategoryOpen}
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenSubcategoryValue((current) => current === option.value ? null : option.value);
                        }}
                      >
                        +
                      </button>
                    ) : null}

                    {hasSubcategories && isSubcategoryOpen && !inlineSubcategories ? (
                      <button
                        type="button"
                        className="multi-filter-subcategory-scrim"
                        aria-label={closeSubcategoriesLabel}
                        onClick={() => setOpenSubcategoryValue(null)}
                      />
                    ) : null}

                    {hasSubcategories ? (
                      <div className="multi-filter-subcategory-popover" role="region" aria-label={`${subcategoriesLabel}: ${option.label}`}>
                        <div className="multi-filter-subcategory-head">
                          <span>{subcategoriesLabel} · {option.label}</span>
                          <button
                            type="button"
                            className="multi-filter-subcategory-close"
                            aria-label={closeSubcategoriesLabel}
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
          ))}
        </div>
      </div>
    </section>
  );
}
