import InteractiveMapEngine from "@/components/Raccoons/InteractiveMapEngine";

export default function RiversMap() {
  return (
    <div className="rivers-map-container">
      <InteractiveMapEngine
        svgPath="rivers/rivers-with-id-bg-updated.svg"
        type="river"
         popupFormatter={(id: string) => `Река: ${id.toUpperCase()}`}
        styleClass="river-svg"
      />
    </div>
  );
}