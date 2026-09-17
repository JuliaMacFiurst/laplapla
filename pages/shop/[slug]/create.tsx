import type { GetServerSideProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { QuestBuilder } from "@/components/shop/QuestBuilder";
import { dictionaries } from "@/i18n";
import { getCurrentLang } from "@/lib/i18n/routing";
import { getProductBySlug } from "@/lib/shop/catalog";
import { isPublicProduct } from "@/lib/shop/types";

type QuestBuilderPageProps = {
  slug: string;
};

export default function QuestBuilderPage({ slug }: QuestBuilderPageProps) {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const text = dictionaries[lang].shop.soundCase;

  return (
    <>
      <Head>
        <title>{`${text.builder.title} · ${text.title} | LapLapLa`}</title>
        <meta name="description" content={text.description} />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <QuestBuilder key={`${slug}-${lang}`} interfaceLang={lang} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<QuestBuilderPageProps> = async ({ params }) => {
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const product = getProductBySlug(slug);
  if (slug !== "sound-case-001" || !product || !isPublicProduct(product)) {
    return { notFound: true };
  }

  return {
    props: { slug },
  };
};
