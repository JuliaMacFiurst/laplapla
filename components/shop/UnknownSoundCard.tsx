import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";
import type { UnknownSoundCardDefinition } from "@/lib/shop/quests/sound-case-001/unknownSoundCard";

function UnknownWaveMark() {
  return (
    <span className="quest-unknown-sound-card__wave" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

type UnknownSoundCardFrontProps = {
  definition: UnknownSoundCardDefinition;
  locale: Lang;
  parrotUrl: string;
};

export function UnknownSoundCardFront({
  definition,
  locale,
  parrotUrl,
}: UnknownSoundCardFrontProps) {
  const text = dictionaries[locale].shop.soundCase.unknownSoundCard;

  return (
    <article
      className="quest-unknown-sound-card quest-unknown-sound-card--front"
      data-physical-object-id={definition.id}
      data-rendering-role={definition.frontRole}
      data-asset-id={definition.parrotAssetId}
      data-asset-status="resolved"
      dir={locale === "he" ? "rtl" : "ltr"}
      lang={locale}
    >
      <header className="quest-unknown-sound-card__header">
        <bdi dir="ltr">PARROT SOUND LAB</bdi>
      </header>

      <h2>
        <span>{text.title}</span>{" "}
        <span>
          {text.numberPrefix}
          <bdi dir="ltr">001</bdi>
        </span>
      </h2>
      <UnknownWaveMark />

      <div
        className="quest-unknown-sound-card__qr-reserved"
        data-qr-reserved="true"
        data-qr-destination={definition.qrDestination}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="quest-unknown-sound-card__qr"
          src={definition.qrAssetPath}
          alt={text.qrAccessLabel}
        />
      </div>

      <div className="quest-unknown-sound-card__listen">
        <span aria-hidden="true" />
        <strong>{text.listenAction}</strong>
      </div>
      <p className="quest-unknown-sound-card__question">{text.question}</p>

      <div className="quest-unknown-sound-card__lower">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={parrotUrl} alt="" />
        <div dir={locale === "he" ? "rtl" : "ltr"}>
          <p className="quest-unknown-sound-card__evidence">
            {text.evidenceLines.join(" ")}
          </p>
          <p className="quest-unknown-sound-card__action">
            {text.actionLines.join(" ")}
          </p>
        </div>
      </div>
    </article>
  );
}

type UnknownSoundCardBackProps = {
  definition: UnknownSoundCardDefinition;
};

export function UnknownSoundCardBack({
  definition,
}: UnknownSoundCardBackProps) {
  return (
    <article
      className="quest-unknown-sound-card quest-unknown-sound-card--back"
      data-physical-object-id={definition.id}
      data-rendering-role={definition.backRole}
      dir="ltr"
    >
      <bdi className="quest-unknown-sound-card__back-brand" dir="ltr">
        LAP LAP LA ADVENTURES
      </bdi>
      <UnknownWaveMark />
      <span className="quest-unknown-sound-card__question-mark" aria-hidden="true">
        ?
      </span>
      <bdi className="quest-unknown-sound-card__back-lab" dir="ltr">
        PARROT SOUND LAB
      </bdi>
    </article>
  );
}
