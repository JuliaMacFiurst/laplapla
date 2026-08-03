import { APP_BRAND, type AppBrand } from "@/lib/pwa/appBrand";
import AnimatedAppSplash from "@/components/PWA/AnimatedAppSplash";
import type { SplashDebugMode, SplashPresentation } from "@/components/PWA/AnimatedAppSplash";

type AppSplashProps = {
  brand?: AppBrand;
  recoveryCopy: {
    title: string;
    message: string;
    retry: string;
  };
  visible: boolean;
  debugMode?: SplashDebugMode;
  onPresentationReady?: (presentation: SplashPresentation) => void;
};

export default function AppSplash({
  brand = APP_BRAND,
  recoveryCopy,
  visible,
  debugMode,
  onPresentationReady,
}: AppSplashProps) {
  return (
    <div
      className={`app-splash${visible ? " app-splash--visible" : ""}`}
      aria-hidden={!visible}
      aria-label={visible ? `${brand.appName} is loading` : undefined}
      role={visible ? "status" : undefined}
      style={{ backgroundColor: brand.backgroundColor }}
    >
      <AnimatedAppSplash
        debugMode={debugMode}
        onPresentationReady={onPresentationReady}
      />
      <section
        id="pwa-boot-recovery-panel"
        className="app-splash__recovery"
        aria-live="polite"
        hidden
      >
        <h2>{recoveryCopy.title}</h2>
        <p>{recoveryCopy.message}</p>
        <button id="pwa-boot-retry" type="button">
          {recoveryCopy.retry}
        </button>
      </section>
    </div>
  );
}
