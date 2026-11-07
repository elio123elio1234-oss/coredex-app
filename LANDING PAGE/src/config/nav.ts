/* The site's map, shared by the bar and the footer. The home page's
   sections are reached by their anchors from every page; the three pages
   behind "Explore" are their own documents (technology.html and its
   siblings, served without the extension). */

export type PageKey =
  | "home"
  | "one-strap"
  | "technology"
  | "investors"
  | "visualizations"
  | "privacy"
  | "terms"
  | "accessibility";

/* the legal pages, linked from every page's footer */
export const LEGAL = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/accessibility", label: "Accessibility" },
];

export const SECTIONS = [
  { href: "/#solution", label: "Product" },
  { href: "/#stage", label: "Stage" },
  { href: "/#team", label: "Team" },
];

export const EXPLORE: { key: PageKey; href: string; title: string; text: string }[] = [
  /* first, for the visitors the site is for (the user) */
  { key: "investors", href: "/investors", title: "For investors", text: "The need, the market and the plan" },
  { key: "one-strap", href: "/one-strap", title: "One strap. Any watch.", text: "The four ways to wear it, in 3D" },
  { key: "technology", href: "/technology", title: "Technology", text: "How a strap records a 6-lead ECG" },
  { key: "visualizations", href: "/visualizations", title: "Visualizations", text: "The four ways to wear it, side by side" },
];

// v0.38.27 — "For investors" first in Explore, then the rest (the user)
// v0.38.23 — the legal pages (privacy, terms, accessibility)
// v0.37.3 — the Visualizations line without "concept imagery"
// v0.37.0 — "Visualizations", the four watches off the home page
// v0.35.0 — the site's map: the home page's sections, and the three pages behind "Explore"
