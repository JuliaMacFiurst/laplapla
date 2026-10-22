import Image from "next/image";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import SEO from "@/components/SEO";
import { dictionaries, type Lang } from "@/i18n";
import { buildLocalizedPublicPath, DEFAULT_LANG, isLang } from "@/lib/i18n/routing";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { classifyOriginHost, type OriginMode } from "@/lib/runtime/originMode";

type InstallCardKey = "android" | "ios" | "mac" | "windows";

const CARD_KEYS: InstallCardKey[] = ["android", "ios", "mac", "windows"];

type InstallPageProps = { lang: Lang; originMode: OriginMode };

export default function InstallPage({ lang, originMode }: InstallPageProps) {
  const install = usePWAInstall();
  const t = dictionaries[lang].pwaInstall;
  const isAndroidApp = originMode === "ANDROID_APP";
  const isWeb = originMode === "WEB";
  const showWebInstalled = isWeb && install.standalone;

  const buttonText = install.canPrompt ? t.page.installButton : t.page.unavailableButton;

  return (
    <>
      <SEO
        title={isAndroidApp ? t.androidApp.seoTitle : t.seo.title}
        description={isAndroidApp ? t.androidApp.lead : t.seo.description}
        path="/install"
        lang={lang}
        noindex={isAndroidApp}
      />

      <main className="pwa-install-page" dir={lang === "he" ? "rtl" : "ltr"}>
        <section className={`pwa-install-page__hero${isAndroidApp || showWebInstalled ? " pwa-install-page__hero--compact" : ""}`}>
          <div>
            <p className="pwa-install-page__kicker">
              {isAndroidApp ? t.androidApp.kicker : t.page.kicker}
            </p>
            <h1>{isAndroidApp ? t.androidApp.title : showWebInstalled ? t.webInstalled.title : t.page.title}</h1>
            <p className="pwa-install-page__lead">
              {isAndroidApp ? t.androidApp.lead : showWebInstalled ? t.webInstalled.lead : t.page.lead}
            </p>
            {isWeb && !showWebInstalled && !install.installed ? (
              <button
                type="button"
                className="pwa-install-page__button"
                onClick={() => {
                  if (install.canPrompt) {
                    void install.promptInstall();
                  }
                }}
                disabled={!install.canPrompt}
              >
                {buttonText}
              </button>
            ) : null}
            {(isAndroidApp || showWebInstalled) && (
              <Link className="pwa-install-page__button pwa-install-page__home-link" href={buildLocalizedPublicPath("/", lang)}>
                {isAndroidApp ? t.androidApp.homeButton : t.webInstalled.homeButton}
              </Link>
            )}
          </div>
          <Image
            className="pwa-install-page__logo"
            src="/laplapla-logo.webp"
            alt="LapLapLa"
            width={220}
            height={220}
            priority
          />
        </section>

        {isAndroidApp && (
          <section className="pwa-install-page__details" aria-label={t.androidApp.title}>
            <article className="pwa-install-card">
              <h2>{t.androidApp.materialsTitle}</h2>
              <p>{t.androidApp.materialsText}</p>
              <Link href={buildLocalizedPublicPath("/account", lang)}>{t.androidApp.accountButton}</Link>
            </article>
            <article className="pwa-install-card">
              <h2>{t.androidApp.extraTitle}</h2>
              <p>{t.androidApp.extraText}</p>
            </article>
          </section>
        )}

        {isWeb && !showWebInstalled && (
          <>
            <p className="pwa-install-page__versions">{t.page.versionsNote}</p>
            <section className="pwa-install-page__grid" aria-label={t.page.title}>
              {CARD_KEYS.map((key) => {
                const card = t.page.cards[key];

                return (
                  <article className="pwa-install-card" key={key}>
                    <h2>{card.title}</h2>
                    <p>{card.summary}</p>
                    <ol>
                      {card.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </article>
                );
              })}
            </section>
          </>
        )}
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<InstallPageProps> = async ({ locale, req }) => ({
  props: {
    lang: isLang(locale) ? locale : DEFAULT_LANG,
    originMode: classifyOriginHost(req.headers.host, req.headers["x-forwarded-host"]),
  },
});
