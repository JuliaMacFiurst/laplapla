import Image from "next/image";
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
      <Image
        className="app-splash__logo"
        src={brand.splashPath}
        alt=""
        width={168}
        height={168}
        priority
        unoptimized
      />
      <span className="app-splash__loader" aria-hidden="true" />
    </div>
  );
}
