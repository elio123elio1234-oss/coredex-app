import Header from "../components/Header";
import Footer from "../components/Footer";
import PageHead from "../components/PageHead";
import WearStills from "../components/WearStills";
import NextLinks from "../components/NextLinks";
import ContactForm from "../components/ContactForm";

/* Visualizations, behind "Explore": the four ways to wear the strap, as concept imagery. They
   stood on the home page until v0.37.0 (the user: not relevant at this stage), so they keep their
   slate band here, straight under the page's head. */

export default function Visualizations() {
  return (
    <>
      <Header page="visualizations" />
      <main id="top">
        <PageHead
          id="vis-title"
          chip="Visualizations"
          title="One strap."
          accent="Four ways to wear it."
          lede="On a smartwatch, on its own as a bracelet, on an analog watch, or as the Cyphix watch. Concept imagery."
        />
        <WearStills className="is-page" />
        <NextLinks
          links={[
            { href: "/one-strap", title: "One strap. Any watch.", text: "The four ways to wear it, in 3D" },
            { href: "/technology", title: "Technology", text: "How a strap records a 6-lead ECG" },
          ]}
        />
        <ContactForm />
      </main>
      <Footer />
    </>
  );
}

// v0.37.0 — the /visualizations page behind "Explore": the four watches, moved off the home page
