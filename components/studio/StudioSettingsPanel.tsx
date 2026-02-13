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
  onSetFitCover: () => void;
  onSetFitContain: () => void;
  onSetPositionTop?: () => void;
  onSetPositionCenter?: () => void;
  onSetPositionBottom?: () => void;
  onSetTextTop?: () => void;
  onSetTextCenter?: () => void;
  onSetTextBottom?: () => void;
  onToggleTextBg?: () => void;
  onChangeTextBgColor?: (color: string) => void;
  onChangeTextBgOpacity?: (opacity: number) => void;
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
  onSetFitCover,
  onSetFitContain,
  onSetPositionTop,
  onSetPositionCenter,
  onSetPositionBottom,
  onSetTextTop,
  onSetTextCenter,
  onSetTextBottom,
  onToggleTextBg,
  onChangeTextBgColor,
  onChangeTextBgOpacity,
}: StudioSettingsPanelProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          Цвет фона:
          <input
            type="color"
            value={slide.bgColor}
            onChange={(e) => onChangeBgColor(e.target.value)}
          />
        </label>
      </div>

      {/* Media Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <strong>Media</strong>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onAddMedia}>Add Media</button>
          <button onClick={onSetFitCover}>Fill</button>
          <button onClick={onSetFitContain}>Fit</button>
        </div>
      </div>

      {/* Position Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <strong>Position</strong>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => onSetPositionTop?.()}>Top</button>
          <button onClick={() => onSetPositionCenter?.()}>Center</button>
          <button onClick={() => onSetPositionBottom?.()}>Bottom</button>
        </div>
      </div>

      {/* Text Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <strong>Text</strong>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            Text Color:
            <input
              type="color"
              value={slide.textColor}
              onChange={(e) => onChangeTextColor(e.target.value)}
            />
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => onSetTextTop?.()}>Top</button>
          <button onClick={() => onSetTextCenter?.()}>Center</button>
          <button onClick={() => onSetTextBottom?.()}>Bottom</button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => onToggleTextBg?.()}>
            {slide.textBgEnabled ? "Disable Text BG" : "Enable Text BG"}
          </button>

          {slide.textBgEnabled && (
            <>
              <input
                type="color"
                value={slide.textBgColor ?? "#000000"}
                onChange={(e) => onChangeTextBgColor?.(e.target.value)}
              />

              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={slide.textBgOpacity ?? 0.6}
                onChange={(e) =>
                  onChangeTextBgOpacity?.(Number(e.target.value))
                }
              />
            </>
          )}
        </div>
      </div>

      {/* Audio & Export */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <strong>Audio & Export</strong>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
    </div>
  );
}
