import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { dressModel, studioEnvironment } from "./studio";

/* ==================================================================
   "One strap. Any watch." — the dark moment near the end of the page,
   rendered live from the team's own 3D model (public/models/cyphix.glb:
   "strap", "smartwatch", "analog" and "contour", the Cyphix watch, on one
   origin), dressed in the shared product studio.

   Calm, in the manner of a product page: the product large and centred
   under the copy, turning slowly as the page scrolls. It rises into view
   at the start; then each way to wear it is its own chapter, and the next
   one arrives with a soft dissolve, never a mechanical move, never
   anything drawn over the product.

     0.00–0.18  the smartwatch rises into place
     0.18–0.36  it turns, and the camera moves in towards the module
     0.36–0.52  the bracelet
     0.52–0.68  the analog watch
     0.68–0.84  the Cyphix watch
     0.84–1.00  (the page brings the day in, with the clinician's screen)

   Scroll progress p (0..1) drives everything; the caller draws a frame
   with render(p) in its own animation frame, only when p or the size
   changes. The dissolve itself is time-based (0.7 s), as on a product page.
   ================================================================== */

export type StrapStory = {
  /** draws the scene at progress p (0..1) now; skipped when nothing changed */
  render: (p: number) => void;
  /** re-reads the host's size; returns true when it changed */
  resize: () => boolean;
  dispose: () => void;
};

const MODEL_URL = "/models/cyphix.glb";

