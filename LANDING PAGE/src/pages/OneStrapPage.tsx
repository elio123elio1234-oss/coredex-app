import Header from "../components/Header";
import Footer from "../components/Footer";
import ContactForm from "../components/ContactForm";
import OneStrap from "../components/OneStrap";

/* "One strap. Any watch.", behind "Explore": the 3D journey on a page of its
   own, so the home page stays short. It opens straight on the dark stage and
   ends on "Request the deck". */

export default function OneStrapPage() {
  return (
    <>
      <Header page="one-strap" />
      <main id="top" className="is-journey">
        <OneStrap />
        <ContactForm />
      </main>
      <Footer />
    </>
  );
}

// v0.35.0 — the 3D journey on a page of its own (it left the home page at the user's request)
