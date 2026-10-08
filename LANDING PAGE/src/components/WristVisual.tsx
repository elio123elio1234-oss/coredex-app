import { motion, useReducedMotion } from "framer-motion";
import EcgReportCard from "./EcgReportCard";
import handImg from "../assets/hand-wrist.png";

/**
 * WristVisual — the hero's centerpiece: wrist band → signal arrow → ECG report.
 * Staged entrance: the hand rises in, the arrow draws across, the report floats
 * in from the right, then the leads print row-by-row.
 */
export default function WristVisual() {
  const reduce = useReducedMotion();

  const container = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.16, delayChildren: 0.15 },
    },
  };
  const fromLeft = {
    hidden: { opacity: 0, x: reduce ? 0 : -20 },
    show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
  };
  const fromRight = {
    hidden: { opacity: 0, x: reduce ? 0 : 20, y: reduce ? 0 : 10 },
    show: { opacity: 1, x: 0, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
  };
  const drawIn = {
    hidden: { opacity: 0, scaleX: reduce ? 1 : 0.6 },
    show: { opacity: 1, scaleX: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <motion.div
      className="showcase"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div className="showcase-hand" variants={fromLeft}>
        <img
          src={handImg}
          alt="A hand wearing the CYPHIX wrist ECG band"
          width={1846}
          height={852}
          loading="eager"
        />
      </motion.div>

      <motion.div
        className="showcase-arrow"
        variants={drawIn}
        style={{ transformOrigin: "left center" }}
      >
        <svg viewBox="0 0 152 18" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="arrowFade" x1="0" y1="0" x2="152" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.12" />
              <stop offset="0.55" stopColor="currentColor" stopOpacity="0.7" />
              <stop offset="1" stopColor="currentColor" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path
            className="flow-line"
            d="M2 9 H128"
            stroke="url(#arrowFade)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M128 2.5 L139 9 L128 15.5"
            stroke="currentColor"
            strokeWidth="2.2"
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </motion.div>

      <motion.div className="report-slot" variants={fromRight}>
        <EcgReportCard startDelay={reduce ? 0 : 1.0} />
      </motion.div>
    </motion.div>
  );
}

// v0.1.0 — hero centerpiece: wrist → arrow → ECG report, staged entrance
