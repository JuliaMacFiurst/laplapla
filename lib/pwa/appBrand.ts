import pwaConfig from "@/config/pwa.json";

export type AppBrand = {
  appId: string;
  appName: string;
  logoPath: string;
  splashPath: string;
  backgroundColor: string;
  themeColor: string;
};

export const APP_BRAND: AppBrand = {
  appId: pwaConfig.appId,
  appName: pwaConfig.appName,
  logoPath: pwaConfig.logoPath,
  splashPath: pwaConfig.splashPath,
  backgroundColor: pwaConfig.backgroundColor,
  themeColor: pwaConfig.themeColor,
};
