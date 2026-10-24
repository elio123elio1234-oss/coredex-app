import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, Mail, Phone, Pin } from "./Icons";
import { CAPTCHA_POLICY_URL, LEADS_URL } from "../config/api";

/* ==================================================================
   ContactForm — "Request the deck", the page's one action (#contact).
   Posts a LEAD to the CYPHIX server (`POST /api/v1/leads`, v0.23.0):
   name, work e-mail, fund or company, an optional message. The server
   thanks the sender by e-mail and tells the team; the form only has to
   say "received".

   The lead contract has no "investor" type yet (shared contact/contract
   LeadOrgType = clinic | hospital | practice | patient | other), so an
   investor's request goes in as `orgType: "other"` with the fund in
   `organization` and `source: "landing"`. Adding the type is a shared +
   server change, tracked in the CHANGELOG.

   Bot protection is the server's call: it asks `GET /auth/captcha` and
   renders Cloudflare's Turnstile widget ONLY when the policy names a
   provider — nothing is loaded otherwise. The limits mirror the
   server's schema (LEAD_LIMITS), so a refusal is rare and explained.
   ================================================================== */

const LIMITS = { nameMin: 2, nameMax: 80, organizationMax: 120, messageMax: 1000 } as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
const EMAIL = "elio123elio1234@gmail.com";
const PHONE = "+972 54-398-9698";

