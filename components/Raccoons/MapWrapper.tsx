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
  onUserSelect,
}: {
  type: MapType;
  previewSelectedId?: string | null;
  onUserSelect?: (selectedId: string) => void;
}) {
  switch (type) {
    case "country":
      return <CountriesMap previewSelectedId={previewSelectedId} onUserSelect={onUserSelect} />;
    case "river":
      return <RiversMap previewSelectedId={previewSelectedId} onUserSelect={onUserSelect} />;
    case "sea":
      return <SeaMap previewSelectedId={previewSelectedId} onUserSelect={onUserSelect} />;
    // пока заглушка — позже добавим реализацию для остальных типов
    case "physic":
      return <PhysicMap previewSelectedId={previewSelectedId} onUserSelect={onUserSelect} />
    case "flag":
      return <FlagMap />
    case "animal":
      return <BiomesMap previewSelectedId={previewSelectedId} onUserSelect={onUserSelect} />
    case "culture":
      return <СultureMap previewSelectedId={previewSelectedId} onUserSelect={onUserSelect} />
    case "weather":
      return <WeatherMap previewSelectedId={previewSelectedId} onUserSelect={onUserSelect} />
    case "food":
      return <FoodMap previewSelectedId={previewSelectedId} onUserSelect={onUserSelect} />
      return null;
    default:
      return null;
  }
}
