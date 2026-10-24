import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { dressModel, studioEnvironment } from "./studio";

/* ==================================================================
   "One strap. Any watch." — the page's one dark moment, rendered live from
   the team's own 3D model (public/models/cyphix.glb), dressed in the
   shared product studio.

   No transitions at all, only the page's own scroll: the four ways to wear
   it stand one under the other, a screen apart (the smartwatch, the
   bracelet, the analog watch, the Cyphix watch), and the camera moves down
   past them exactly as the page would scroll, holding on each while its
   copy holds. Each turns slowly as it goes by. The caller (OneStrap) owns
   the timeline: render(pos, s) draws the column at `pos` (0 = the first,
   1 = the second…; whole numbers are holds) with the scroll `s`, in screens,
   turning the products.
   ================================================================== */

export type StrapStory = {
  /** draws the column at position `pos`, the products turned by the scroll `s` (in screens) */
  render: (pos: number, s: number) => void;
  /** re-reads the host's size; returns true when it changed */
  resize: () => boolean;
  dispose: () => void;
};

const MODEL_URL = "/models/cyphix.glb";

type Look = { watch: "smartwatch" | "analog" | "contour" | null; closed: number; yaw: number; pitch: number; centre: number };
/* the column, top to bottom; `centre` is the scroll (in screens) at the middle of its hold, where
   it stands at `yaw`; it turns 0.32 rad per screen of scroll */
export const COLUMN: Look[] = [
  { watch: "smartwatch", closed: 0, yaw: 0.5, pitch: 0.18, centre: 0.35 },
  { watch: null, closed: 1, yaw: 0.8, pitch: 0.32, centre: 2.05 },
  { watch: "analog", closed: 0, yaw: 0.45, pitch: 0.16, centre: 3.75 },
  { watch: "contour", closed: 0, yaw: 0.45, pitch: 0.22, centre: 5.45 },
];
const TURN = 0.32; // rad per screen

/** lets the page breathe between the heavy steps of the build, so none of them is one long task */
const breathe = () => new Promise<void>((r) => setTimeout(r, 0));

export async function createStrapStory(host: HTMLElement): Promise<StrapStory> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  // 1.5x is still sharp with antialiasing, and a 2x screen fills 44 % fewer pixels each frame
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.className = "st-canvas";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  await breathe();
  scene.environment = studioEnvironment(renderer, "dark");
  scene.environmentIntensity = 1.0;
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(-1.6, 2.4, 2.6);
  const rim = new THREE.DirectionalLight(0xcfe0ff, 2.6);
  rim.position.set(2.4, 1.4, -2.6);
  scene.add(key, rim);

  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(MODEL_URL);
  await breathe();

  // one dressed copy of the model per way to wear it, each on its own turntable, in a column (the
  // copies are taken from the undressed model, before any of them is dressed)
  const roots = COLUMN.map((_, i) => (i === 0 ? gltf.scene : gltf.scene.clone(true)));
  const stands: { stand: THREE.Group; spin: THREE.Group; tilt: THREE.Group; look: Look }[] = [];
  for (const [i, look] of COLUMN.entries()) {
    const root = roots[i];
    const { strap, smartwatch, analog, contour, link, closeLink } = dressModel(root);
    smartwatch.visible = look.watch === "smartwatch";
    analog.visible = look.watch === "analog";
    contour.visible = look.watch === "contour";
    strap.visible = look.watch !== "contour"; // the Cyphix watch has its own band
    closeLink(look.closed);
    link.visible = look.closed > 0;
    const presenter = new THREE.Group();
    presenter.rotation.y = Math.PI / 4; // undo the export's presentation yaw: the faces point at the camera at yaw 0
    presenter.add(root);
    const spin = new THREE.Group();
    const tilt = new THREE.Group();
    const stand = new THREE.Group();
    spin.add(presenter);
    tilt.add(spin);
    stand.add(tilt);
    scene.add(stand);
    // turn about the middle of what this one shows
    const box = new THREE.Box3().setFromObject(presenter);
    presenter.position.sub(box.getCenter(new THREE.Vector3()));
    stands.push({ stand, spin, tilt, look });
    await breathe();
  }

  const camera = new THREE.PerspectiveCamera(24, 1, 0.005, 5);
  let w = 1;
  let h = 1;
  let dist = 1;
  let gap = 1; // world metres between two stands: one screen's height at the products' distance
  let drawn = "";

  const render = (pos: number, s: number) => {
    const key = `${pos.toFixed(5)}:${s.toFixed(4)}`;
    if (key === drawn) return;
    drawn = key;
    stands.forEach(({ stand, spin, tilt, look }, i) => {
      stand.position.y = -i * gap;
      // only the ones on screen (or about to be) are drawn
      stand.visible = Math.abs(i - pos) < 1.15;
      spin.rotation.y = look.yaw + TURN * (s - look.centre);
      tilt.rotation.x = look.pitch;
    });
    camera.position.set(0, -pos * gap, dist);
    camera.lookAt(0, -pos * gap, 0);
    renderer.render(scene, camera);
  };

  // setting a canvas's size, even to the same value, clears and reallocates it: a phone's
  // address bar hiding fires resize without changing the stage, so unchanged sizes are skipped
  let size = "";
  const resize = () => {
    w = Math.max(1, host.clientWidth);
    h = Math.max(1, host.clientHeight);
    if (`${w}x${h}` === size) return false;
    size = `${w}x${h}`;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // large and centred under the copy: the product's half extents over ~60% of the stage's
    // height, or ~86% of a narrow stage's width, held low in the frame, clear of the copy
    dist = Math.max(0.042 / tan / 0.6, 0.046 / (tan * aspect) / 0.86);
    gap = 2 * dist * tan; // the column moves exactly as the page scrolls
    camera.setViewOffset(w, h, 0, -h * 0.16, w, h);
    camera.updateProjectionMatrix();
    drawn = "";
    return true;
  };

  resize();

  // every shader compiled and every texture uploaded now, before the visitor gets here
  stands.forEach(({ stand }) => (stand.visible = true));
  await renderer.compileAsync(scene, camera);
  await breathe();
  renderer.render(scene, camera);

  return {
    render,
    resize,
    dispose: () => {
      scene.environment?.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

// v0.30.0 — no transitions, only the scroll: the four ways to wear it stand in a column a screen apart and the camera moves past them exactly as the page scrolls, holding on each; each turns slowly (the dissolve of v0.29.0 withdrawn)
// v0.29.0 — the dark moment, calm: the product large and centred under the copy, rising into view, each way to wear it a chapter that arrives with a soft dissolve
