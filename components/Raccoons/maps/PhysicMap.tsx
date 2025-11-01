import InteractiveMapEngine from '../InteractiveMapEngine';

const PhysicMap = () => {
  return (
    <InteractiveMapEngine
      svgPath="/images/map/wonders_colored.svg"
      type="physic"
      popupFormatter={(id: string) => `Море: ${id}`}
      styleClass="physic-svg"
    />
  );
};

export default PhysicMap;