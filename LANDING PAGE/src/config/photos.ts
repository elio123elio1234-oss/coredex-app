/* The page's photograph slots (prompts in gemini/PROMPTS.md).
   Until a generated photo is dropped into src/assets/photos/ and imported
   here, each slot shows its interim: a render of the team's 3D model, or
   the real app screen. Swapping one in is a one-line change per slot.
   The four-watch image for "Our solution" came from the user as one strip;
   Product.tsx imports its four cuts directly, so it has no slot here. */

import heroWrist from "../assets/photos/hero-wrist.webp";
import homeClinician from "../assets/photos/home-clinician.webp";

export type PhotoSlot = "hero" | "home" | "clinic";

/** `focus` is the CSS object-position that keeps the subject in frame when the slot crops the photo. */
export type Photo = { src: string; alt: string; w: number; h: number; focus?: string };

/** Generated photographs, by slot, as the user supplies them. */
export const PHOTOS: Partial<Record<PhotoSlot, Photo>> = {
  // the user's own image (ChatGPT), turned so the hand points up: the module on the inside of the wrist
  hero: {
    src: heroWrist,
    alt: "A raised forearm, the hand relaxed and open toward the viewer, wearing the Cyphix strap: on the inside of the wrist, the module with its three black electrodes.",
    w: 670,
    h: 1464,
  },
  // the user's own image (ChatGPT): a physician reviewing a CYPHIX recording; the laptop stays in frame
  home: {
    src: homeClinician,
    alt: "A physician at his desk reviews a CYPHIX 6-lead recording on a laptop: the limb leads, the scan history and the frontal-plane axis.",
    w: 1672,
    h: 941,
    focus: "14% 50%",
  },
};

// v0.17.0 — the user's new forearm image (black electrodes), 670 x 1464: the hand a touch higher
// v0.13.4 — the forearm 60 rows longer (670 x 1404), so the hand sits a touch higher
// v0.13.0 — the "home" slot (beside "1 in 3") holds the user's physician image
// v0.12.0 — the "group" slot is gone: the user's four-watch image is wired in Product.tsx
// v0.11.1 — the forearm cropped shorter (the hand sat too high)
// v0.25.0 — the hero forearm is the user's more natural hand (relaxed, open); the strap on the same pixels
// v0.11.0 — the hero slot holds the user's wrist image (the module on the inside of the wrist)
// v0.9.0 — the four Gemini photo slots (hero wrist, home moment, three watches, clinic), empty until supplied
