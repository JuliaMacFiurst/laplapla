import Head from "next/head";
import { useRouter } from "next/router";
import { BASE_URL } from "@/lib/config";
import { buildLocalizedPublicPath, getCurrentLang } from "@/lib/i18n/routing";

export type SEOProps = {
  title: string;
  description: string;
  path: string;
  type?: string;
};

function normalizePath(path: string) {
  const cleanPath = path.split("#")[0]?.split("?")[0] || "/";

  if (!cleanPath || cleanPath === "/") {
    return "/";
  }

  return cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
}

export default function SEO({
  title,
  description,
  path,
  type = "website",
}: SEOProps) {
  const router = useRouter();
  const normalizedPath = buildLocalizedPublicPath(normalizePath(path), getCurrentLang(router));
  const canonical = `${BASE_URL}${normalizedPath === "/" ? "" : normalizedPath}`;

  return (
    <Head>
      <title key="title">{title}</title>
      <meta key="description" name="description" content={description} />
      <link key="canonical" rel="canonical" href={canonical} />
      <meta key="og:title" property="og:title" content={title} />
      <meta key="og:description" property="og:description" content={description} />
      <meta key="og:type" property="og:type" content={type} />
      <meta key="og:url" property="og:url" content={canonical} />
    </Head>
  );
}
