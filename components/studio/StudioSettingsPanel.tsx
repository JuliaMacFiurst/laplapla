import type { StudioSlide } from "@/types/studio";

interface StudioSettingsPanelProps {
  slide: StudioSlide;
  onChangeTextColor: (color: string) => void;
  onChangeBgColor: (color: string) => void;
  onAddMedia: () => void;
  onAddMusic: () => void;
  onRecordVoice: () => void;
  onExport: () => void;
  onDeleteAll: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export default function StudioSettingsPanel({
  slide,
  onChangeTextColor,
  onChangeBgColor,
  onAddMedia,
  onAddMusic,
  onRecordVoice,
  onExport,
  onDeleteAll,
  onUndo,
  onRedo,
}: StudioSettingsPanelProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          Цвет текста:
          <input
            type="color"
            value={slide.textColor}
            onChange={(e) => onChangeTextColor(e.target.value)}
          />
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          Цвет фона:
          <input
            type="color"
            value={slide.bgColor}
            onChange={(e) => onChangeBgColor(e.target.value)}
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={onAddMedia}>Add Media</button>
        <button onClick={onAddMusic}>Add Music</button>
        <button onClick={onRecordVoice}>Record Voice</button>
        <button onClick={onExport}>Export</button>
        <button onClick={onUndo}>Undo</button>
        <button onClick={onRedo}>Redo</button>
        <button
          onClick={() => {
            if (confirm("Удалить всё слайдшоу?")) {
              onDeleteAll();
            }
          }}
          style={{ background: "#ffe5e5" }}
        >
          🗑 Delete All
        </button>
      </div>
    </div>
  );
}
