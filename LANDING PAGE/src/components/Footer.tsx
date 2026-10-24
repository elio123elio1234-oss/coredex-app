import Logo from "./Logo";
import hands from "../assets/photos/contact-hands.webp";
import { APP_VERSION } from "../config/version";

/* The close, AliveCor-style: the wordmark on the left, link columns on the
   right, then a pale band with the small print and the build badge. The whole
   upper area is frosted glass over the user's heart-hands image, on the hero's
   grey (slate); the text sits straight on it, in white. */

const EMAIL = "elio123elio1234@gmail.com";
const PHONE = "+972 54-398-9698";

export default function Footer() {
  return (
    <footer className="foot" id="footer">
      <div className="foot-upper">
        <div className="foot-stage" aria-hidden="true">
          <img src={hands} alt="" width={1600} height={800} loading="lazy" decoding="async" />
        </div>
        <div className="wrap foot-glass-wrap">
          <div className="foot-top">
            <div>
              <a className="foot-brand" href="#top" aria-label="Cyphix, back to top">
                <Logo className="foot-logo" />
              </a>
              <p className="foot-tagline">Clinical Depth. Wearable Ease.</p>
            </div>
            <nav aria-labelledby="foot-company">
              <h2 id="foot-company">Company</h2>
              <ul>
                <li>
                  <a href="#solution">Product</a>
                </li>
                <li>
                  <a href="#stage">Stage</a>
                </li>
                <li>
                  <a href="#team">Team</a>
                </li>
              </ul>
            </nav>
            <nav aria-labelledby="foot-investors">
              <h2 id="foot-investors">Investors</h2>
              <ul>
                <li>
                  <a href="#contact">Request the deck</a>
                </li>
              </ul>
            </nav>
            <div>
              <h2>Contact</h2>
              <ul>
                <li>
                  <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
                </li>
                <li>
                  <a href={`tel:${PHONE.replace(/[^+\d]/g, "")}`}>{PHONE}</a>
                </li>
                <li>Kiryat Ono, Israel</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="foot-band">
        <div className="wrap foot-band-inner">
          <p className="foot-note">
            © {new Date().getFullYear()} Cyphix. Product images are concept renderings from the
            Cyphix 3D model; photographs of people, where shown, are concept imagery. Cyphix is in
            development and is not available for sale. It records and displays ECG data; it does
            not provide a diagnosis.
          </p>
          <span className="badge" title="Build version">
            v{APP_VERSION}
          </span>
        </div>
      </div>
    </footer>
  );
}

// v0.24.3 — the hero's grey behind the hands, grey glass (styles in index.css)
// v0.24.1 — the dark navy (the facts band's), not the announcement bar's lighter blue
// v0.24.0 — the page's blue behind the hands, blue glass, white text (styles in index.css)
// v0.23.1 — no card: the whole upper area is the glass (styles in index.css)
// v0.23.0 — the columns on one frosted-glass rectangle over the heart-hands image (moved here from Request the deck)
// v0.15.0 — the "How it works" link goes with its section
// v0.14.0 — the "Market" and "Why Cyphix" links go with their sections
// v0.13.0 — the "Sensors" link goes with the section
// v0.10.0 — the page map lists the sensors
// v0.9.0 — AliveCor-style footer: wordmark, Company / Investors / Contact columns, pale legal band with the badge
// v0.8.0 — small print names the 3D model (the coral-electrode line was the retired renders' truth)
// v0.7.0 — a company footer: brand and tagline, page map, contact, small print, build badge
// v0.1.0 — brand + version badge
