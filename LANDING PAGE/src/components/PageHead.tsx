import type { ReactNode } from "react";
import { ArrowRight } from "./Icons";

/* The head of a page behind "Explore", in the home hero's language: the
   slate band, the chip, a two-line title whose second line is coral, the
   lede in sky. Left-aligned and shorter than the hero: an inside page. */

type Props = {
  chip: string;
  title: string;
  accent: string;
  lede: ReactNode;
  id: string;
  action?: boolean;
};

export default function PageHead({ chip, title, accent, lede, id, action }: Props) {
  return (
    <section className="page-head" aria-labelledby={id}>
      <div className="wrap page-head-inner">
        <p className="chip">{chip}</p>
        <h1 id={id} className="page-head-title">
          <span>{title}</span>
          <span className="is-coral">{accent}</span>
        </h1>
        <p className="page-head-lede">{lede}</p>
        {action && (
          <a className="btn btn-solid" href="#contact">
            Request the deck
            <ArrowRight />
          </a>
        )}
      </div>
    </section>
  );
}

// v0.35.0 — the head of the pages behind "Explore": slate band, chip, title with a coral second line, sky lede
