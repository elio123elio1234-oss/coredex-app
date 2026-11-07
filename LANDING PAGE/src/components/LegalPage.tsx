import type { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import type { PageKey } from "../config/nav";

/* The frame of a legal page (privacy, terms, accessibility): the bar, a plain head with the title
   and the date it was last updated, the text in one readable column with numbered sections, and
   the footer. No hero, no imagery: these pages are read, not shown. */

export const LEGAL_EMAIL = "elio123elio1234@gmail.com";

type Props = {
  page: PageKey;
  title: string;
  updated: string;
  intro: ReactNode;
  children: ReactNode;
};

export default function LegalPage({ page, title, updated, intro, children }: Props) {
  return (
    <>
      <Header page={page} />
      <main id="top" className="legal">
        <div className="wrap legal-inner">
          <header className="legal-head">
            <p className="legal-kicker">Legal</p>
            <h1>{title}</h1>
            <p className="legal-updated">Last updated: {updated}</p>
            <div className="legal-intro">{intro}</div>
          </header>
          <div className="legal-body">{children}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}

/* one numbered section of a legal page */
export function Clause({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="legal-clause" aria-labelledby={`clause-${n}`}>
      <h2 id={`clause-${n}`}>
        <span className="legal-n">{n}.</span> {title}
      </h2>
      {children}
    </section>
  );
}

export function Mail() {
  return <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>;
}

// v0.38.23 — the legal pages' frame: privacy, terms, accessibility (the user: protect the site from claims)
