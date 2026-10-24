import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Technology from "../pages/Technology";
import "../index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Technology />
  </StrictMode>
);

// v0.35.0 — the /technology page's entry
