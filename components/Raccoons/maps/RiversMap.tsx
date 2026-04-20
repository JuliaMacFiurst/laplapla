import InteractiveMapEngine from "@/components/Raccoons/InteractiveMapEngine";

export default function RiversMap({
  previewSelectedId,
  onUserSelect,
}: {
  previewSelectedId?: string | null;
  onUserSelect?: (selectedId: string) => void;
}) {
  return (
      <InteractiveMapEngine
        svgPath="rivers/rivers-with-id-bg-updated.svg"
        type="river"
         popupFormatter={(id: string) => `Река: ${id.toUpperCase()}`}
        styleClass="river-svg"
        previewSelectedId={previewSelectedId}
        onUserSelect={onUserSelect}
      />
  );
}
