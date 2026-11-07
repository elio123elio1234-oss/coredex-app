import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Accessibility from "../pages/Accessibility";
import "../index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Accessibility />
  </StrictMode>
);

// v0.38.23 — the /accessibility page's entry
