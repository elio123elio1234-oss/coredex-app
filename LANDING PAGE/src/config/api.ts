// Where the "Request the deck" form talks to.
// The CAPTCHA policy comes straight from the CYPHIX server (production API by default;
// `VITE_API_BASE_URL` overrides it for local work).
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ||
  "https://cyphix-api.onrender.com";

// The lead goes to this site's own function (`api/lead.ts`), which stores it on the server
// as before AND e-mails the whole request to the founder. `vite dev` has no functions, so
// `VITE_LEADS_URL` can point local work at the server's route directly.
export const LEADS_URL =
  (import.meta.env.VITE_LEADS_URL as string | undefined) || "/api/lead";
export const CAPTCHA_POLICY_URL = `${API_BASE_URL}/api/v1/auth/captcha`;

// v0.39.0 — the lead posts to the site's own /api/lead (server + the founder's e-mail)
// v0.1.0 — the API base + the two routes the form needs (leads, the CAPTCHA policy)
