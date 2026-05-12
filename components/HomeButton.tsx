// components/Navigation/HomeButton.tsx
import Link from "next/link";
import { buildLocalizedPublicPath, getCurrentLang } from "@/lib/i18n/routing";
import { useRouter } from "next/router";

export default function HomeButton() {
  const router = useRouter();
  const lang = getCurrentLang(router);

  return (
    <Link
      className="home-button"
      href={buildLocalizedPublicPath("/", lang)}
      locale={lang}
      aria-label="LapLapLa Home"
    >
      🏠
    </Link>
  );
}
