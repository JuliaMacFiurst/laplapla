
import InteractiveMapEngine from '../InteractiveMapEngine';

const SeaMap = ({ previewSelectedId }: { previewSelectedId?: string | null }) => {
  return (
    <InteractiveMapEngine
      svgPath="seas/seas-colored-bordered.svg"
      type="sea"
      popupFormatter={(id: string) => `Море: ${id}`}
      styleClass="sea-svg"
      previewSelectedId={previewSelectedId}
    />
  );
};

export default SeaMap;