type Status = "idle" | "sending" | "sent" | "error";

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Loads Cloudflare's script once, after — and only after — the policy asked for it. */
function loadTurnstile(): Promise<TurnstileApi> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const existing = document.querySelector<HTMLScriptElement>(`script[src^="${TURNSTILE_SRC}"]`);
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = `${TURNSTILE_SRC}?render=explicit`;
      script.async = true;
      document.head.appendChild(script);
    }
    const poll = window.setInterval(() => {
      if (window.turnstile) {
        window.clearInterval(poll);
        resolve(window.turnstile);
      }
    }, 50);
    script.addEventListener("error", () => {
      window.clearInterval(poll);
      reject(new Error("turnstile script failed"));
    });
    window.setTimeout(() => {
      window.clearInterval(poll);
      if (!window.turnstile) reject(new Error("turnstile script timeout"));
    }, 15_000);
  });
}

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  /* The CAPTCHA, the server's decision. */
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch(CAPTCHA_POLICY_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((p: { provider?: string; siteKey?: string } | null) => {
        if (live && p?.provider === "turnstile" && p.siteKey) setSiteKey(p.siteKey);
      })
      .catch(() => {
        /* No policy → no widget; the server will say `captcha_required` if it wanted one. */
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!siteKey || !widgetRef.current || widgetId.current) return;
    const el = widgetRef.current;
    let cancelled = false;
    loadTurnstile()
      .then((ts) => {
        if (cancelled) return;
        widgetId.current = ts.render(el, {
          sitekey: siteKey,
          theme: "light",
          callback: (token: string) => setCaptchaToken(token),
          "expired-callback": () => setCaptchaToken(null),
          "error-callback": () => setCaptchaToken(null),
        });
      })
      .catch(() => setError("The verification widget could not load. Please try again later."));
    return () => {
      cancelled = true;
    };
  }, [siteKey]);

  const problems = {
    name: name.trim().length < LIMITS.nameMin || name.trim().length > LIMITS.nameMax,
    email: !EMAIL_RE.test(email.trim()),
    organization: organization.length > LIMITS.organizationMax,
    message: message.length > LIMITS.messageMax,
  };
  const invalid = Object.values(problems).some(Boolean);
  const needsCaptcha = Boolean(siteKey) && !captchaToken;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (invalid || needsCaptcha || status === "sending") return;
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch(LEADS_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          orgType: "other",
          organization: organization.trim() || undefined,
          message: message.trim() || undefined,
          source: "landing",
          lang: "en",
          captchaToken: captchaToken ?? undefined,
        }),
      });
      if (res.status === 201) {
        setStatus("sent");
        return;
      }
      let detail = "";
      try {
        const body = (await res.json()) as { error?: { code?: string; message?: string } };
        detail = body.error?.message ?? "";
        if (body.error?.code?.startsWith("captcha")) {
          setCaptchaToken(null);
          if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
        }
      } catch {
        /* no JSON body */
      }
      setError(
        res.status === 429
          ? "Too many requests from this address. Please try again in a few minutes."
          : detail || "Something went wrong. Please try again, or write to us directly.",
      );
      setStatus("error");
    } catch {
      setError("We could not reach the server. Check your connection, or write to us directly.");
      setStatus("error");
    }
  };

  const bad = (k: keyof typeof problems) => (touched && problems[k] ? " is-invalid" : "");

  return (
    <section className="section contact" id="contact" aria-labelledby="contact-title">
      <div className="wrap contact-grid">
        <div className="contact-copy">
          <h2 id="contact-title" className="h2">
            Request the deck.
          </h2>
          <p className="body-lg">
            Tell us who you are. We will send the deck and find a time to talk.
          </p>
          <ul className="direct">
            <li>
              <Mail />
              <a href={`mailto:${EMAIL}?subject=Cyphix%20%E2%80%94%20deck%20request`}>{EMAIL}</a>
            </li>
            <li>
              <Phone />
              <a href={`tel:${PHONE.replace(/[^+\d]/g, "")}`}>{PHONE}</a>
            </li>
            <li>
              <Pin />
              <span>Kiryat Ono, Israel</span>
            </li>
          </ul>
        </div>

        <div className="contact-panel">
          {status === "sent" ? (
            <div className="contact-sent" role="status">
              <span className="contact-check" aria-hidden="true">
                <Check width={22} height={22} />
              </span>
              <h3>Thank you, {name.trim().split(/\s+/)[0]}.</h3>
              {/* No "confirmation e-mail" promise: the server only mails when its
                  provider is configured (/healthz "email"), and today it is off. */}
              <p>
                Your request is in. We will reply to <strong>{email.trim()}</strong> within a few
                days.
              </p>
            </div>
          ) : (
            <form className="form" onSubmit={submit} noValidate data-status={status}>
              <div className="form-row">
                <label className={`field${bad("name")}`}>
                  <span>Full name</span>
                  <input
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    maxLength={LIMITS.nameMax}
                    required
                  />
                </label>
                <label className={`field${bad("email")}`}>
                  <span>Work e-mail</span>
                  <input
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    inputMode="email"
                    required
                  />
                </label>
              </div>
              <label className={`field${bad("organization")}`}>
                <span>
                  Fund or company <em>optional</em>
                </span>
                <input
                  name="organization"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  autoComplete="organization"
                  maxLength={LIMITS.organizationMax}
                />
              </label>
              <label className={`field${bad("message")}`}>
                <span>
                  Message <em>optional</em>
                </span>
                <textarea
                  name="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={LIMITS.messageMax}
                  placeholder="What would you like to see first: the prototype, the data, the plan?"
                />
              </label>
              {siteKey && <div ref={widgetRef} className="form-captcha" />}
              {touched && invalid && (
                <p className="form-error" role="alert">
                  Please add your name and a valid e-mail address.
                </p>
              )}
              {touched && !invalid && needsCaptcha && (
                <p className="form-error" role="alert">
                  Please complete the verification first.
                </p>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={status === "sending"}>
                  {status === "sending" ? "Sending…" : "Request the deck"}
                  {status !== "sending" && <ArrowRight />}
                </button>
                <span className="form-note">We use your details only to answer this request.</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

// v0.23.0 — back to v0.21.0: the frosted-glass trial moved to the footer (the user)
// v0.22.0 — (withdrawn) the section on frosted glass over the heart-hands image
// v0.7.0 — no reveal wrappers; the heading takes the page's h2 voice
// v0.6.1 — the sent state no longer promises a confirmation e-mail the server may not send
// v0.6.0 — re-cut for investors: name · e-mail · fund · message, "Request the deck", direct e-mail / phone;
//          posts orgType "other" until the lead contract has an investor type
// v0.1.0 — the "Request access" form: posts a lead to the API, Turnstile only when the
//          server's policy asks for it, a sent state, honest errors (LAUNCH_PLAN 5.4, L1)
