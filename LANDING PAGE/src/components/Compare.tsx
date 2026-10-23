import Logo from "./Logo";
import { Check, Dash } from "./Icons";

/* Why Cyphix: the trade-off as a table an investor can read in five
   seconds, on the light band. Every cell restates the one-pager:
   smartwatches give wearable ease with a single lead; Holter and clinic
   ECG give multi-lead depth with electrodes, wires and setup; Cyphix gives
   both. */

type Mark = "yes" | "no";
type Row = { feature: string; watch: Mark | string; clinic: Mark | string; us: Mark | string };

const ROWS: Row[] = [
  { feature: "Multi-lead ECG", watch: "Single lead", clinic: "yes", us: "6 limb leads" },
  { feature: "No adhesive patches, wires or professional setup", watch: "yes", clinic: "no", us: "yes" },
  { feature: "On the watch people already wear", watch: "yes", clinic: "no", us: "yes" },
];

function Cell({ v }: { v: Mark | string }) {
  if (v === "yes")
    return (
      <span className="cell">
        <span className="mark is-yes">
          <Check width={14} height={14} />
        </span>
        <span className="sr-only">Yes</span>
      </span>
    );
  if (v === "no")
    return (
      <span className="cell">
        <span className="mark is-no">
          <Dash width={14} height={14} />
        </span>
        <span className="sr-only">No</span>
      </span>
    );
  return <span className="cell">{v}</span>;
}

export default function Compare() {
  return (
    <section className="section compare-band" id="why" aria-labelledby="why-title">
      <div className="wrap">
        <div className="rule-head">
          <h2 id="why-title" className="h2">
            Why Cyphix
          </h2>
        </div>
        <p className="body-lg compare-lede">
          Today it’s wearable ease or clinical depth. Cyphix delivers both, on the watch people
          already wear. The crowded market is our installed base.
        </p>
        <table className="compare" role="table">
          <caption className="sr-only">
            Cyphix compared with smartwatch ECG and with Holter and clinic ECG
          </caption>
          <colgroup>
            <col className="col-feature" />
            <col />
            <col />
            <col />
          </colgroup>
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" role="columnheader">
                <span className="sr-only">Capability</span>
              </th>
              <th scope="col" role="columnheader">
                Smartwatch ECG
              </th>
              <th scope="col" role="columnheader">
                Holter and clinic ECG
              </th>
              <th scope="col" role="columnheader" className="is-us">
                <Logo className="compare-logo" />
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {ROWS.map((r) => (
              <tr key={r.feature} role="row">
                <th scope="row" role="rowheader">
                  {r.feature}
                </th>
                <td role="cell" data-label="Smartwatch">
                  <Cell v={r.watch} />
                </td>
                <td role="cell" data-label="Holter / clinic">
                  <Cell v={r.clinic} />
                </td>
                <td role="cell" data-label="Cyphix" className="is-us">
                  {r.us === "6 limb leads" ? (
                    <span className="cell">
                      <span className="mark is-yes">
                        <Check width={14} height={14} />
                      </span>
                      <span>
                        6 <span className="is-long">limb </span>leads
                      </span>
                    </span>
                  ) : (
                    <Cell v={r.us} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// v0.9.0 — the comparison as its own "Why Cyphix" band (moved out of the need)
