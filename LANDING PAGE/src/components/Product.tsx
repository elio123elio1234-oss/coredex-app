import room from "../assets/photos/solution-room.webp";
import man from "../assets/photos/solution-man.webp";

/* "Universal Fit. Clinical Power.", AliveCor-style: a band with a navy card
   rising over its lower edge. In the band, the user's scene: a room, blurred,
   and in front of it a man in an armchair checking the module on his watch
   strap, his head rising a little above the band's top edge, the card
   covering his legs. (Empty from v0.37.0, when its four watches moved to
   /visualizations; the user's two images since v0.38.21.) */

export default function Product() {
  return (
    <section className="solution" id="solution" aria-labelledby="solution-title">
      <figure className="solution-media is-scene">
        <div className="solution-room" aria-hidden="true">
          <img src={room} alt="" width={1672} height={941} loading="lazy" decoding="async" />
        </div>
        <img
          className="solution-man"
          src={man}
          width={884}
          height={1000}
          alt="A man in an armchair checks the Cyphix module on his watch strap."
          loading="lazy"
          decoding="async"
        />
      </figure>
      <div className="wrap">
        <div className="solution-card">
          <h2 id="solution-title">Universal Fit. Clinical Power.</h2>
          <p>
            Cyphix is designed to fit your lifestyle, not disrupt it. Forget cumbersome wires and
            clinical setups. Our 6-lead module seamlessly integrates with the watch you already
            own—smart or analog—or works beautifully as a standalone bracelet.
          </p>
        </div>
      </div>
    </section>
  );
}

// v0.38.21 — the band's scene, the user's two images: the room blurred, the man in his armchair in front, his head above the band
// v0.37.9 — the card's words, the user's: "Universal Fit. Clinical Power." and its paragraph, in place of "Our solution"
// v0.37.0 — the band kept, empty; its four watches moved to /visualizations (WearStills)
// v0.15.0 — the card's "See how it works" link goes with that section
// v0.12.0 — the user's four-watch image (cut per watch) replaces the renders; the hovered watch grows
// v0.10.0 — four stills: smartwatch, bracelet, analog, the Cyphix watch
// v0.9.0 — "Our solution": full-bleed photo slot "group" (interim: three renders) under a navy card
// v0.8.0 — re-rendered in the product studio (AO, contact shadow); dots re-projected, the strap's on the band surface
