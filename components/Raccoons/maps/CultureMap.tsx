import InteractiveMapEngine from "@/components/Raccoons/InteractiveMapEngine";

export default function CultureMap({ previewSelectedId }: { previewSelectedId?: string | null }) {
  return (
    <InteractiveMapEngine
      svgPath="countries/countries_interactive.svg"
      type="culture"
      popupFormatter={(id: string) => `Страна: ${id.toUpperCase()}`}
      styleClass="country-popup"
      previewSelectedId={previewSelectedId}
    />
  );
}
