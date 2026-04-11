import InteractiveMapEngine from "@/components/Raccoons/InteractiveMapEngine";

export default function FoodMap({
  previewSelectedId,
  onUserSelect,
}: {
  previewSelectedId?: string | null;
  onUserSelect?: (selectedId: string) => void;
}) {
  return (
    <InteractiveMapEngine
      svgPath="countries/countries_interactive.svg"
      type="food"
      popupFormatter={(id: string) => `Страна: ${id.toUpperCase()}`}
      styleClass="country-popup"
      previewSelectedId={previewSelectedId}
      onUserSelect={onUserSelect}
    />
  );
}
