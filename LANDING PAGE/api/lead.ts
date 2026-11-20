/* ==================================================================
   POST /api/lead — the "Request the deck" form's door (Vercel function).

   Why it exists: the form used to post straight to the CYPHIX server
   (`POST /api/v1/leads`). The server stores the lead, but it only mails
   when RESEND_API_KEY is set on Render, and it is not (/healthz says
   "email":"off"). Even with a key its team e-mail goes to the ADMIN
   accounts and carries only a name, not the request. So nothing reached
   the founder's inbox.

   What it does, in order:
   1. Checks the fields with the same limits as the server (LEAD_LIMITS).
   2. Passes the lead on to the server as before, with the visitor's IP
      and browser, so the server's per-IP limit, its CAPTCHA and its
      record (/admin/leads) keep working unchanged.
   3. If the server took it (201), could not be reached (5xx / network),
      or has not answered within SERVER_WAIT_MS (asleep on Render's free
      plan), e-mails the whole request to LEADS_NOTIFY_TO via Resend,
      Reply-To = the sender, so "Reply" answers them directly. A 4xx from
      the server (bad field, too many requests, CAPTCHA) is handed back
      untouched and nothing is mailed.
   4. Thanks the investor by e-mail (`investorReply`), Reply-To = the
      founder's inbox, but ONLY when EMAIL_FROM is on a verified domain:
      Resend's test sender delivers to the account owner alone, so from
      it the thank-you would only bounce.

   Env (Vercel → cyphix-landing → Settings → Environment Variables):
     RESEND_API_KEY   required for the e-mail; without it the lead is
                      only stored on the server (the old behaviour)
     LEADS_NOTIFY_TO  required for the e-mail; the inbox, comma-separated
                      for several. With Resend's test sender it must be
                      the address the Resend account was opened with.
     EMAIL_FROM       optional; default "CYPHIX <onboarding@resend.dev>"
                      (Resend's test sender). Set it to an address on
                      cyphix.co once Resend has verified the domain, and
                      the investor's thank-you switches on by itself.
     LEADS_API_URL    optional; default the production API
   ================================================================== */

declare const process: { env: Record<string, string | undefined> };

const API_URL = (process.env.LEADS_API_URL || "https://cyphix-api.onrender.com/api/v1/leads").trim();
const FROM = process.env.EMAIL_FROM || "CYPHIX <onboarding@resend.dev>";

/* mirrors the server's LeadSchema limits (CYPHIX_SERVER routes/contact.ts) */
const LIMITS = { nameMin: 2, nameMax: 80, emailMax: 254, organizationMax: 120, messageMax: 1000 } as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* who signs the thank-you; mirrors the Team section (src/components/Team.tsx) */
const SIGNER = { name: "Elio El Hassrouny", role: "Founder & CEO, Cyphix" } as const;
const SITE = "https://cyphix.co";
const WORDMARK_URL = `${SITE}/email/cyphix-wordmark.png`;

interface LeadBody {
  name: string;
  email: string;
  organization?: string;
  message?: string;
}

interface Mail {
  subject: string;
  text: string;
  html: string;
}

interface ServerAnswer {
  /** HTTP status; 0 = unreachable */
  status: number;
  body: string;
}

/** Did the server keep the lead: yes (201), no (5xx / unreachable), pending (still waking). */
type Saved = "yes" | "no" | "pending";

