import InteractiveMapEngine from "@/components/Raccoons/InteractiveMapEngine";

export default function CountriesMap({ previewSelectedId }: { previewSelectedId?: string | null }) {
  return (
    <InteractiveMapEngine
      svgPath="countries/countries_interactive.svg"
      type="country"
      popupFormatter={(id: string) => `Страна: ${id.toUpperCase()}`}
      styleClass="country-popup"
      previewSelectedId={previewSelectedId}
    />
  );
}