type Config = { watch: "smartwatch" | "analog" | "contour" | null; closed: number };
type Chapter = {
  from: number;
  to: number;
  config: Config;
  yaw: [number, number];
  pitch: [number, number];
  /** how far the camera has moved in towards the module, over the chapter */
  macro?: (t: number) => number;
  /** how far below its place the product still is (the rise), over the chapter */
  lift?: (t: number) => number;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** smootherstep: no jolt at either end */
const soft = (t: number) => {
  const x = clamp01(t);
  return x * x * x * (x * (6 * x - 15) + 10);
};
const span = (a: number, b: number, v: number) => clamp01((v - a) / (b - a));

const SMART: Config = { watch: "smartwatch", closed: 0 };
const CHAPTERS: Chapter[] = [
  { from: 0, to: 0.18, config: SMART, yaw: [0.12, 0.55], pitch: [0.1, 0.16], lift: (t) => 1 - soft(t / 0.7) },
  { from: 0.18, to: 0.36, config: SMART, yaw: [0.55, 0.95], pitch: [0.16, 0.2], macro: (t) => 0.3 * soft(t / 0.55) },
  { from: 0.36, to: 0.52, config: { watch: null, closed: 1 }, yaw: [0.7, 1.0], pitch: [0.3, 0.36] },
  { from: 0.52, to: 0.68, config: { watch: "analog", closed: 0 }, yaw: [0.32, 0.66], pitch: [0.14, 0.18] },
  { from: 0.68, to: 1.0, config: { watch: "contour", closed: 0 }, yaw: [0.3, 0.72], pitch: [0.2, 0.24] },
];
const chapterAt = (p: number) => CHAPTERS.findIndex((c, i) => p < c.to || i === CHAPTERS.length - 1);

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
  // the dissolve: the outgoing chapter's last frame, held on a plain canvas above, fading out
  const veil = document.createElement("canvas");
  veil.className = "st-veil";
  veil.setAttribute("aria-hidden", "true");
  host.appendChild(veil);
  const veilCtx = veil.getContext("2d")!;

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
  const root = gltf.scene;
  await breathe();
  const { strap, smartwatch, analog, contour, link, closeLink } = dressModel(root);
  await breathe();
  const presenter = new THREE.Group();
  presenter.rotation.y = Math.PI / 4; // undo the export's presentation yaw: the faces point at the camera at yaw 0
  presenter.add(root);
  const spin = new THREE.Group();
  const tilt = new THREE.Group();
  spin.add(presenter);
  tilt.add(spin);
  scene.add(tilt);
  // turn about the middle of the strap loop, not the watch
  const box = new THREE.Box3().setFromObject(presenter);
  presenter.position.sub(box.getCenter(new THREE.Vector3()));

  const electrodes = ["electrode_LL1", "electrode_LL2", "electrode_RLD", "electrode_LA1", "electrode_LA2"].map(
    (n) => root.getObjectByName(n)!,
  );
  const camera = new THREE.PerspectiveCamera(24, 1, 0.005, 5);
  const V = new THREE.Vector3();
  const aim = new THREE.Vector3();
  const atModule = new THREE.Vector3();

  let w = 1;
  let h = 1;
  let distFull = 1;
  let distMacro = 1;
  let drawn = -1; // the progress last drawn; -1 forces the next render
  let shownChapter = -1;
  let configured: Config | null = null;

  const configure = (c: Config) => {
    if (configured === c) return;
    configured = c;
    smartwatch.visible = c.watch === "smartwatch";
    analog.visible = c.watch === "analog";
    contour.visible = c.watch === "contour";
    strap.visible = c.watch !== "contour"; // the Cyphix watch has its own band
    closeLink(c.closed);
    link.visible = c.closed > 0;
  };

  /** the scene as chapter i shows it at progress p (held at the chapter's ends) */
  const draw = (i: number, p: number) => {
    const c = CHAPTERS[i];
    const t = span(c.from, c.to, p);
    const e = soft(t);
    configure(c.config);
    spin.rotation.y = c.yaw[0] + (c.yaw[1] - c.yaw[0]) * e;
    tilt.rotation.x = c.pitch[0] + (c.pitch[1] - c.pitch[0]) * e;
    tilt.updateMatrixWorld(true);
    const macro = c.macro ? c.macro(t) : 0;
    const lift = c.lift ? c.lift(t) : 0;
    atModule.set(0, 0, 0);
    electrodes.forEach((el) => atModule.add(el.getWorldPosition(V)));
    atModule.multiplyScalar(1 / electrodes.length);
    aim.copy(atModule).multiplyScalar(macro);
    aim.y += lift * 0.09; // the camera looks above the product: it sits low, then rises into place
    const dist = Math.exp((1 - macro) * Math.log(distFull) + macro * Math.log(distMacro));
    camera.position.set(aim.x, aim.y, aim.z + dist);
    camera.lookAt(aim);
    renderer.render(scene, camera);
  };

  const render = (p: number) => {
    const next = clamp01(p);
    if (Math.abs(next - drawn) < 1e-5) return;
    const i = chapterAt(next);
    const prev = shownChapter;
    // a new chapter with a new configuration arrives with a dissolve over the last frame of the old
    // one (a jump across several chapters at once simply cuts)
    if (prev >= 0 && i !== prev && Math.abs(i - prev) === 1 && CHAPTERS[i].config !== CHAPTERS[prev].config) {
      draw(prev, drawn);
      veilCtx.clearRect(0, 0, veil.width, veil.height);
      veilCtx.drawImage(canvas, 0, 0, veil.width, veil.height);
      veil.style.transition = "none";
      veil.style.opacity = "1";
      void veil.offsetWidth;
      veil.style.transition = "";
      veil.style.opacity = "0";
    }
    shownChapter = i;
    drawn = next;
    draw(i, next);
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
    veil.width = Math.round(w * renderer.getPixelRatio());
    veil.height = Math.round(h * renderer.getPixelRatio());
    const aspect = w / h;
    camera.aspect = aspect;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // large and centred under the copy: the product's half extents over ~60% of the stage's
    // height, or ~86% of a narrow stage's width, held low in the frame, clear of the copy
    distFull = Math.max(0.042 / tan / 0.6, 0.046 / (tan * aspect) / 0.86);
    distMacro = distFull * 0.55;
    camera.setViewOffset(w, h, 0, -h * 0.16, w, h);
    camera.updateProjectionMatrix();
    drawn = -1;
    return true;
  };

  root.updateMatrixWorld(true);
  resize();

  // every part's shaders compiled and every texture uploaded now, before the visitor gets here
  [smartwatch, analog, contour, link].forEach((o) => (o.visible = true));
  await renderer.compileAsync(scene, camera);
  await breathe();
  renderer.render(scene, camera);
  configured = null;

  return {
    render,
    resize,
    dispose: () => {
      scene.environment?.dispose();
      renderer.dispose();
      canvas.remove();
      veil.remove();
    },
  };
}

// v0.29.0 — the dark moment, calm: the product large and centred under the copy, rising into view, each way to wear it a chapter that arrives with a soft dissolve; nothing drawn over the product (replaces lib/strapScene's journey)
