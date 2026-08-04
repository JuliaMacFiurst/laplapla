type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl" | number;

type LoadingSpinnerProps = {
  className?: string;
  size?: SpinnerSize;
  label?: string;
  decorative?: boolean;
};

const SIZE_BY_NAME: Record<Exclude<SpinnerSize, number>, number> = {
  xs: 206,
  sm: 206,
  md: 206,
  lg: 206,
  xl: 206,
};

export const LapLapLaSpinner = ({
  className = "",
  size = "md",
  label = "Загрузка…",
  decorative = false,
}: LoadingSpinnerProps) => {
  const pixelSize = typeof size === "number" ? Math.max(28, size) : SIZE_BY_NAME[size];

  return (
    <div
      className={`laplapla-spinner ${className}`.trim()}
      role={decorative ? undefined : "status"}
      aria-live={decorative ? undefined : "polite"}
    >
      {/* The SVG owns its animation and must stay an external image resource. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="laplapla-spinner__image"
        src="/spinners/laplapla-spinner.svg"
        alt=""
        aria-hidden="true"
        draggable={false}
        width={pixelSize}
        height={pixelSize}
        style={{ width: pixelSize, height: pixelSize }}
      />
      {!decorative ? <span className="sr-only">{label}</span> : null}
    </div>
  );
};

export default LapLapLaSpinner;
