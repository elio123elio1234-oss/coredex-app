import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Visualizations from "../pages/Visualizations";
import "../index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Visualizations />
  </StrictMode>
);

// v0.37.0 — the /visualizations page's entry
