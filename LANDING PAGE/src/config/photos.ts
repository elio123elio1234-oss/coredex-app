/* The page's four photograph slots (prompts in gemini/PROMPTS.md).
   Until a generated photo is dropped into src/assets/photos/ and imported
   here, each slot shows its interim: a render of the team's 3D model, or
   the real app screen. Swapping one in is a one-line change per slot. */

import heroWrist from "../assets/photos/hero-wrist.webp";

export type PhotoSlot = "hero" | "home" | "group" | "clinic";

export type Photo = { src: string; alt: string; w: number; h: number };

/** Generated photographs, by slot, as the user supplies them. */
export const PHOTOS: Partial<Record<PhotoSlot, Photo>> = {
  // the user's own image (ChatGPT), turned so the hand points up: the module on the inside of the wrist
  hero: {
    src: heroWrist,
    alt: "A raised forearm, palm toward the viewer, wearing the Cyphix strap: on the inside of the wrist, the module with its three steel electrodes.",
    w: 670,
    h: 1768,
  },
};

// v0.11.0 — the hero slot holds the user's wrist image (the module on the inside of the wrist)
// v0.9.0 — the four Gemini photo slots (hero wrist, home moment, three watches, clinic), empty until supplied
