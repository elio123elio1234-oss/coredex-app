import { useEffect, useRef, useState } from "react";

/* A small panel opened by a button in the bar (the phone's number, the
   Explore menu): it closes on a second click, a click anywhere outside it,
   or Escape, which hands focus back to its button. */
export function usePopover<B extends HTMLElement = HTMLButtonElement>() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const button = useRef<B>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return { open, setOpen, ref, button };
}

// v0.35.0 — the bar's panels share one open/close rule: the phone's number and the Explore menu
