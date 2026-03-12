// components/Navigation/HomeButton.tsx
import { useRouter } from "next/router";
import { buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";

export default function HomeButton() {
  const router = useRouter();
  const lang = getCurrentLang(router);

  return (
    <button
      className="home-button"
      onClick={() =>
        router.push(
          { pathname: "/", query: buildLocalizedQuery(lang) },
          undefined,
          { locale: lang },
        )
      }
      aria-label="Home"
    >
      🏠
    </button>
  );
}
