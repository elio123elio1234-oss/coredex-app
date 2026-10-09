import { useEffect, useRef, useState, type FormEvent } from "react";
import Reveal from "./Reveal";
import { CAPTCHA_POLICY_URL, LEADS_URL } from "../config/api";

/* ==================================================================
   ContactForm — the "Request access" form every CTA on the page points
   at (#contact). Posts a LEAD to the CYPHIX server (`POST /api/v1/leads`,
   v0.23.0): name, work e-mail, who you are, an optional organization
   and message. The server thanks the sender by e-mail and tells the
   team; the form only has to say "received".

   Bot protection is the server's call: it asks `GET /auth/captcha` and
   renders Cloudflare's Turnstile widget ONLY when the policy names a
   provider — nothing is loaded otherwise, and the form is exactly a
   form. The limits mirror the server's schema (shared contact/contract
   LEAD_LIMITS), so a refusal is rare and explained.

   No medical details belong here, and the form says so: a lead is a
   business contact, kept in the clear.
   ================================================================== */

type OrgType = "clinic" | "hospital" | "practice" | "patient" | "other";
const ORG_TYPES: Array<{ id: OrgType; label: string }> = [
  { id: "clinic", label: "A clinic" },
  { id: "hospital", label: "A hospital" },
  { id: "practice", label: "A private practice" },
  { id: "patient", label: "A patient / an individual" },
  { id: "other", label: "Other" },
];
const LIMITS = { nameMin: 2, nameMax: 80, organizationMax: 120, messageMax: 1000 } as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

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
  const [orgType, setOrgType] = useState<OrgType | "">("");
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
      .catch(() => setError("The verification widget could not load — please try again later."));
    return () => {
      cancelled = true;
    };
  }, [siteKey]);

  const problems = {
    name: name.trim().length < LIMITS.nameMin || name.trim().length > LIMITS.nameMax,
    email: !EMAIL_RE.test(email.trim()),
    orgType: orgType === "",
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
          orgType,
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
          ? "Too many requests from this address — please try again in a few minutes."
          : detail || "Something went wrong — please try again.",
      );
      setStatus("error");
    } catch {
      setError("We could not reach the server — please check your connection and try again.");
      setStatus("error");
    }
  };

  return (
    <section className="section contact" id="contact" aria-labelledby="contact-title">
      <div className="container">
        <div className="section-head">
          <Reveal as="div">
            <span className="section-eyebrow">Get in touch</span>
            <h2 id="contact-title">Request access</h2>
          </Reveal>
          <Reveal className="section-sub" as="div" delay={0.06}>
            Tell us who you are and what you are looking for. Someone from the team
            will be in touch within a few days.
          </Reveal>
        </div>

        <Reveal className="contact-card card" as="div" delay={0.12}>
          {status === "sent" ? (
            <div className="contact-sent" role="status">
              <span className="contact-check" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <h3>Thank you, {name.trim()}.</h3>
              <p>
                We received your request and sent a confirmation to <strong>{email.trim()}</strong>.
                We will be in touch within a few days.
              </p>
            </div>
          ) : (
            <form className="contact-form" onSubmit={submit} noValidate data-status={status}>
              <div className="field-row">
                <label className={`field${touched && problems.name ? " is-invalid" : ""}`}>
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
                <label className={`field${touched && problems.email ? " is-invalid" : ""}`}>
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
              <div className="field-row">
                <label className={`field${touched && problems.orgType ? " is-invalid" : ""}`}>
                  <span>I am</span>
                  <select name="orgType" value={orgType} onChange={(e) => setOrgType(e.target.value as OrgType)} required>
                    <option value="" disabled>
                      Choose one…
                    </option>
                    {ORG_TYPES.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>
                    Organization <em>optional</em>
                  </span>
                  <input
                    name="organization"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    autoComplete="organization"
                    maxLength={LIMITS.organizationMax}
                  />
                </label>
              </div>
              <label className="field">
                <span>
                  Message <em>optional</em>
                </span>
                <textarea
                  name="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={LIMITS.messageMax}
                  placeholder="How many patients, which setting, what you would like to see…"
                />
              </label>
              <p className="form-note">
                This form is for access requests only — please do not include medical details.
              </p>
              {siteKey && <div ref={widgetRef} className="contact-captcha" />}
              {touched && invalid && (
                <p className="form-error" role="alert">
                  Please give your name, a valid e-mail address, and tell us who you are.
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
              <div className="contact-actions">
                <button type="submit" className="btn btn-primary" disabled={status === "sending"}>
                  {status === "sending" ? "Sending…" : "Request access"}
                </button>
                <span className="contact-privacy">We use your details only to answer this request.</span>
              </div>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}

// v0.1.0 — the "Request access" form: posts a lead to the API, Turnstile only when the
//          server's policy asks for it, a sent state, honest errors (LAUNCH_PLAN 5.4, L1)
