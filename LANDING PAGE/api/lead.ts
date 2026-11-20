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
   3. If the server took it (201), or the server could not be reached
      (5xx / network), e-mails the whole request to LEADS_NOTIFY_TO via
      Resend, Reply-To = the sender, so "Reply" answers them directly.
      A 4xx from the server (bad field, too many requests, CAPTCHA) is
      handed back untouched and nothing is mailed.

   Env (Vercel → cyphix-landing → Settings → Environment Variables):
     RESEND_API_KEY   required for the e-mail; without it the lead is
                      only stored on the server (the old behaviour)
     LEADS_NOTIFY_TO  required for the e-mail; the inbox, comma-separated
                      for several. With Resend's test sender it must be
                      the address the Resend account was opened with.
     EMAIL_FROM       optional; default "CYPHIX <onboarding@resend.dev>"
                      (Resend's test sender, until cyphix.co is verified)
     LEADS_API_URL    optional; default the production API
   ================================================================== */

declare const process: { env: Record<string, string | undefined> };

const API_URL = (process.env.LEADS_API_URL || "https://cyphix-api.onrender.com/api/v1/leads").trim();
const FROM = process.env.EMAIL_FROM || "CYPHIX <onboarding@resend.dev>";

/* mirrors the server's LeadSchema limits (CYPHIX_SERVER routes/contact.ts) */
const LIMITS = { nameMin: 2, nameMax: 80, emailMax: 254, organizationMax: 120, messageMax: 1000 } as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface LeadBody {
  name: string;
  email: string;
  organization?: string;
  message?: string;
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

async function mailFounder(lead: LeadBody, stored: boolean): Promise<{ ok: boolean; detail: string }> {
  const key = process.env.RESEND_API_KEY;
  const to = recipients();
  if (!key) return { ok: false, detail: "RESEND_API_KEY is not set" };
  if (to.length === 0) return { ok: false, detail: "LEADS_NOTIFY_TO is not set" };

  const when = new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Jerusalem",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const rows: Array<[string, string]> = [
    ["Name", lead.name],
    ["E-mail", lead.email],
    ["Fund or company", lead.organization || "—"],
    ["Message", lead.message || "—"],
    ["Received", `${when} (Israel)`],
  ];
  const note = stored
    ? "Saved on the server too (Admin → Leads)."
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

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to,
        reply_to: lead.email,
        subject: oneLine(`Deck request — ${lead.name}${lead.organization ? ` (${lead.organization})` : ""}`),
        text,
        html,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const detail = await res.text().catch(() => "");
    return { ok: res.ok, detail: `${res.status} ${detail.slice(0, 300)}` };
  } catch (err) {
    return { ok: false, detail: `network: ${(err as Error).message}` };
  }
}

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
  let serverStatus = 0;
  let serverBody = "";
  try {
    const res = await fetch(API_URL, {
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
    });
    serverStatus = res.status;
    serverBody = await res.text().catch(() => "");
  } catch (err) {
    console.error("[lead] server unreachable:", (err as Error).message);
  }

  /* the server refused the request as such (field, rate limit, CAPTCHA): its answer, no mail */
  if (serverStatus >= 400 && serverStatus < 500) {
    return new Response(serverBody || JSON.stringify({ error: { code: "refused", message: "" } }), {
      status: serverStatus,
      headers: JSON_HEADERS,
    });
  }

  const stored = serverStatus === 201;
  if (!stored) console.error(`[lead] server answered ${serverStatus || "nothing"}: ${serverBody.slice(0, 300)}`);

  /* 3. the founder's inbox */
  const mail = await mailFounder(lead, stored);
  if (mail.ok) console.log("[lead] e-mailed");
  else console.error(`[lead] e-mail not sent: ${mail.detail}`);

  if (stored) return new Response(serverBody, { status: 201, headers: JSON_HEADERS });
  if (mail.ok) return json(201, { stored: false, mailed: true });
  return refuse(
    502,
    "unavailable",
    "We could not send your request just now. Please try again, or write to us directly.",
  );
}

// v0.39.0 — new: the form's door; stores the lead on the server as before AND e-mails the whole request to LEADS_NOTIFY_TO (Reply-To = sender)
