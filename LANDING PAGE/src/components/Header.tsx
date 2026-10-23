import { useEffect, useState } from "react";
import Logo from "./Logo";
import { ArrowRight, Phone } from "./Icons";

/* The top of the page, AliveCor-style: a navy announcement bar that scrolls
   away, then a white sticky bar — wordmark, section links, the direct line
   and a solid "Request the deck" button. Over the dark closing stage the bar
   turns dark too. */

const LINKS = [
  { href: "#solution", label: "Product" },
  { href: "#stage", label: "Stage" },
  { href: "#team", label: "Team" },
];

const PHONE = "+972 54-398-9698";

export default function Header() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const onScroll = () => {
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
    <>
      <p className="announce">
        Now raising a $1.9M seed round <span aria-hidden="true">|</span>{" "}
        <a href="#contact">Request the deck</a>
      </p>
      <header className={`bar${dark ? " is-dark" : ""}`}>
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
          <a className="bar-phone" href={`tel:${PHONE.replace(/[^+\d]/g, "")}`}>
            <Phone width={17} height={17} />
            {PHONE}
          </a>
          <a className="btn btn-solid btn-sm bar-cta" href="#contact">
            Request the deck
            <ArrowRight width={15} height={15} />
          </a>
        </div>
      </header>
    </>
  );
}

// v0.15.0 — "How it works" leaves the nav with its section
// v0.9.0 — AliveCor-style: navy announcement bar, white sticky bar with links, phone and a solid uppercase button
// v0.8.0 — turns dark over the closing scene's stage
// v0.7.0 — Product · Stage · Market · Team; no scroll-progress line; the bar's wrap matches the page's
// v0.1.0 — scroll-aware fixed header
