import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Investors from "../pages/Investors";
import "../index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Investors />
  </StrictMode>
);

// v0.35.0 — the /investors page's entry
