import { motion } from "framer-motion";
import WristVisual from "./WristVisual";
import ScaleToFit from "./ScaleToFit";

const ease = [0.22, 1, 0.36, 1] as const;

export default function Hero() {
  return (
    <section className="hero" id="top">
      {/* The whole hero — headline + images — scales as one block to fit the
          screen (width and height), then stacks responsively on small screens. */}
      <ScaleToFit>
        <div className="hero-inner">
          <motion.span
            className="eyebrow"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
          >
            <span className="dot" />
            AI-ECG · concept
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.06 }}
          >
            From your wrist to a{" "}
            <span className="grad-text">6-lead ECG report</span>
          </motion.h1>

          <motion.p
            className="hero-sub"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.14 }}
          >
            Advanced signal technology transforms a single wrist measurement into
            a complete 6-lead ECG report in seconds.
          </motion.p>

          <motion.div
            className="hero-actions"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.22 }}
          >
            <a className="btn btn-primary" href="#contact">
              Request access
              <svg className="btn-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h9M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a className="btn btn-ghost" href="#how">
              See how it works
            </a>
          </motion.div>

          <WristVisual />

          <motion.p
            className="disclaimer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.9 }}
          >
            Concept visualization. The wristband shown is a design render for
            demonstration purposes only and is not yet a physical product.
          </motion.p>
        </div>
      </ScaleToFit>
    </section>
  );
}

// v0.3.0 — hero scales as one block (headline + images) to fit the screen
