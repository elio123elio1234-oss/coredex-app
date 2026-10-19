import Logo from "./Logo";
import { APP_VERSION } from "../config/version";

/* The close: wordmark, the honest small print, the build badge. */

export default function Footer() {
  return (
    <footer className="foot" id="footer">
      <div className="wrap foot-inner">
        <a className="foot-brand" href="#top" aria-label="Cyphix — back to top">
          <Logo className="foot-logo" />
        </a>
        <p className="foot-note">
          Product images are concept renderings; electrodes are shown in coral. Cyphix is in
          development and is not available for sale. Traces on this page are illustrative and
          synthetic, not patient data.
        </p>
        <div className="foot-meta">
          <span>© {new Date().getFullYear()} Cyphix · Kiryat Ono, Israel</span>
          <span className="badge" title="Build version">
            v{APP_VERSION}
          </span>
        </div>
      </div>
    </footer>
  );
}

// v0.6.0 — wordmark, concept / in-development / illustrative-signal small print, version badge
// v0.1.0 — brand + version badge
