import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { dictionaries } from "@/i18n";
import { buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const DISMISS_KEY = "laplapla_pwa_install_dismissed_at";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 14;

type PWAInstallBannerProps = {
  disabled?: boolean;
};

function wasDismissedRecently() {
  if (typeof window === "undefined") {
    return true;
  }

  const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY));
  return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_TTL_MS;
}

export default function PWAInstallBanner({ disabled = false }: PWAInstallBannerProps) {
  const router = useRouter();
  const install = usePWAInstall();
  const lang = getCurrentLang(router);
  const t = dictionaries[lang].pwaInstall.banner;
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(wasDismissedRecently());
  }, [router.asPath]);

  const visible = useMemo(() => {
    if (disabled || dismissed || install.installed || install.standalone) {
      return false;
    }

    return install.installable || install.ios;
  }, [disabled, dismissed, install.installed, install.installable, install.ios, install.standalone]);

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (install.canPrompt) {
      await install.promptInstall();
      return;
    }

    void router.push(
      {
        pathname: "/install",
        query: buildLocalizedQuery(lang),
      },
      undefined,
      { locale: lang },
    );
  };

  if (!visible) {
    return null;
  }

  return (
    <aside className="pwa-install-banner" aria-label={t.ariaLabel}>
      <div className="pwa-install-banner__icon" aria-hidden="true">
        <Image src="/laplapla-logo.webp" alt="" width={44} height={44} />
      </div>
      <div className="pwa-install-banner__copy">
        <strong>{install.ios ? t.iosTitle : t.title}</strong>
        <span>{install.ios ? t.iosText : t.text}</span>
      </div>
      <div className="pwa-install-banner__actions">
        <button type="button" className="pwa-install-banner__primary" onClick={() => void handleInstall()}>
          {install.canPrompt ? t.installButton : t.instructionsButton}
        </button>
        <button type="button" className="pwa-install-banner__close" onClick={handleDismiss} aria-label={t.dismissLabel}>
          ×
        </button>
      </div>
    </aside>
  );
}
