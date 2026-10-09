// Where the "Request access" form posts (CYPHIX_SERVER v0.23.0, `POST /api/v1/leads`).
// The production API by default; `VITE_API_BASE_URL` overrides it for local work.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ||
  "https://cyphix-api.onrender.com";

export const LEADS_URL = `${API_BASE_URL}/api/v1/leads`;
export const CAPTCHA_POLICY_URL = `${API_BASE_URL}/api/v1/auth/captcha`;

// v0.1.0 — the API base + the two routes the form needs (leads, the CAPTCHA policy)
