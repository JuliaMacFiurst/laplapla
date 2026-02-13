import type { StudioSlide } from "@/types/studio";
import SlideTextEditor from "./SlideTextEditor";

interface StudioSettingsPanelProps {
  slide: StudioSlide;
  textValue: string;
  onChangeText: (text: string) => void;
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
  textValue,
  onChangeText,
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
    <div
      className="studio-panel"
      style={{ display: "flex", flexDirection: "column", gap: 3 }}
    >
      <div
        className="studio-section"
        style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
      >
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
      <div
        className="studio-section"
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        <strong>Media</strong>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="studio-button btn-peach" onClick={onAddMedia}>
            Add Media
          </button>
          <button className="studio-button btn-yellow" onClick={onSetFitCover}>
            Fill
          </button>
          <button className="studio-button btn-mint" onClick={onSetFitContain}>
            Fit
          </button>
        </div>
      </div>

      {/* Position Controls */}
      <div
        className="studio-section"
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        <strong>Position</strong>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="studio-button btn-lavender" onClick={() => onSetPositionTop?.()}>
            Top
          </button>
          <button
            className="studio-button btn-blue"
            onClick={() => onSetPositionCenter?.()}
          >
            Center
          </button>
          <button
            className="studio-button btn-pink"
            onClick={() => onSetPositionBottom?.()}
          >
            Bottom
          </button>
        </div>
      </div>

      {/* Text Controls */}
      <div
        className="studio-section"
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
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
          <button className="studio-button btn-lavender" onClick={() => onSetTextTop?.()}>
            Top
          </button>
          <button className="studio-button btn-blue" onClick={() => onSetTextCenter?.()}>
            Center
          </button>
          <button className="studio-button btn-pink" onClick={() => onSetTextBottom?.()}>
            Bottom
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button className="studio-button btn-mint" onClick={() => onToggleTextBg?.()}>
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
        <div style={{ marginTop: 12 }}>
          <SlideTextEditor
            value={textValue}
            onChange={onChangeText}
          />
        </div>
      </div>

      {/* Audio & Export */}
      <div
        className="studio-section"
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        <strong>Audio & Export</strong>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="studio-button btn-blue" onClick={onAddMusic}>
            Add Music
          </button>
          <button className="studio-button btn-lavender" onClick={onRecordVoice}>
            Record Voice
          </button>
          <button className="studio-button btn-peach" onClick={onExport}>
            Export
          </button>
          <button className="studio-button btn-yellow" onClick={onUndo}>
            Undo
          </button>
          <button className="studio-button btn-yellow" onClick={onRedo}>
            Redo
          </button>
          <button
            className="studio-button studio-button-danger"
            onClick={() => {
              if (confirm("Удалить всё слайдшоу?")) {
                onDeleteAll();
              }
            }}
          >
            🗑 Delete All
          </button>
        </div>
      </div>
    </div>
  );
}
