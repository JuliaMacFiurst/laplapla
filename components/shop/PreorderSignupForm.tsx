import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { dictionaries, type Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import type {
  PreorderOfferStatus,
  PreorderSignupResponse,
} from "@/lib/shop/preorders";

type FormState = "idle" | "submitting" | "success" | "error" | "closed";

const formatPreorderPrice = (priceMinor: number, currency: string, lang: Lang) => {
  if (currency === "ILS" && priceMinor % 100 === 0) {
    return `${priceMinor / 100} ₪`;
  }

  return new Intl.NumberFormat(lang === "he" ? "he-IL" : lang === "en" ? "en-US" : "ru-RU", {
    style: "currency",
    currency,
  }).format(priceMinor / 100);
};

export function PreorderSignupForm({
  lang,
  initialOfferStatus,
  canonicalPriceMinor,
  preorderPriceMinor,
  currency,
}: {
  lang: Lang;
  initialOfferStatus: PreorderOfferStatus;
  canonicalPriceMinor: number;
  preorderPriceMinor: number;
  currency: string;
}) {
  const copy = dictionaries[lang].soundCasePreorder;
  const canonicalPrice = formatPreorderPrice(canonicalPriceMinor, currency, lang);
  const preorderPrice = formatPreorderPrice(preorderPriceMinor, currency, lang);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<FormState>(
    initialOfferStatus === "open" ? "idle" : "closed",
  );
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "submitting" || state === "success" || state === "closed") return;

    if (!emailInputRef.current?.checkValidity()) {
      setMessage(copy.invalidEmail);
      setState("error");
      return;
    }
    if (!consent) {
      setMessage(copy.consentRequired);
      setState("error");
      return;
    }

    setState("submitting");
    setMessage(null);

    try {
      const response = await fetch("/api/shop/preorders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), consent: true, locale: lang }),
      });
      const payload = await response.json().catch(() => null) as PreorderSignupResponse | null;

      if (response.ok && payload?.ok) {
        setState("success");
        return;
      }

      if (payload && !payload.ok && payload.code === "preorder_closed") {
        setState("closed");
        return;
      }

      const validationMessage = payload && !payload.ok
        ? payload.code === "invalid_email"
          ? copy.invalidEmail
          : payload.code === "consent_required"
            ? copy.consentRequired
            : copy.serverError
        : copy.serverError;
      setMessage(validationMessage);
      setState("error");
    } catch {
      setMessage(copy.serverError);
      setState("error");
    }
  };

  if (state === "closed") {
    return (
      <section className="preorder-card preorder-card--status" aria-labelledby="preorder-closed-title">
        <h2 id="preorder-closed-title">{copy.closedTitle}</h2>
        <p>{copy.closedBody}</p>
      </section>
    );
  }

  if (state === "success") {
    return (
      <section className="preorder-card preorder-card--status preorder-card--success" aria-labelledby="preorder-success-title" role="status">
        <span aria-hidden="true">✓</span>
        <h2 id="preorder-success-title">{copy.successTitle}</h2>
        <p>{copy.successBody}</p>
      </section>
    );
  }

  return (
    <section className="preorder-card" aria-labelledby="preorder-form-title">
      <div className="preorder-prices" aria-label={`${copy.regularPrice}: ${canonicalPrice}. ${copy.preorderPrice}: ${preorderPrice}.`}>
        <div>
          <span>{copy.regularPrice}</span>
          <s><bdi>{canonicalPrice}</bdi></s>
        </div>
        <div className="preorder-prices__offer">
          <span>{copy.preorderPrice}</span>
          <strong><bdi>{preorderPrice}</bdi></strong>
        </div>
      </div>
      <p id="preorder-form-title" className="preorder-no-payment">{copy.noPayment}</p>
      <form className="preorder-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <label htmlFor="preorder-email">{copy.emailLabel}</label>
        <input
          ref={emailInputRef}
          id="preorder-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={320}
          required
          dir="ltr"
          value={email}
          placeholder={copy.emailPlaceholder}
          onChange={(event) => setEmail(event.target.value)}
          disabled={state === "submitting"}
        />
        <label className="preorder-consent" htmlFor="preorder-consent">
          <input
            id="preorder-consent"
            name="consent"
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            disabled={state === "submitting"}
            required
          />
          <span>
            {copy.consentBeforePrivacy}
            <Link href={buildLocalizedPublicPath("/privacy", lang)}>{copy.privacyLabel}</Link>
            {copy.consentAfterPrivacy}
          </span>
        </label>
        <button type="submit" disabled={state === "submitting"}>
          {state === "submitting" ? copy.submitting : copy.submit}
        </button>
        {message ? <p className="preorder-form__error" role="alert">{message}</p> : null}
      </form>
    </section>
  );
}
