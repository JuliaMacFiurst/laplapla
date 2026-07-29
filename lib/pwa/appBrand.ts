import pwaConfig from "@/config/pwa.json";

export type AppBrand = {
  appId: string;
  appName: string;
  logoPath: string;
  backgroundColor: string;
  themeColor: string;
};

export const APP_BRAND: AppBrand = {
  appId: pwaConfig.appId,
  appName: pwaConfig.appName,
  logoPath: pwaConfig.logoPath,
  backgroundColor: pwaConfig.backgroundColor,
  themeColor: pwaConfig.themeColor,
};
