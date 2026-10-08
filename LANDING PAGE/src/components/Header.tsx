import { useEffect, useState } from "react";
import Logo from "./Logo";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`header${scrolled ? " scrolled" : ""}`}>
      <div className="container header-inner">
        <a className="brand" href="#top" aria-label="CYPHIX home">
          <Logo className="brand-logo" />
        </a>

        <nav className="nav" aria-label="Primary">
          <a href="#how">How it works</a>
          <a href="#technology">Technology</a>
          <a href="#vision">Vision</a>
        </nav>

        <a className="btn btn-ghost header-cta" href="#contact">
          Request access
        </a>
      </div>
    </header>
  );
}

// v0.1.0 — fixed header with scroll-aware theme + brand wordmark
