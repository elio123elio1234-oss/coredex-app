import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import Logo from "./Logo";
import { ArrowRight } from "./Icons";

/* The bar: red wordmark, four anchors, the deck. It sits on the page's
   own ground over the hero and gains a hairline once the page moves;
   a coral hairline along its foot tracks how far down the page you are. */

const LINKS = [
  { href: "#device", label: "Device" },
  { href: "#stage", label: "Stage" },
  { href: "#market", label: "Market" },
  { href: "#team", label: "Team" },
];

export default function Header() {
  const [moved, setMoved] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 220, damping: 40, restDelta: 0.001 });

  useEffect(() => {
    const onScroll = () => setMoved(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`bar${moved ? " is-moved" : ""}`}>
      <div className="bar-inner">
        <a className="bar-brand" href="#top" aria-label="Cyphix — back to top">
          <Logo className="bar-logo" />
        </a>
        <nav className="bar-nav" aria-label="Sections">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <a className="btn btn-ink btn-sm" href="#contact">
          <span className="bar-cta-long">Request the deck</span>
          <span className="bar-cta-short">The deck</span>
          <ArrowRight width={16} height={16} />
        </a>
      </div>
      <motion.span className="bar-progress" style={{ scaleX: progress }} aria-hidden="true" />
    </header>
  );
}

// v0.6.0 — red wordmark, Device · Stage · Market · Team anchors, the deck pill, a coral scroll hairline
// v0.1.0 — scroll-aware fixed header
