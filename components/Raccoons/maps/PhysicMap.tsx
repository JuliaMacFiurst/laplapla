import InteractiveMapEngine from '../InteractiveMapEngine';

const PhysicMap = ({
  previewSelectedId,
  onUserSelect,
}: {
  previewSelectedId?: string | null;
  onUserSelect?: (selectedId: string) => void;
}) => {
  return (
    <InteractiveMapEngine
      svgPath="physic/wonders_colored.svg"
      type="physic"
      popupFormatter={(id: string) => `Море: ${id}`}
      styleClass="physic-svg"
      previewSelectedId={previewSelectedId}
      onUserSelect={onUserSelect}
    />
  );
};

export default PhysicMap;
