import type { ReactNode } from "react";
import type { Lang } from "@/i18n";
import type { QuestPageDefinition } from "@/lib/shop/questDocument";

type QuestPageProps = {
  definition: QuestPageDefinition;
  locale: Lang;
  children: ReactNode;
};

export function QuestPage({ definition, locale, children }: QuestPageProps) {
  return (
    <article
      className="quest-page-frame"
      data-page-id={definition.id}
      data-page-type={definition.type}
      data-print-order={definition.printOrder}
      data-printable={definition.printable ? "true" : "false"}
      data-side={"side" in definition ? definition.side : undefined}
      data-pair-id={"pairId" in definition ? definition.pairId : undefined}
      data-duplex-mode={
        "duplexMode" in definition ? definition.duplexMode : undefined
      }
      dir={locale === "he" ? "rtl" : "ltr"}
      lang={locale}
      aria-label={definition.title?.[locale]}
    >
      {children}
    </article>
  );
}
