import Logo from "./Logo";
import { APP_VERSION } from "../config/version";

/* The close: wordmark and tagline, the page's map, how to reach us, then
   the honest small print and the build badge. */

const EMAIL = "elio123elio1234@gmail.com";
const PHONE = "+972 54-398-9698";

export default function Footer() {
  return (
    <footer className="foot" id="footer">
      <div className="wrap">
        <div className="foot-top">
          <div>
            <a className="foot-brand" href="#top" aria-label="Cyphix, back to top">
              <Logo className="foot-logo" />
            </a>
            <p className="foot-tagline">Clinical Depth. Wearable Ease.</p>
          </div>
          <nav aria-labelledby="foot-nav">
            <h2 id="foot-nav">Explore</h2>
            <ul>
              <li>
                <a href="#product">Product</a>
              </li>
              <li>
                <a href="#stage">Stage</a>
              </li>
              <li>
                <a href="#market">Market</a>
              </li>
              <li>
                <a href="#team">Team</a>
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
        <div className="foot-bottom">
          <p className="foot-note">
            Product images are concept renderings; electrodes are shown in coral. Cyphix is in
            development and is not available for sale.
          </p>
          <div className="foot-meta">
            <span>© {new Date().getFullYear()} Cyphix</span>
            <span className="badge" title="Build version">
              v{APP_VERSION}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// v0.7.0 — a company footer: brand and tagline, page map, contact, small print, build badge
// v0.6.0 — wordmark, concept / in-development / illustrative-signal small print, version badge
// v0.1.0 — brand + version badge
