import { useEffect, useState } from "react";
import Logo from "./Logo";
import { Chevron, Instagram, LinkedIn, Phone } from "./Icons";
import { EXPLORE, SECTIONS, type PageKey } from "../config/nav";
import { usePopover } from "../lib/usePopover";

/* The top of every page, AliveCor-style: a navy announcement bar that
   scrolls away, then a white sticky bar: the wordmark, the home page's
   section links and "Explore", a menu of the pages kept off the home page
   (the 3D journey, the technology, the investors' page), and at the right
   end the phone, Instagram and LinkedIn as three marks. The number itself
   is not on show: a click on the phone opens it under the mark. Over a dark
   stage the bar turns dark too. */

const PHONE = "+972 54-398-9698";
const SOCIAL = [
  { href: "https://www.instagram.com/cyphix.co/", label: "Cyphix on Instagram", Icon: Instagram },
  { href: "https://www.linkedin.com/company/cyphixmedical/", label: "Cyphix on LinkedIn", Icon: LinkedIn },
];

export default function Header({ page = "home" }: { page?: PageKey }) {
  const [dark, setDark] = useState(false);
  const call = usePopover();
  const explore = usePopover();
  const inside = EXPLORE.some((e) => e.key === page);

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
          <a
            className="bar-brand"
            href={page === "home" ? "#top" : "/"}
            aria-label={page === "home" ? "Cyphix, back to top" : "Cyphix, home"}
          >
            <Logo className="bar-logo" />
          </a>
          <nav className="bar-nav" aria-label="Site">
            {SECTIONS.map((l) => (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ))}
            <div className="bar-explore" ref={explore.ref}>
              <button
                ref={explore.button}
                type="button"
                className={`bar-explore-btn${inside ? " is-current" : ""}`}
                aria-expanded={explore.open}
                aria-controls="bar-explore-menu"
                onClick={() => explore.setOpen((o) => !o)}
              >
                Explore
                <Chevron width={15} height={15} />
              </button>
              <div id="bar-explore-menu" className={`bar-menu${explore.open ? " is-open" : ""}`}>
                <ul>
                  {EXPLORE.map((e) => (
                    <li key={e.key}>
                      <a href={e.href} aria-current={e.key === page ? "page" : undefined}>
                        <span className="bar-menu-title">{e.title}</span>
                        <span className="bar-menu-text">{e.text}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </nav>
          <div className="bar-end">
            <div className="bar-call" ref={call.ref}>
              <button
                ref={call.button}
                type="button"
                className="bar-social"
                aria-label={call.open ? "Hide our phone number" : "Show our phone number"}
                aria-expanded={call.open}
                aria-controls="bar-call-number"
                onClick={() => call.setOpen((o) => !o)}
              >
                <Phone width={19} height={19} />
              </button>
              <div id="bar-call-number" className={`bar-pop${call.open ? " is-open" : ""}`}>
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

// v0.35.0 — "Explore": a menu of the pages kept off the home page (the 3D journey, Technology, Investors); the section links reach the home page from every page; the open/close rule shared (lib/usePopover)
// v0.34.0 — the number is no longer on show: the phone is a mark beside Instagram and LinkedIn, and a click opens the number under it (the user)
// v0.28.0 — Instagram and LinkedIn beside the phone (they stay when the phone number hides)
// v0.20.0 — the bar's "Request the deck" button removed (the user: three times was too many; the announcement and the hero keep it)
// v0.17.1 — the announcement names the stage, not the amount (the user)
// v0.15.0 — "How it works" leaves the nav with its section
// v0.9.0 — AliveCor-style: navy announcement bar, white sticky bar with links, phone and a solid uppercase button
// v0.8.0 — turns dark over the closing scene's stage
// v0.7.0 — Product · Stage · Market · Team; no scroll-progress line; the bar's wrap matches the page's
// v0.1.0 — scroll-aware fixed header
