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
      dir={locale === "he" ? "rtl" : "ltr"}
      lang={locale}
      aria-label={definition.title?.[locale]}
    >
      {children}
    </article>
  );
}
