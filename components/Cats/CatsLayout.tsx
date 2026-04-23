import { useRouter } from "next/router";
import { dictionaries, Lang } from "@/i18n";
import React from "react";
import { buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";
import { buildStudioRoute } from "@/lib/studioRouting";

interface CatsLayoutProps {
  children: React.ReactNode;
  active: "view" | "studio";
  lang: Lang;
  topbarAction?: React.ReactNode;
}

export default function CatsLayout({ children, active, lang, topbarAction }: CatsLayoutProps) {
  const router = useRouter();
  const currentLang = getCurrentLang(router);
  const t = dictionaries[lang].cats;

  const pageTitle = active === "studio" ? t.studioTab : t.title;
  const pageSubtitle = active === "studio" ? t.studioSubtitle : t.subtitle;

  return (
    <div className={active === "studio" ? "studio-layout-wrapper" : "cat-page-container"}>
      
    <h1 className="cat-page-title page-title">{pageTitle}</h1>
     <p className="cat-page-subtitle page-subtitle">{pageSubtitle}</p>
      

      <div className="cats-topbar">
        <div className="mode-tabs">
          <button
            className={`mode-tab-button ${active === "view" ? "active" : ""}`}
            onClick={() =>
              router.push(
                { pathname: "/cats", query: buildLocalizedQuery(currentLang) },
                undefined,
                { locale: currentLang },
              )
            }
          >
            🐱 {t.title}
          </button>

          <button
            className={`mode-tab-button ${active === "studio" ? "active" : ""}`}
            onClick={() =>
              router.push(
                buildStudioRoute("cats", currentLang),
                undefined,
                { locale: currentLang },
              )
            }
          >
            🎬 {t.studioTab}
          </button>
        </div>

        {topbarAction ? <div className="cats-topbar-action">{topbarAction}</div> : null}
      </div>

      {children}
    </div>
  );
}
