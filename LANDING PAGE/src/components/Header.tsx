import { useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import { Instagram, LinkedIn, Phone } from "./Icons";

/* The top of the page, AliveCor-style: a navy announcement bar that scrolls
   away, then a white sticky bar: the wordmark, section links, and at the
   right end the phone, Instagram and LinkedIn as three marks. The number
   itself is not on show: a click on the phone opens it under the mark.
   Over the dark closing stage the bar turns dark too. */

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
  const [callOpen, setCallOpen] = useState(false);
  const callRef = useRef<HTMLDivElement>(null);
  const callButton = useRef<HTMLButtonElement>(null);

  // the number closes again on a click elsewhere, or Escape
  useEffect(() => {
    if (!callOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!callRef.current?.contains(e.target as Node)) setCallOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setCallOpen(false);
      callButton.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [callOpen]);

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
            <div className="bar-call" ref={callRef}>
              <button
                ref={callButton}
                type="button"
                className="bar-social"
                aria-label={callOpen ? "Hide our phone number" : "Show our phone number"}
                aria-expanded={callOpen}
                aria-controls="bar-call-number"
                onClick={() => setCallOpen((o) => !o)}
              >
                <Phone width={19} height={19} />
              </button>
              <div id="bar-call-number" className={`bar-pop${callOpen ? " is-open" : ""}`}>
                <a href={`tel:${PHONE.replace(/[^+\d]/g, "")}`}>{PHONE}</a>
              </div>
            </div>
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

// v0.34.0 — the number is no longer on show: the phone is a mark beside Instagram and LinkedIn, and a click opens the number under it (the user)
// v0.28.0 — Instagram and LinkedIn beside the phone (they stay when the phone number hides)
// v0.20.0 — the bar's "Request the deck" button removed (the user: three times was too many; the announcement and the hero keep it)
// v0.17.1 — the announcement names the stage, not the amount (the user)
// v0.15.0 — "How it works" leaves the nav with its section
// v0.9.0 — AliveCor-style: navy announcement bar, white sticky bar with links, phone and a solid uppercase button
// v0.8.0 — turns dark over the closing scene's stage
// v0.7.0 — Product · Stage · Market · Team; no scroll-progress line; the bar's wrap matches the page's
// v0.1.0 — scroll-aware fixed header
