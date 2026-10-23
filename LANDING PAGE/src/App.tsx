import Header from "./components/Header";
import Hero from "./components/Hero";
import Facts from "./components/Facts";
import Need from "./components/Need";
import Product from "./components/Product";
import HowItWorks from "./components/HowItWorks";
import WhoFor from "./components/WhoFor";
import Stage from "./components/Stage";
import Team from "./components/Team";
import OneStrap from "./components/OneStrap";
import ContactForm from "./components/ContactForm";
import Footer from "./components/Footer";

export default function App() {
  return (
    <>
      <Header />
      <main id="top">
        <Hero />
        <Facts />
        <Need />
        <Product />
        <HowItWorks />
        <WhoFor />
        <Stage />
        <Team />
        <OneStrap />
        <ContactForm />
      </main>
      <Footer />
    </>
  );
}

// v0.14.0 — "Why Cyphix" and the market section removed (the user)
// v0.13.0 — "More than an ECG" removed (the user)
// v0.10.0 — "More than an ECG" (the module's sensors) follows how it works
// v0.9.0 — AliveCor-style order: slate hero → facts band → need split → our solution → how it works → who it's for → why Cyphix → stage → market → team → one strap, any watch → request the deck
// v0.8.0 — the 3D model leads: hero render → need → module close-up → stage → market → team → "One strap. Any watch." scene → request the deck
// v0.4.0 — the "Request access" form (#contact) sits between the sections and the footer
// v0.1.0 — app shell: header + hero + placeholder sections + footer