/** How long the visitor may wait for the server before the mail goes out anyway. */
const SERVER_WAIT_MS = 5_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function refuse(status: number, code: string, message: string): Response {
  return json(status, { error: { code, message } });
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function escapeHtml(s: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return s.replace(/[&<>"']/g, (c) => map[c] ?? c);
}

/** One line for the subject: no CR/LF, short. */
function oneLine(s: string, max = 90): string {
  const flat = s.replace(/[\r\n]+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function recipients(): string[] {
  return (process.env.LEADS_NOTIFY_TO || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** The investor's thank-you goes out only from a verified domain (see 4. above). */
export function canThankInvestor(): boolean {
  return !/@resend\.dev\b/i.test(FROM);
}

async function sendResend(
  payload: { to: string[]; reply_to?: string | string[] } & Mail,
): Promise<{ ok: boolean; detail: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, detail: "RESEND_API_KEY is not set" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: FROM, ...payload }),
      signal: AbortSignal.timeout(15_000),
    });
    const detail = await res.text().catch(() => "");
    return { ok: res.ok, detail: `${res.status} ${detail.slice(0, 300)}` };
  } catch (err) {
    return { ok: false, detail: `network: ${(err as Error).message}` };
  }
}

/* ---------------- the founder's copy of the request ---------------- */

export function founderNotice(lead: LeadBody, saved: Saved, now = new Date()): Mail {
  const when = now.toLocaleString("en-GB", { timeZone: "Asia/Jerusalem", dateStyle: "medium", timeStyle: "short" });
  const rows: Array<[string, string]> = [
    ["Name", lead.name],
    ["E-mail", lead.email],
    ["Fund or company", lead.organization || "—"],
    ["Message", lead.message || "—"],
    ["Received", `${when} (Israel)`],
  ];
  const note =
    saved === "yes"
      ? "Saved on the server too (Admin → Leads)."
      : saved === "pending"
        ? "The server was waking up; it saves this request when it is up. This e-mail is the record either way."
        : "The server could not be reached, so this request exists ONLY in this e-mail.";

  const text = [
    "New request from cyphix.co (Request the deck)",
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    note,
    "Reply to this e-mail to answer the sender directly.",
  ].join("\n");

  const cells = rows
    .map(([k, v]) => {
      const value =
        k === "E-mail"
          ? `<a href="mailto:${escapeHtml(v)}" style="color:#0A2540">${escapeHtml(v)}</a>`
          : escapeHtml(v);
      return (
        `<tr><td style="padding:14px 24px 0;font-size:12px;color:#5B687C;text-transform:uppercase;letter-spacing:.04em">${escapeHtml(k)}</td></tr>` +
        `<tr><td style="padding:2px 24px 0;font-size:16px;line-height:1.5;white-space:pre-wrap">${value}</td></tr>`
      );
    })
    .join("");
  const html =
    `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f6f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0D2041">` +
    `<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-collapse:collapse">` +
    `<tr><td style="padding:20px 24px;background:#0D2041;color:#ffffff;font-size:18px;font-weight:600">New request from cyphix.co</td></tr>` +
    cells +
    `<tr><td style="padding:20px 24px;font-size:13px;color:#5B687C">${escapeHtml(note)}<br>Reply to this e-mail to answer the sender directly.</td></tr>` +
    `</table></body></html>`;

  return {
    subject: oneLine(`Deck request — ${lead.name}${lead.organization ? ` (${lead.organization})` : ""}`),
    text,
    html,
  };
}

/* ---------------- the investor's thank-you ---------------- */

/** What an investor receives after "Request the deck": a short personal note from the founder. */
export function investorReply(lead: LeadBody): Mail {
  const first = lead.name.split(/\s+/)[0] || lead.name;
  const paragraphs = [
    "Thank you for your interest in Cyphix. Your request for the deck has reached me.",
    "I will send it to you personally in the next few days, together with a few times for a short call.",
    "If there is something you would like to see first, the prototype, the data or the plan, just reply to this e-mail.",
  ];
  const preheader = "Thank you. I will send you the deck personally in the next few days.";
  const footer = [
    "A wearable 6-lead ECG on the watch you already wear.",
    "You are receiving this because you asked for the Cyphix deck at cyphix.co.",
  ];

  const text = [
    `Hi ${first},`,
    "",
    ...paragraphs.flatMap((p) => [p, ""]),
    "Best regards,",
    "",
    SIGNER.name,
    SIGNER.role,
    "cyphix.co",
    "",
    "--",
    ...footer,
  ].join("\n");

  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const p = (s: string) => `<p style="margin:0 0 18px;">${s}</p>`;
  const html =
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light">` +
    `<title>Your Cyphix deck request</title></head>` +
    `<body style="margin:0;padding:0;background:#f2f5f9;">` +
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f2f5f9;">${escapeHtml(preheader)}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f5f9;"><tr><td align="center" style="padding:32px 16px;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;">` +
    `<tr><td style="padding:40px 40px 0;"><a href="${SITE}" style="text-decoration:none;">` +
    `<img src="${WORDMARK_URL}" width="104" height="22" alt="Cyphix" style="display:block;border:0;outline:none;color:#c7362c;font:600 20px ${font};"></a></td></tr>` +
    `<tr><td style="padding:36px 40px 8px;font-family:${font};font-size:16px;line-height:1.65;color:#0b1a30;">` +
    p(`Hi ${escapeHtml(first)},`) +
    paragraphs.map((s) => p(escapeHtml(s))).join("") +
    p("Best regards,") +
    `</td></tr>` +
    `<tr><td style="padding:0 40px 40px;font-family:${font};">` +
    `<p style="margin:0;font-size:16px;line-height:1.5;font-weight:600;color:#0b1a30;">${escapeHtml(SIGNER.name)}</p>` +
    `<p style="margin:2px 0 0;font-size:14px;line-height:1.5;color:#52627b;">${escapeHtml(SIGNER.role)}</p>` +
    `<p style="margin:2px 0 0;font-size:14px;line-height:1.5;"><a href="${SITE}" style="color:#1d4f8b;text-decoration:none;">cyphix.co</a></p>` +
    `</td></tr></table>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;"><tr>` +
    `<td style="padding:20px 40px 0;font-family:${font};font-size:12px;line-height:1.6;color:#52627b;">` +
    footer.map(escapeHtml).join("<br>") +
    `</td></tr></table>` +
    `</td></tr></table></body></html>`;

  return { subject: "Your Cyphix deck request", text, html };
}

/* ---------------- the door ---------------- */

export async function POST(request: Request): Promise<Response> {
  let raw: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 8_000) return refuse(413, "too_large", "The request is too long.");
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    raw = parsed as Record<string, unknown>;
  } catch {
    return refuse(400, "bad_request", "The request could not be read.");
  }

  /* 1. the same limits as the server */
  const lead: LeadBody = {
    name: str(raw.name),
    email: str(raw.email),
    organization: str(raw.organization) || undefined,
    message: str(raw.message) || undefined,
  };
  if (lead.name.length < LIMITS.nameMin || lead.name.length > LIMITS.nameMax)
    return refuse(400, "validation", "Please add your name.");
  if (lead.email.length > LIMITS.emailMax || !EMAIL_RE.test(lead.email))
    return refuse(400, "validation", "Please add a valid e-mail address.");
  if ((lead.organization?.length ?? 0) > LIMITS.organizationMax)
    return refuse(400, "validation", "The fund or company name is too long.");
  if ((lead.message?.length ?? 0) > LIMITS.messageMax)
    return refuse(400, "validation", "The message is too long.");

  /* 2. the server, as before. The visitor's IP goes along so its per-IP limit still counts
     per visitor (Vercel sets x-real-ip / x-forwarded-for itself; a visitor cannot forge them). */
  const ip =
    request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const ua = request.headers.get("user-agent") || "";
  const serverCall: Promise<ServerAnswer> = fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(ip ? { "x-forwarded-for": ip } : {}),
      ...(ua ? { "user-agent": ua } : {}),
    },
    body: JSON.stringify({
      ...raw,
      name: lead.name,
      email: lead.email,
      organization: lead.organization,
      message: lead.message,
    }),
    /* Render's free instance can take most of a minute to wake */
    signal: AbortSignal.timeout(75_000),
  })
    .then(async (res) => ({ status: res.status, body: await res.text().catch(() => "") }))
    .catch((err: unknown) => {
      console.error("[lead] server unreachable:", (err as Error).message);
      return { status: 0, body: "" };
    });

  /* The visitor never waits for a sleeping server (v0.40.1): Render's free instance sleeps after
     ~15 idle minutes and takes 30–60 s to wake, and the form sat on "Sending…" all that time.
     Awake it answers in under a second. After SERVER_WAIT_MS the mail goes out regardless; the
     request already reached Render, which saves it once the instance is up. */
  const first = await Promise.race([serverCall, sleep(SERVER_WAIT_MS).then(() => null)]);
  const answer = first ?? { status: -1, body: "" };

  /* the server refused the request as such (field, rate limit, CAPTCHA): its answer, no mail */
  if (answer.status >= 400 && answer.status < 500) {
    return new Response(answer.body || JSON.stringify({ error: { code: "refused", message: "" } }), {
      status: answer.status,
      headers: JSON_HEADERS,
    });
  }

  const saved: Saved = answer.status === 201 ? "yes" : answer.status === -1 ? "pending" : "no";
  if (saved === "pending") {
    console.log(`[lead] server still waking after ${SERVER_WAIT_MS} ms; mailing now`);
    void serverCall.then((a) => console.log(`[lead] server answered later: ${a.status}`));
  } else if (saved === "no") {
    console.error(`[lead] server answered ${answer.status || "nothing"}: ${answer.body.slice(0, 300)}`);
  }

  /* 3. the founder's inbox */
  const inbox = recipients();
  const mail =
    inbox.length > 0
      ? await sendResend({ to: inbox, reply_to: lead.email, ...founderNotice(lead, saved) })
      : { ok: false, detail: "LEADS_NOTIFY_TO is not set" };
  if (mail.ok) console.log("[lead] e-mailed");
  else console.error(`[lead] e-mail not sent: ${mail.detail}`);

  /* the mail failed and the server is still waking: wait for it after all, so the visitor
     hears the truth instead of a "received" nobody holds */
  let stored = saved === "yes";
  if (!mail.ok && saved === "pending") {
    const late = await serverCall;
    stored = late.status === 201;
    if (late.status >= 400 && late.status < 500) {
      return new Response(late.body || JSON.stringify({ error: { code: "refused", message: "" } }), {
        status: late.status,
        headers: JSON_HEADERS,
      });
    }
    if (stored) return new Response(late.body, { status: 201, headers: JSON_HEADERS });
  }

  /* 4. the investor's thank-you, from a verified domain only */
  if ((stored || mail.ok) && canThankInvestor()) {
    const thanks = await sendResend({
      to: [lead.email],
      ...(inbox.length > 0 ? { reply_to: inbox } : {}),
      ...investorReply(lead),
    });
    if (thanks.ok) console.log("[lead] investor thanked");
    else console.error(`[lead] thank-you not sent: ${thanks.detail}`);
  }

  if (stored) return new Response(answer.body, { status: 201, headers: JSON_HEADERS });
  if (mail.ok) return json(201, { stored: saved === "pending" ? "pending" : false, mailed: true });
  return refuse(
    502,
    "unavailable",
    "We could not send your request just now. Please try again, or write to us directly.",
  );
}

// v0.40.1 — waits for the server at most SERVER_WAIT_MS (5 s): a sleeping Render instance no longer holds the form on "Sending…"
// v0.40.0 — the investor's thank-you (investorReply, signed by the founder), sent only from a verified EMAIL_FROM
// v0.39.0 — new: the form's door; stores the lead on the server as before AND e-mails the whole request to LEADS_NOTIFY_TO (Reply-To = sender)
