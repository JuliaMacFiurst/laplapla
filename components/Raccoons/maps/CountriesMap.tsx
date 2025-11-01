import InteractiveMapEngine from "@/components/Raccoons/InteractiveMapEngine";

export default function CountriesMap() {
  return (
    <InteractiveMapEngine
      svgPath="/images/map/countries_interactive.svg"
      type="country"
      popupFormatter={(id: string) => `Страна: ${id.toUpperCase()}`}
      styleClass="country-popup"
    />
  );
}