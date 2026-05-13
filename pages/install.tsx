import Image from "next/image";
import { useRouter } from "next/router";
import SEO from "@/components/SEO";
import { dictionaries, type Lang } from "@/i18n";
import { getCurrentLang } from "@/lib/i18n/routing";
import { usePWAInstall } from "@/hooks/usePWAInstall";

type InstallCardKey = "android" | "ios" | "mac" | "windows";

const CARD_KEYS: InstallCardKey[] = ["android", "ios", "mac", "windows"];

export default function InstallPage() {
  const router = useRouter();
  const lang = getCurrentLang(router) as Lang;
  const install = usePWAInstall();
  const t = dictionaries[lang].pwaInstall;

  const buttonText = install.canPrompt ? t.page.installButton : t.page.unavailableButton;

  return (
    <>
      <SEO
        title={t.seo.title}
        description={t.seo.description}
        path="/install"
        lang={lang}
      />

      <main className="pwa-install-page">
        <section className="pwa-install-page__hero">
          <div>
            <p className="pwa-install-page__kicker">{t.page.kicker}</p>
            <h1>{t.page.title}</h1>
            <p className="pwa-install-page__lead">
              {install.standalone || install.installed ? t.page.installedNote : t.page.lead}
            </p>
            {!install.standalone && !install.installed ? (
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
      </main>
    </>
  );
}
