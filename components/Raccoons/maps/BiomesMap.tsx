import InteractiveMapEngine from "@/components/Raccoons/InteractiveMapEngine";

export default function BiomesMap() {
  return (
    <InteractiveMapEngine
      svgPath="biomes/biomes_of_the_world.svg"
      type="animal"
      popupFormatter={(id: string) => `Страна: ${id.toUpperCase()}`}
      styleClass="country-popup"
    />
  );
}