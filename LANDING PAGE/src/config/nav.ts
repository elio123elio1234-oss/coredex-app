/* The site's map, shared by the bar and the footer. The home page's
   sections are reached by their anchors from every page; the three pages
   behind "Explore" are their own documents (technology.html and its
   siblings, served without the extension). */

export type PageKey = "home" | "one-strap" | "technology" | "investors";

export const SECTIONS = [
  { href: "/#solution", label: "Product" },
  { href: "/#stage", label: "Stage" },
  { href: "/#team", label: "Team" },
];

export const EXPLORE: { key: PageKey; href: string; title: string; text: string }[] = [
  { key: "one-strap", href: "/one-strap", title: "One strap. Any watch.", text: "The four ways to wear it, in 3D" },
  { key: "technology", href: "/technology", title: "Technology", text: "How a strap records a 6-lead ECG" },
  { key: "investors", href: "/investors", title: "Investors", text: "The need, the market and the plan" },
];

// v0.35.0 — the site's map: the home page's sections, and the three pages behind "Explore"
