import Logo from "./Logo";
import { APP_VERSION, APP_BUILD_LABEL } from "../config/version";

export default function Footer() {
  return (
    <footer className="footer" id="footer">
      <div className="container footer-inner">
        <a className="brand" href="#top" aria-label="CYPHIX home">
          <Logo className="brand-logo" />
        </a>

        <div className="footer-meta">
          © {new Date().getFullYear()} CYPHIX · Concept preview
        </div>

        <span className="footer-badge" title={APP_BUILD_LABEL}>
          v{APP_VERSION}
        </span>
      </div>
    </footer>
  );
}

// v0.4.0 — #contact moved to the form; the footer is #footer
// v0.1.0 — footer with brand, copyright, visible version badge
