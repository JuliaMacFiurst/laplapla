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

export default function MapWrapper({ type }: { type: MapType }) {
  switch (type) {
    case "country":
      return <CountriesMap />;
    case "river":
      return <RiversMap />;
    case "sea":
      return <SeaMap />;
    // пока заглушка — позже добавим реализацию для остальных типов
    case "physic":
      return <PhysicMap />
    case "flag":
      return <FlagMap />
    case "animal":
      return <BiomesMap />
    case "culture":
      return <СultureMap />
    case "weather":
      return <WeatherMap />
    case "food":
      return <FoodMap />
      return null;
    default:
      return null;
  }
}