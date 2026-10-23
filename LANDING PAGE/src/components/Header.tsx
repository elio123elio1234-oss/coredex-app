import { useEffect, useState } from "react";
import Logo from "./Logo";
import { ArrowRight } from "./Icons";

/* The bar: red wordmark, four anchors, the deck. Transparent over the
   hero; once the page moves it takes the ground, blurred, over a hairline. */

const LINKS = [
  { href: "#product", label: "Product" },
  { href: "#stage", label: "Stage" },
  { href: "#market", label: "Market" },
  { href: "#team", label: "Team" },
];

export default function Header() {
  const [moved, setMoved] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setMoved(window.scrollY > 8);
      // over a dark stage (the closing scene) the bar turns dark too
      const line = 36;
      setDark(
        Array.from(document.querySelectorAll("[data-bar-dark]")).some((el) => {
          const r = el.getBoundingClientRect();
          return r.top <= line && r.bottom >= line;
        }),
      );
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`bar${moved ? " is-moved" : ""}${dark ? " is-dark" : ""}`}>
      <div className="wrap bar-inner">
        <a className="bar-brand" href="#top" aria-label="Cyphix, back to top">
          <Logo className="bar-logo" />
        </a>
        <nav className="bar-nav" aria-label="Sections">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <a className="btn btn-ink btn-sm bar-cta" href="#contact">
          Request the deck
          <ArrowRight width={16} height={16} />
        </a>
      </div>
    </header>
  );
}

// v0.8.0 — turns dark over the closing scene's stage
// v0.7.0 — Product · Stage · Market · Team; no scroll-progress line; the bar's wrap matches the page's
// v0.6.0 — red wordmark, Device · Stage · Market · Team anchors, the deck pill, a coral scroll hairline
// v0.1.0 — scroll-aware fixed header
