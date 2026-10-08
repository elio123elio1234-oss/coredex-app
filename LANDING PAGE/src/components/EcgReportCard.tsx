import { motion } from "framer-motion";

/**
 * EcgReportCard — faithful recreation of the reference "6-LEAD ECG REPORT"
 * card. Lead waveforms print in row-by-row with a left-to-right wipe.
 */

const LEADS: { name: string; d: string }[] = [
  { name: "I", d: "M0 26 h6 q4 -4 8 0 h6 l3 3 l3 -17 l3 18 l3 -4 h4 q6 -6 12 0 h4" },
  { name: "II", d: "M0 26 h6 q4 -5 8 0 h6 l3 3 l3 -23 l3 25 l3 -5 h4 q6 -8 12 0 h4" },
  { name: "III", d: "M0 26 h6 q4 -3 8 0 h6 l3 2 l3 -14 l3 15 l3 -3 h4 q6 -5 12 0 h4" },
  { name: "aVR", d: "M0 26 h6 q4 4 8 0 h6 l3 -2 l3 10 l3 -8 h7 q6 5 12 0 h4" },
  { name: "aVL", d: "M0 26 h6 q4 -2 8 0 h6 l3 2 l3 -9 l3 9 l3 -2 h4 q6 -3 12 0 h4" },
  { name: "aVF", d: "M0 26 h6 q4 -3 8 0 h6 l3 2 l3 -15 l3 17 l3 -4 h4 q6 -5 12 0 h4" },
];

const XS = [0, 52, 104, 156, 208, 260, 312, 364];

export default function EcgReportCard({ startDelay = 0.7 }: { startDelay?: number }) {
  return (
    <div className="report">
      {/* shared lead definitions */}
      <svg width="0" height="0" style={{ position: "absolute", opacity: 0 }} aria-hidden="true">
        <defs>
          {LEADS.map((l) => (
            <path key={l.name} id={`lead-${l.name}`} className="lead-path" d={l.d} />
          ))}
        </defs>
      </svg>

      <div className="report-title">6-LEAD ECG REPORT</div>

      <div className="report-meta">
        <div>
          <div className="k">Patient ID</div>
          <div className="v">123456</div>
        </div>
        <div>
          <div className="k">Date</div>
          <div className="v">May 18, 2025</div>
        </div>
        <div>
          <div className="k">Time</div>
          <div className="v">10:42 AM</div>
        </div>
        <div>
          <div className="k">Heart Rate</div>
          <div className="v">72 bpm</div>
        </div>
        <svg
          className="heart"
          width="26"
          height="24"
          viewBox="0 0 24 22"
          fill="none"
          style={{ alignSelf: "center" }}
          aria-hidden="true"
        >
          <path
            d="M12 20.5C12 20.5 1.5 14 1.5 7.2A5.2 5.2 0 0 1 12 4.6A5.2 5.2 0 0 1 22.5 7.2C22.5 14 12 20.5 12 20.5Z"
            stroke="#111"
            strokeWidth="1.4"
            fill="none"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="report-hr" />

      <div className="leads">
        <div className="leads-labels">
          {LEADS.map((l) => (
            <span key={l.name}>{l.name}</span>
          ))}
        </div>
        <div className="leads-grid">
          {LEADS.map((l, i) => (
            <div className="row" key={l.name}>
              <motion.svg
                viewBox="0 0 416 40"
                preserveAspectRatio="none"
                aria-hidden="true"
                initial={{ clipPath: "inset(0 100% 0 0)" }}
                animate={{ clipPath: "inset(0 0% 0 0)" }}
                transition={{
                  duration: 0.9,
                  ease: [0.4, 0, 0.2, 1],
                  delay: startDelay + i * 0.12,
                }}
              >
                {XS.map((x) => (
                  <use key={x} href={`#lead-${l.name}`} x={x} />
                ))}
              </motion.svg>
            </div>
          ))}
        </div>
      </div>

      <div className="conclusion">
        <div>
          <div className="c-title">Conclusion</div>
          <div className="c-main">Normal sinus rhythm</div>
          <div className="c-sub">No significant abnormalities detected.</div>
        </div>
        <div className="c-badge">
          <span>AI-ECG Analysis</span>
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
            <circle cx="13" cy="13" r="11" stroke="#0f8f92" strokeWidth="1.6" />
            <path
              d="M8 13.4 L11.5 16.7 L18 9.6"
              stroke="#0f8f92"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

// v0.1.0 — 6-lead ECG report card (recreated from reference, animated print-in)
