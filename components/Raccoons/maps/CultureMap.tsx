import InteractiveMapEngine from "@/components/Raccoons/InteractiveMapEngine";

export default function CultureMap() {
  return (
    <InteractiveMapEngine
      svgPath="/images/map/countries_interactive.svg"
      type="culture"
      popupFormatter={(id: string) => `Страна: ${id.toUpperCase()}`}
      styleClass="country-popup"
    />
  );
}