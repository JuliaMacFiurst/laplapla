import { useRouter } from "next/router";
import { dictionaries, Lang } from "@/i18n";
import React from "react";

interface CatsLayoutProps {
  children: React.ReactNode;
  active: "view" | "studio";
  lang: Lang;
}

export default function CatsLayout({ children, active, lang }: CatsLayoutProps) {
  const router = useRouter();
  const t = dictionaries[lang].cats;

  const pageTitle = active === "studio" ? t.studioTab : t.title;
  const pageSubtitle = active === "studio" ? t.studioSubtitle : t.subtitle;

  return (
    <div className="cat-page-container">
      
    <h1 className="cat-page-title page-title">{pageTitle}</h1>
     <p className="cat-page-subtitle page-subtitle">{pageSubtitle}</p>
      

      <div className="mode-tabs">
        <button
          className={`mode-tab-button ${active === "view" ? "active" : ""}`}
          onClick={() => router.push("/cats")}
        >
          🐱 {t.title}
        </button>

        <button
          className={`mode-tab-button ${active === "studio" ? "active" : ""}`}
          onClick={() => router.push("/cats/studio")}
        >
          🎬 {t.studioTab}
        </button>
      </div>

      {children}
    </div>
  );
}