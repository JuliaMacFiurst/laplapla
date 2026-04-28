type FilterOption = {
  value: string;
  label: string;
};

type FilterGroup = {
  id: string;
  label: string;
  options: FilterOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
};

interface MultiSelectFilterPanelProps {
  title: string;
  clearLabel: string;
  groups: FilterGroup[];
  onClear: () => void;
  className?: string;
}

export default function MultiSelectFilterPanel({
  title,
  clearLabel,
  groups,
  onClear,
  className = "",
}: MultiSelectFilterPanelProps) {
  const visibleGroups = groups.filter((group) => group.options.length > 0);
  const hasSelections = visibleGroups.some((group) => group.selectedValues.length > 0);

  if (visibleGroups.length === 0) {
    return null;
  }

  return (
    <section className={`multi-filter-panel ${className}`.trim()}>
      <div className="multi-filter-panel-head">
        <span className="multi-filter-panel-title">{title}</span>
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

      {visibleGroups.map((group) => (
        <div key={group.id} className="multi-filter-group">
          <div className="multi-filter-group-label">{group.label}</div>
          <div className="multi-filter-chip-grid">
            {group.options.map((option) => {
              const isSelected = group.selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`multi-filter-chip ${isSelected ? "multi-filter-chip-active" : ""}`}
                  onClick={() => group.onToggle(option.value)}
                  aria-pressed={isSelected}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

