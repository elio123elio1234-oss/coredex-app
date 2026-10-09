import Header from "./components/Header";
import Hero from "./components/Hero";
import Sections from "./components/Sections";
import ContactForm from "./components/ContactForm";
import Footer from "./components/Footer";

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Sections />
        <ContactForm />
      </main>
      <Footer />
    </>
  );
}

// v0.4.0 — the "Request access" form (#contact) sits between the sections and the footer
// v0.1.0 — app shell: header + hero + placeholder sections + footer
