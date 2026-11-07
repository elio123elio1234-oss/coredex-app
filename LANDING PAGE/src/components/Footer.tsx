import Logo from "./Logo";
import { Instagram, LinkedIn, Mail } from "./Icons";
import hands from "../assets/photos/contact-hands.webp";
import { APP_VERSION } from "../config/version";
import { LEGAL } from "../config/nav";

/* The close, AliveCor-style: the wordmark on the left, link columns on the
   right, then a pale band with the small print and the build badge. The whole
   upper area is frosted glass over the user's heart-hands image, on white; the
   text sits straight on it, dark, with the red wordmark as in the bar. On a
   phone the wordmark spans the row, centred, and the e-mail, Instagram and
   LinkedIn stand under it as marks. No tagline (the user), and no phone
   anywhere: the user's own number stays off the web until there is a
   company line. */

const EMAIL = "elio123elio1234@gmail.com";

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
              <p className="foot-marks">
                <a href={`mailto:${EMAIL}`} aria-label="E-mail Cyphix">
                  <Mail width={20} height={20} />
                </a>
                <a href="https://www.instagram.com/cyphix.co/" target="_blank" rel="noopener noreferrer" aria-label="Cyphix on Instagram">
                  <Instagram width={20} height={20} />
                </a>
                <a href="https://www.linkedin.com/company/cyphixmedical/" target="_blank" rel="noopener noreferrer" aria-label="Cyphix on LinkedIn">
                  <LinkedIn width={20} height={20} />
                </a>
              </p>
            </div>
            <nav aria-labelledby="foot-company">
              <h2 id="foot-company">Company</h2>
              <ul>
                <li>
                  <a href="/#solution">Product</a>
                </li>
                <li>
                  <a href="/one-strap">One strap. Any watch.</a>
                </li>
                <li>
                  <a href="/technology">Technology</a>
                </li>
                <li>
                  <a href="/visualizations">Visualizations</a>
                </li>
                <li>
                  <a href="/#stage">Stage</a>
                </li>
                <li>
                  <a href="/#team">Team</a>
                </li>
              </ul>
            </nav>
            <nav aria-labelledby="foot-investors">
              <h2 id="foot-investors">Investors</h2>
              <ul>
                <li>
                  <a href="/investors">The need, the market and the plan</a>
                </li>
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
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="foot-band">
        <div className="wrap foot-band-inner">
          <p className="foot-note">
            © {new Date().getFullYear()} Cyphix. Product images are concept renderings from the
            Cyphix 3D model unless labelled as the working prototype; photographs of people are
            concept imagery unless labelled otherwise. Cyphix is in development and is not
            available for sale. It records and displays ECG data; it does not provide a diagnosis.
          </p>
          <nav className="foot-legal" aria-label="Legal">
            {LEGAL.map((l) => (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ))}
          </nav>
          <span className="badge" title="Build version">
            v{APP_VERSION}
          </span>
        </div>
      </div>
    </footer>
  );
}

// v0.38.24 — no city in the Contact column (the user: not relevant)
// v0.38.23 — the legal links (Privacy, Terms, Accessibility) in the small print's band
// v0.38.18 — no tagline, no phone; the marks are the e-mail, Instagram and LinkedIn; on a phone the wordmark the row's width, centred (the user)
// v0.38.14 — a phone: the phone, Instagram and LinkedIn marks under the tagline (they left the phone's bar; the user)
// v0.37.0 — the version as plain small print (no capsule); Visualizations in the page map
// v0.35.0 — the page map reaches every page: the home page's sections by "/#…", One strap. Any watch., Technology, and the investors' page; the small print allows for the working prototype's photographs
// v0.24.5 — white behind the hands, white glass, dark text (styles in index.css)
// v0.24.4 — trial: the logo's red behind the hands, red glass (styles in index.css)
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
