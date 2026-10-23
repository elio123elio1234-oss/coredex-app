import { LineShield, LineWatch } from "./Icons";

/* The navy facts band under the hero. Every figure is one the one-pager
   already states; nothing here is a user count or a clinical result. */

export default function Facts() {
  return (
    <section className="facts" aria-label="Cyphix at a glance">
      <div className="wrap facts-grid">
        <div className="fact">
          <LineWatch className="fact-icon" />
          <p>6-lead ECG on the watch you already wear</p>
        </div>
        <div className="fact">
          <span className="fact-figure">$4.53B</span>
          <p>Global mobile ECG market</p>
        </div>
        <div className="fact">
          <LineShield className="fact-icon" />
          <p>Patent pending · Israel Innovation Authority, Tnufa</p>
        </div>
      </div>
    </section>
  );
}

// v0.9.0 — the AliveCor-style facts band: watch, market, patent and programme
