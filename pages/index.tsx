
import type { GetServerSideProps } from "next";

import Home from './Home';
import { loadHomepageRetentionData, type HomepageRetentionData } from "@/lib/homeRetention";
import type { Lang } from "@/i18n";
import { DEFAULT_LANG, isLang } from "@/lib/i18n/routing";

type MainPageProps = {
  lang: Lang;
  retention: HomepageRetentionData;
  checkoutAvailable: boolean;
};

export default function MainPage({ lang, retention, checkoutAvailable }: MainPageProps) {
  return <Home lang={lang} retention={retention} checkoutAvailable={checkoutAvailable} />;
}

export const getServerSideProps: GetServerSideProps<MainPageProps> = async ({ locale }) => {
  const lang = isLang(locale) ? locale : DEFAULT_LANG;
  const retention = await loadHomepageRetentionData(lang);
  const { getShopCheckoutAvailability } = await import("@/lib/server/commerce/paypal/checkoutAvailability");

  return {
    props: {
      lang,
      retention,
      checkoutAvailable: getShopCheckoutAvailability(),
    },
  };
};
