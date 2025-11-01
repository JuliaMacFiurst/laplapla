import InteractiveMapEngine from "@/components/Raccoons/InteractiveMapEngine";

export default function FlagMap() {
  return (
    <InteractiveMapEngine
      svgPath="/images/map/countries_interactive.svg"
      type="flag"
      popupFormatter={(id: string) => `Страна: ${id.toUpperCase()}`}
      styleClass="flag-popup"
    />
  );
}