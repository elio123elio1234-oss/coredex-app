import { useEffect, useState } from "react";
import Logo from "./Logo";
import { Instagram, LinkedIn, Phone } from "./Icons";

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
const SOCIAL = [
  { href: "https://www.instagram.com/cyphix.co/", label: "Cyphix on Instagram", Icon: Instagram },
  { href: "https://www.linkedin.com/company/cyphixmedical/", label: "Cyphix on LinkedIn", Icon: LinkedIn },
];

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
        Now raising our seed round <span aria-hidden="true">|</span>{" "}
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
          <div className="bar-end">
            <a className="bar-phone" href={`tel:${PHONE.replace(/[^+\d]/g, "")}`}>
              <Phone width={17} height={17} />
              {PHONE}
            </a>
            {SOCIAL.map(({ href, label, Icon }) => (
              <a key={href} className="bar-social" href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                <Icon width={20} height={20} />
              </a>
            ))}
          </div>
        </div>
      </header>
    </>
  );
}

// v0.28.0 — Instagram and LinkedIn beside the phone (they stay when the phone number hides)
// v0.20.0 — the bar's "Request the deck" button removed (the user: three times was too many; the announcement and the hero keep it)
// v0.17.1 — the announcement names the stage, not the amount (the user)
// v0.15.0 — "How it works" leaves the nav with its section
// v0.9.0 — AliveCor-style: navy announcement bar, white sticky bar with links, phone and a solid uppercase button
// v0.8.0 — turns dark over the closing scene's stage
// v0.7.0 — Product · Stage · Market · Team; no scroll-progress line; the bar's wrap matches the page's
// v0.1.0 — scroll-aware fixed header
