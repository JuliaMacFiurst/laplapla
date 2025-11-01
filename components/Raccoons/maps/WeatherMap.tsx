import InteractiveMapEngine from "@/components/Raccoons/InteractiveMapEngine";

export default function WeatherMap() {
  return (
    <InteractiveMapEngine
      svgPath="biomes/biomes_of_the_world.svg"
      type="weather"
      popupFormatter={(id: string) => `Страна: ${id.toUpperCase()}`}
      styleClass="country-popup"
    />
  );
}