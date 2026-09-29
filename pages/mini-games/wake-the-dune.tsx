import SEO from "@/components/SEO";
import Head from "next/head";
import { WakeTheDuneGame } from "@/components/mini-games/WakeTheDuneGame";
import type { Lang } from "@/i18n";
import { WAKE_THE_DUNE_COPY, WAKE_THE_DUNE_ROUTE } from "@/lib/miniGames/wakeTheDune";

export default function WakeTheDunePage({ lang }: { lang: Lang }) {
  const copy = WAKE_THE_DUNE_COPY[lang];
  return (
    <>
      <Head>
        <meta key="viewport" name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <SEO title={copy.pageTitle} description={copy.metaDescription} path={WAKE_THE_DUNE_ROUTE} lang={lang} />
      <WakeTheDuneGame lang={lang} />
    </>
  );
}
