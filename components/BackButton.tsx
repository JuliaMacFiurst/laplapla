import { useRouter } from "next/router";
import { buildLocalizedHref, getCurrentLang } from "@/lib/i18n/routing";

type BackButtonProps = {
  href?: string;
};

export default function BackButton({ href }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      className="back-button"
      onClick={() => {
        if (href) {
          const lang = getCurrentLang(router);
          router.push(buildLocalizedHref(href, lang), undefined, { locale: lang });
        } else {
          router.back();
        }
      }}
      aria-label="Go back"
    >
      🔙
    </button>
  );
}
