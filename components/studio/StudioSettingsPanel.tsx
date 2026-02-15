import type { StudioSlide } from "@/types/studio";
import SlideTextEditor from "./SlideTextEditor";
import { dictionaries, type Lang } from "@/i18n";

interface StudioSettingsPanelProps {
  lang: Lang;
  slide: StudioSlide;
  textValue: string;
  onChangeText: (text: string) => void;
  onChangeTextColor: (color: string) => void;
  onChangeBgColor: (color: string) => void;
  onAddMedia: () => void;
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
  fontSize?: number;
  onChangeFontSize?: (size: number) => void;
  onSetAlignLeft?: () => void;
  onSetAlignCenter?: () => void;
  onSetAlignRight?: () => void;
  onPreview: () => void;
}

export default function StudioSettingsPanel({
  lang,
  slide,
  textValue,
  onChangeText,
  onChangeTextColor,
  onChangeBgColor,
  onAddMedia,
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
  fontSize,
  onChangeFontSize,
  onSetAlignLeft,
  onSetAlignCenter,
  onSetAlignRight,
  onPreview,
}: StudioSettingsPanelProps) {
  const t = dictionaries[lang].cats.studio
  return (
    <div
      className="studio-panel"
      style={{ display: "flex", flexDirection: "column", gap: 3 }}
    >
      <div
        className="studio-section"
        style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
      >
        <label className="studio-label">
          {t.bgColor}:
          <input
            type="color"
            className="studio-color-picker"
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
        <strong className="studio-label">{t.media}</strong>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="studio-button btn-peach" onClick={onAddMedia}>
            {t.addMedia}
          </button>
          <button className="studio-button btn-yellow" onClick={onSetFitCover}>
            {t.fill}
          </button>
          <button className="studio-button btn-mint" onClick={onSetFitContain}>
            {t.fit}
          </button>
        </div>
      </div>

      {/* Position Controls */}
      <div
        className="studio-section"
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        <strong className="studio-label">{t.position}</strong>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="studio-button btn-lavender" onClick={() => onSetPositionTop?.()}>
            {t.top}
          </button>
          <button
            className="studio-button btn-blue"
            onClick={() => onSetPositionCenter?.()}
          >
            {t.center}
          </button>
          <button
            className="studio-button btn-pink"
            onClick={() => onSetPositionBottom?.()}
          >
            {t.bottom}
          </button>
        </div>
      </div>

      {/* Text Controls */}
      <div
        className="studio-section"
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        <strong className="studio-label">{t.text}</strong>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label className="studio-label">
            {t.textColor}:
            <input
              type="color"
              className="studio-color-picker"
              value={slide.textColor}
              onChange={(e) => onChangeTextColor(e.target.value)}
            />
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="studio-button btn-lavender" onClick={() => onSetTextTop?.()}>
            {t.top}
          </button>
          <button className="studio-button btn-blue" onClick={() => onSetTextCenter?.()}>
            {t.center}
          </button>
          <button className="studio-button btn-pink" onClick={() => onSetTextBottom?.()}>
            {t.bottom}
          </button>
        </div>

        {/* Text Alignment */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="studio-button btn-peach studio-align-button"
            onClick={() => onSetAlignLeft?.()}
            aria-label={t.alignLeft}
            data-tooltip={t.alignLeft}
          >
            <span className="align-icon align-left">
              <span />
              <span />
              <span />
            </span>
          </button>

          <button
            className="studio-button btn-yellow studio-align-button"
            onClick={() => onSetAlignCenter?.()}
            aria-label={t.alignCenter}
            data-tooltip={t.alignCenter}
          >
            <span className="align-icon align-center">
              <span />
              <span />
              <span />
            </span>
          </button>

          <button
            className="studio-button btn-mint studio-align-button"
            onClick={() => onSetAlignRight?.()}
            aria-label={t.alignRight}
            data-tooltip={t.alignRight}
          >
            <span className="align-icon align-right">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>

        {/* Font Size Slider */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label className="studio-label">
            {t.fontSize}
          </label>
          <input
            type="range"
            min={16}
            max={120}
            step={2}
            value={fontSize ?? 48}
            onChange={(e) =>
              onChangeFontSize?.(Number(e.target.value))
            }
          />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button className="studio-button btn-mint" onClick={() => onToggleTextBg?.()}>
            {slide.textBgEnabled ? t.disableTextBg : t.enableTextBg}
          </button>

          {slide.textBgEnabled && (
            <>
              <input
                type="color"
                className="studio-color-picker"
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
            lang={lang}
            value={textValue}
            onChange={onChangeText}
            fontFamily="'Amatic SC', cursive"
          />
        </div>
      </div>

      {/* Audio & Export */}
      <div
        className="studio-section"
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        <strong className="studio-label">{t.audioAndExport}</strong>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="studio-button btn-blue" onClick={onPreview}>
            Предпросмотр
          </button>
          <button className="studio-button btn-peach" onClick={onExport}>
            {t.export}
          </button>
          <button className="studio-button btn-yellow" onClick={onUndo}>
            {t.undo}
          </button>
          <button className="studio-button btn-yellow" onClick={onRedo}>
            {t.redo}
          </button>
          <button
            className="studio-button studio-button-danger"
            onClick={() => {
              if (confirm(t.confirmDeleteAll)) {
                onDeleteAll();
              }
            }}
          >
            🗑 {t.deleteAll}
          </button>
        </div>
      </div>
    </div>
  );
}
