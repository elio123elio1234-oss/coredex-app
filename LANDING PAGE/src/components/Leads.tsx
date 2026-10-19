import { useRef } from "react";
import { motion, useInView, useScroll, useTransform, useReducedMotion } from "framer-motion";
import Reveal from "./Reveal";
import appLimbLeads from "../assets/img/app-limb-leads.webp";

/* The six leads, and what the device leaves out. The phone is the real
   Cyphix app's limb-lead view; it drifts a little against the scroll.
   The three things a patient no longer needs stand beside it and are
   struck through in coral, one after another, as they come into view. */

const LEFT_OUT = ["Adhesive patches", "Wires", "Professional setup"];

export default function Leads() {
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const struck = useInView(listRef, { once: true, margin: "0px 0px -18% 0px" });
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const drift = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [56, -56]);

  return (
    <section ref={sectionRef} className="section leads" id="device">
      <div className="wrap">
        <div className="section-head">
          <Reveal as="div">
            <h2 className="display">Six leads. Recorded when it happens.</h2>
          </Reveal>
          <Reveal as="div" delay={0.08}>
            <p className="body-lg">
              Leads I, II, III, aVR, aVL and aVF, the limb-lead view a clinician reads, captured
              from the wrist when symptoms occur and transmitted directly to the clinician.
            </p>
          </Reveal>
        </div>

        <div className="leads-grid">
          <div className="leads-out">
            <ul ref={listRef} className={`left-out${struck ? " is-on" : ""}`}>
              {LEFT_OUT.map((t, i) => (
                <li key={t} style={{ transitionDelay: `${0.25 + i * 0.24}s` }}>
                  <span className="left-out-word">{t}</span>
                </li>
              ))}
            </ul>
            <p className="left-out-note">None of them needed.</p>
          </div>

          <motion.figure className="leads-phone" style={{ y: drift }}>
            <img
              src={appLimbLeads}
              alt="The Cyphix app's limb-lead view: leads I, II, III, aVR, aVL and aVF at 72 BPM"
              width={876}
              height={463}
              loading="lazy"
              decoding="async"
            />
            <figcaption className="caption">The Cyphix app · limb-lead view</figcaption>
          </motion.figure>
        </div>
      </div>
    </section>
  );
}

// v0.6.0 — the six limb leads, the app's limb-lead screen, and patches · wires · setup struck through
