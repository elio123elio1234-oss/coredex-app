import Header from "./components/Header";
import Hero from "./components/Hero";
import Sections from "./components/Sections";
import Footer from "./components/Footer";

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Sections />
      </main>
      <Footer />
    </>
  );
}

// v0.1.0 — app shell: header + hero + placeholder sections + footer
