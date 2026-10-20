import type { GetServerSideProps } from "next";
import Head from "next/head";
import { QuestPrintLab } from "@/components/shop/QuestPrintLab";

export function isQuestPrintLabAvailable(nodeEnvironment: string | undefined) {
  return nodeEnvironment === "development";
}

export default function QuestPrintLabPage() {
  return (
    <>
      <Head>
        <title>Quest Print Lab | LapLapLa Internal</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <QuestPrintLab />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  if (!isQuestPrintLabAvailable(process.env.NODE_ENV)) {
    return { notFound: true };
  }

  return { props: {} };
};
