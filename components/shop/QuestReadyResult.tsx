import Link from "next/link";
import { dictionaries, type Lang } from "@/i18n";
import type { QuestPersonalization } from "@/lib/shop/questPersonalization";

type PrintStatus = "idle" | "preparing" | "error";
const LANGUAGE_NAMES: Record<Lang, string> = { ru: "Русский", en: "English", he: "עברית" };

export function QuestReadyResult({ personalization, interfaceLang, printStatus, onEdit, onPrint, accountPath }: {
  personalization: QuestPersonalization;
  interfaceLang: Lang;
  printStatus: PrintStatus;
  onEdit: () => void;
  onPrint: () => void;
  accountPath: string;
}) {
  const text = dictionaries[interfaceLang].shop.soundCase.builder;
  const participants = personalization.participants.filter((name) => name.trim());
  return (
    <section className="quest-ready" aria-labelledby="quest-ready-title" dir={interfaceLang === "he" ? "rtl" : "ltr"} lang={interfaceLang}>
      <header className="quest-ready__hero"><span aria-hidden="true">✓</span><p>{text.readyEyebrow}</p><h2 id="quest-ready-title">{text.readyTitle}</h2><p>{text.readyBody}</p></header>
      <div className="quest-ready__content">
        <section className="quest-ready__summary" aria-label={text.readySummaryTitle}><h3>{text.readySummaryTitle}</h3><dl>
          <div><dt>{text.readyLead}</dt><dd><bdi>{personalization.leadName}</bdi></dd></div>
          {participants.length ? <div><dt>{text.readyTeam}</dt><dd>{participants.map((name, index) => <bdi key={`${index}-${name}`}>{name}</bdi>)}</dd></div> : null}
          <div><dt>{text.readyLanguage}</dt><dd>{LANGUAGE_NAMES[personalization.locale]}</dd></div>
          <div><dt>{text.readyPages}</dt><dd>{text.readyPagesValue}</dd></div>
          <div><dt>{text.readyDurationLabel}</dt><dd>{text.readyDuration}</dd></div>
        </dl></section>
        <section className="quest-ready__print" aria-labelledby="quest-ready-print-title"><h3 id="quest-ready-print-title">{text.readyPrintTitle}</h3><p>{text.readyPrintHelp}</p>
          <button type="button" disabled={printStatus === "preparing"} aria-busy={printStatus === "preparing"} onClick={onPrint}>{printStatus === "preparing" ? text.printPreparing : text.print}</button>
          {printStatus === "error" ? <div className="quest-ready__print-error" role="alert"><p>{text.printFailed}</p><button type="button" onClick={onPrint}>{text.retryPrint}</button></div> : null}
        </section>
      </div>
      <footer className="quest-ready__actions"><button type="button" onClick={onEdit}>{text.editPersonalization}</button><Link href={accountPath}>{text.backToPurchases}</Link><p>{text.readyReturn}</p></footer>
    </section>
  );
}
