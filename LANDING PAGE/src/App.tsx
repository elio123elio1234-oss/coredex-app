import Header from "./components/Header";
import HeroScene from "./components/HeroScene";
import Need from "./components/Need";
import Leads from "./components/Leads";
import Stage from "./components/Stage";
import Market from "./components/Market";
import Team from "./components/Team";
import ContactForm from "./components/ContactForm";
import Footer from "./components/Footer";

export default function App() {
  return (
    <>
      <Header />
      <main id="top">
        <HeroScene />
        <Need />
        <Leads />
        <Stage />
        <Market />
        <Team />
        <ContactForm />
      </main>
      <Footer />
    </>
  );
}

// v0.6.0 — the investor page: out-of-the-screen hero → need → six leads → stage → market → team → request the deck
// v0.4.0 — the "Request access" form (#contact) sits between the sections and the footer
// v0.1.0 — app shell: header + hero + placeholder sections + footer
