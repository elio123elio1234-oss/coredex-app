import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import OneStrapPage from "../pages/OneStrapPage";
import "../index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OneStrapPage />
  </StrictMode>
);

// v0.35.0 — the /one-strap page's entry
