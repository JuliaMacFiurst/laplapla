
import InteractiveMapEngine from '../InteractiveMapEngine';

const SeaMap = () => {
  return (
    <InteractiveMapEngine
      svgPath="/images/map/seas-colored-bordered.svg"
      type="sea"
      popupFormatter={(id: string) => `Море: ${id}`}
      styleClass="sea-svg"
    />
  );
};

export default SeaMap;