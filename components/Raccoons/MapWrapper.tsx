import SeaMap from "./maps/SeaMap";
import CountriesMap from "./maps/CountriesMap";
import RiversMap from "./maps/RiversMap";
import PhysicMap from "./maps/PhysicMap";
import FlagMap from "./maps/FlagMap";
import BiomesMap from "./maps/BiomesMap";
import СultureMap from "./maps/CultureMap";
import WeatherMap from "./maps/WeatherMap";
import FoodMap from "./maps/FoodMap";

type MapType =
  | "country"
  | "river"
  | "sea"
  | "physic"
  | "flag"
  | "animal"
  | "culture"
  | "weather"
  | "food";

export default function MapWrapper({
  type,
  previewSelectedId,
}: {
  type: MapType;
  previewSelectedId?: string | null;
}) {
  switch (type) {
    case "country":
      return <CountriesMap previewSelectedId={previewSelectedId} />;
    case "river":
      return <RiversMap previewSelectedId={previewSelectedId} />;
    case "sea":
      return <SeaMap previewSelectedId={previewSelectedId} />;
    // пока заглушка — позже добавим реализацию для остальных типов
    case "physic":
      return <PhysicMap />
    case "flag":
      return <FlagMap />
    case "animal":
      return <BiomesMap previewSelectedId={previewSelectedId} />
    case "culture":
      return <СultureMap previewSelectedId={previewSelectedId} />
    case "weather":
      return <WeatherMap previewSelectedId={previewSelectedId} />
    case "food":
      return <FoodMap previewSelectedId={previewSelectedId} />
      return null;
    default:
      return null;
  }
}
