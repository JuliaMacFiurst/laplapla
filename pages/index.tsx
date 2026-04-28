
import type { GetStaticProps } from "next";

import Home from './Home';
import type { Lang } from "@/i18n";
import { DEFAULT_LANG, isLang } from "@/lib/i18n/routing";

type MainPageProps = {
  lang: Lang;
};

export default function MainPage({ lang }: MainPageProps) {
  return <Home lang={lang} />;
}

export const getStaticProps: GetStaticProps<MainPageProps> = async ({ locale }) => {
  const lang = isLang(locale) ? locale : DEFAULT_LANG;

  return {
    props: {
      lang,
    },
  };
};
