import InteractiveMapEngine from "@/components/Raccoons/InteractiveMapEngine";

export default function CountriesMap({
  previewSelectedId,
  onUserSelect,
}: {
  previewSelectedId?: string | null;
  onUserSelect?: (selectedId: string) => void;
}) {
  return (
    <InteractiveMapEngine
      svgPath="countries/countries_interactive.svg"
      type="country"
      popupFormatter={(id: string) => `Страна: ${id.toUpperCase()}`}
      styleClass="country-popup"
      previewSelectedId={previewSelectedId}
      onUserSelect={onUserSelect}
    />
  );
}
