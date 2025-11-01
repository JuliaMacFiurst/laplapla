
import InteractiveMapEngine from '../InteractiveMapEngine';

const SeaMap = () => {
  return (
    <InteractiveMapEngine
      svgPath="seas/seas-colored-bordered.svg"
      type="sea"
      popupFormatter={(id: string) => `Море: ${id}`}
      styleClass="sea-svg"
    />
  );
};

export default SeaMap;