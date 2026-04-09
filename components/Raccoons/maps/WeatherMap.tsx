import InteractiveMapEngine from "@/components/Raccoons/InteractiveMapEngine";

export default function WeatherMap({ previewSelectedId }: { previewSelectedId?: string | null }) {
  return (
    <InteractiveMapEngine
      svgPath="biomes/Biomes_of_the_world.svg"
      type="weather"
      popupFormatter={(id: string) => `Страна: ${id.toUpperCase()}`}
      styleClass="country-popup"
      previewSelectedId={previewSelectedId}
    />
  );
}
