/* The page's four photograph slots (prompts in gemini/PROMPTS.md).
   Until a generated photo is dropped into src/assets/photos/ and imported
   here, each slot shows its interim: a render of the team's 3D model, or
   the real app screen. Swapping one in is a one-line change per slot. */

export type PhotoSlot = "hero" | "home" | "group" | "clinic";

export type Photo = { src: string; alt: string; w: number; h: number };

/** Generated photographs, by slot. Empty until the user supplies them. */
export const PHOTOS: Partial<Record<PhotoSlot, Photo>> = {};

// v0.9.0 — the four Gemini photo slots (hero wrist, home moment, three watches, clinic), empty until supplied
