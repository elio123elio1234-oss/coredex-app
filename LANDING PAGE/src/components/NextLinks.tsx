import { ArrowRight } from "./Icons";

/* Where to go next, at the foot of a page behind "Explore": the other
   pages as two wide links on a hairline, before "Request the deck". */

type Link = { href: string; title: string; text: string };

export default function NextLinks({ links }: { links: Link[] }) {
  return (
    <nav className="section next" aria-label="More from Cyphix">
      <div className="wrap next-grid">
        {links.map((l) => (
          <a key={l.href} className="next-link" href={l.href}>
            <span className="next-title">{l.title}</span>
            <span className="next-text">{l.text}</span>
            <ArrowRight className="next-arrow" width={22} height={22} />
          </a>
        ))}
      </div>
    </nav>
  );
}

// v0.35.0 — the other pages, as two wide links before "Request the deck"
