import { dictionaries } from "@/i18n";
import type { QuestPersonalization } from "@/lib/shop/questPersonalization";
import { SOUND_CASE_001_CARD_BOX } from "@/lib/shop/quests/sound-case-001/cardBox";

type Stage1CardBoxPageProps = {
  personalization: QuestPersonalization;
  parrotUrl: string;
};

function BoxWave({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`quest-card-box-artwork__wave${compact ? " quest-card-box-artwork__wave--compact" : ""}`}
      aria-hidden="true"
    >
      <i /><i /><i /><i /><i /><i /><i />
    </span>
  );
}

export function Stage1CardBoxPage({
  personalization,
  parrotUrl,
}: Stage1CardBoxPageProps) {
  const soundCase = dictionaries[personalization.locale].shop.soundCase;
  const text = soundCase.cardBox;
  const dossier = soundCase.caseCover;
  const { internalSizeMm, dielineSizeMm } = SOUND_CASE_001_CARD_BOX;
  const participants = personalization.participants
    .map((name) => name.trim())
    .filter(Boolean);
  const leadName = personalization.leadName.trim() || dossier.namePlaceholder;
  const direction = personalization.locale === "he" ? "rtl" : "ltr";

  return (
    <section
      className="quest-card-box-sheet"
      data-card-box-dieline="stage-1-sound-card-box"
      data-card-box-internal-size={`${internalSizeMm.width}x${internalSizeMm.height}x${internalSizeMm.depth}mm`}
      data-card-box-dieline-size={`${dielineSizeMm.width}x${dielineSizeMm.height}mm`}
    >
      <header className="quest-card-box-sheet__header">
        <div>
          <bdi dir="ltr">LAP LAP LA ADVENTURES · SOUND CASE #001</bdi>
          <h1>{text.title}</h1>
        </div>
        <div className="quest-card-box-sheet__legend" aria-label={text.legendLabel}>
          <span className="quest-card-box-sheet__cut-key">
            <span aria-hidden="true">✂</span> {text.cutLabel}
          </span>
          <span className="quest-card-box-sheet__fold-key">
            <span aria-hidden="true" /> {text.foldLabel}
          </span>
        </div>
      </header>

      <div className="quest-card-box-sheet__dieline">
        <div className="quest-card-box-artwork" aria-label={dossier.printLabTitle}>
          <section
            className="quest-card-box-artwork__panel quest-card-box-artwork__front"
            id="box-artwork-front-panel"
            dir={direction}
          >
            <bdi className="quest-card-box-artwork__brand" dir="ltr">LAP LAP LA ADVENTURES</bdi>
            <span className="quest-card-box-artwork__case"><bdi dir="ltr">SOUND CASE #001</bdi></span>
            <span className="quest-card-box-artwork__stage">{text.stageNumber}</span>
            <p>{dossier.kicker}</p>
            <h2>{soundCase.title}</h2>
            <strong className="quest-card-box-artwork__game">{dossier.gameHeading}</strong>
            <BoxWave />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={parrotUrl} alt="" />
            <bdi className="quest-card-box-artwork__lab" dir="ltr">PARROT SOUND LAB</bdi>
          </section>

          <section
            className="quest-card-box-artwork__panel quest-card-box-artwork__back"
            id="box-artwork-back-panel"
            dir={direction}
          >
            <header><bdi dir="ltr">CASE DOSSIER · #001</bdi><BoxWave compact /></header>
            <div className="quest-card-box-artwork__investigators">
              <p><strong>{dossier.leadHeading}</strong> <bdi>{leadName}</bdi></p>
              <div>
                <strong>{dossier.teamHeading}</strong>
                {participants.length ? (
                  <ul>
                    {participants.map((name, index) => (
                      <li key={`${index}-${name}`}><bdi>{name}</bdi></li>
                    ))}
                  </ul>
                ) : <span>{dossier.participantsEmpty}</span>}
              </div>
            </div>
            <p className="quest-card-box-artwork__intro">
              {dossier.dossierIntroPrefix}{" "}<bdi dir="ltr">PARROT SOUND LAB</bdi>{" "}{dossier.dossierIntroSuffix}
            </p>
            <dl>
              {dossier.dossierStatuses.map((status) => (
                <div key={status.label}><dt>{status.label}</dt><dd>{status.value}</dd></div>
              ))}
            </dl>
            <p className="quest-card-box-artwork__assignment">{dossier.assignment}</p>
          </section>

          <aside className="quest-card-box-artwork__side quest-card-box-artwork__side--left">
            <bdi dir="ltr">PARROT SOUND LAB</bdi><BoxWave compact />
          </aside>
          <aside className="quest-card-box-artwork__side quest-card-box-artwork__side--right">
            <bdi dir="ltr">SOUND CASE #001</bdi><BoxWave compact /><span>{text.stageNumber}</span>
          </aside>
          <div className="quest-card-box-artwork__top" aria-hidden="true">
            <bdi dir="ltr">CASE #001</bdi><BoxWave compact />
          </div>
          <div className="quest-card-box-artwork__bottom" aria-hidden="true">
            <BoxWave compact /><bdi dir="ltr">LAP LAP LA</bdi>
          </div>
        </div>

        {/* Vector cut/fold geometry stays above the independent artwork layer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="quest-card-box-sheet__guides" src={SOUND_CASE_001_CARD_BOX.svgPath} alt={text.svgAlt} />
      </div>

      <footer className="quest-card-box-sheet__instructions">
        <strong>{text.assemblyTitle}</strong>
        <ol>{text.assemblySteps.map((step) => <li key={step}>{step}</li>)}</ol>
        <p>{text.printNote}</p>
      </footer>
    </section>
  );
}
