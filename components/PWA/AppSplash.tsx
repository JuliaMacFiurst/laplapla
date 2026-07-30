import { APP_BRAND, type AppBrand } from "@/lib/pwa/appBrand";

type AppSplashProps = {
  brand?: AppBrand;
  visible: boolean;
};

export default function AppSplash({ brand = APP_BRAND, visible }: AppSplashProps) {
  return (
    <div
      className={`app-splash${visible ? " app-splash--visible" : ""}`}
      aria-hidden={!visible}
      aria-label={visible ? `${brand.appName} is loading` : undefined}
      role={visible ? "status" : undefined}
      style={{ backgroundColor: brand.backgroundColor }}
    >
      {/* The splash is generated, compressed and precached; bypass Next's runtime image proxy. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="app-splash__logo"
        src={brand.splashPath}
        alt=""
        width={320}
        height={320}
        decoding="sync"
        fetchPriority="high"
      />
      <span className="app-splash__loader" aria-hidden="true" />
    </div>
  );
}
