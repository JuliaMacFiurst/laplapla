import { APP_BRAND, type AppBrand } from "@/lib/pwa/appBrand";
import AnimatedAppSplash from "@/components/PWA/AnimatedAppSplash";

type AppSplashProps = {
  brand?: AppBrand;
  debugReplay?: {
    animationKey: number;
    onReplay: () => void;
  };
  recoveryCopy: {
    title: string;
    message: string;
    retry: string;
  };
  visible: boolean;
};

export default function AppSplash({
  brand = APP_BRAND,
  debugReplay,
  recoveryCopy,
  visible,
}: AppSplashProps) {
  const showDebugReplay = process.env.NODE_ENV === "development" ? debugReplay : undefined;

  return (
    <div
      className={`app-splash${visible ? " app-splash--visible" : ""}`}
      aria-hidden={!visible}
      aria-label={visible ? `${brand.appName} is loading` : undefined}
      role={visible ? "status" : undefined}
      style={{ backgroundColor: brand.backgroundColor }}
    >
      <AnimatedAppSplash key={showDebugReplay?.animationKey ?? 0} />
      {showDebugReplay ? (
        <button
          className="app-splash__debug-replay"
          type="button"
          onClick={showDebugReplay.onReplay}
        >
          Повторить анимацию
        </button>
      ) : null}
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
