import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { getCurrentLang } from "@/lib/i18n/routing";
import { dictionaries } from "@/i18n";

export function ShopComingSoon() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const dict = dictionaries[lang].shop;

  return (
    <div className="ShopComingSoon" dir={lang === "he" ? "rtl" : "ltr"}>
      <div className="ShopComingSoon-icon" aria-hidden="true">
        🎁
      </div>
      <h1 className="ShopComingSoon-title">{dict.comingSoonTitle}</h1>
      <p className="ShopComingSoon-text">{dict.comingSoonText}</p>
      <Link href="/" className="ShopComingSoon-action">
        {dict.exploreFreeContent}
      </Link>
    </div>
  );
}
