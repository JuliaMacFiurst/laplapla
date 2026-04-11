
import InteractiveMapEngine from '../InteractiveMapEngine';

const SeaMap = ({
  previewSelectedId,
  onUserSelect,
}: {
  previewSelectedId?: string | null;
  onUserSelect?: (selectedId: string) => void;
}) => {
  return (
    <InteractiveMapEngine
      svgPath="seas/seas-colored-bordered.svg"
      type="sea"
      popupFormatter={(id: string) => `Море: ${id}`}
      styleClass="sea-svg"
      previewSelectedId={previewSelectedId}
      onUserSelect={onUserSelect}
    />
  );
};

export default SeaMap;
