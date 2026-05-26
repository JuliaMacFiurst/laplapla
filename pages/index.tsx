
import type { GetServerSideProps } from "next";

import Home from './Home';
import { loadHomepageRetentionData, type HomepageRetentionData } from "@/lib/homeRetention";
import type { Lang } from "@/i18n";
import { DEFAULT_LANG, isLang } from "@/lib/i18n/routing";

type MainPageProps = {
  lang: Lang;
  retention: HomepageRetentionData;
};

export default function MainPage({ lang, retention }: MainPageProps) {
  return <Home lang={lang} retention={retention} />;
}

export const getServerSideProps: GetServerSideProps<MainPageProps> = async ({ locale }) => {
  const lang = isLang(locale) ? locale : DEFAULT_LANG;
  const retention = await loadHomepageRetentionData(lang);

  return {
    props: {
      lang,
      retention,
    },
  };
};
