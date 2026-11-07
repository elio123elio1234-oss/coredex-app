import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Privacy from "../pages/Privacy";
import "../index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Privacy />
  </StrictMode>
);

// v0.38.23 — the /privacy page's entry
