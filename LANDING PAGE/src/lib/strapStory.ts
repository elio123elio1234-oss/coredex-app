import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { dressModel, studioEnvironment } from "./studio";

/* ==================================================================
   "One strap. Any watch." — the page's one dark moment, rendered live from
   the team's own 3D model (public/models/cyphix.glb), dressed in the
   shared product studio.

   The product never moves across the screen. It stands large and centred
   under the copy and turns slowly with the scroll. Between the ways to wear
   it, its light goes out (the studio, the key and the rim, even the glow of
   a watch's screen) until it is gone into the black; the next is then lit
   out of the dark. Two products are never on screen at once.

   The caller (OneStrap) owns the timeline: render(i, t, light) draws way
   `i` at `t` (0..1) through its own slow turn, under `light` (0..1).
   ================================================================== */

export type StrapStory = {
  /** draws way `i`, `t` (0..1) through its turn, under `light` (0 = dark, 1 = lit) */
  render: (i: number, t: number, light: number) => void;
  /** re-reads the host's size; returns true when it changed */
  resize: () => boolean;
  dispose: () => void;
};

const MODEL_URL = "/models/cyphix.glb";

type Way = { watch: "smartwatch" | "analog" | "contour" | null; closed: number; yaw: [number, number]; pitch: number };
/* in the page's order: on a smartwatch, as a bracelet, on an analog watch, the Cyphix watch */
const WAYS: Way[] = [
  { watch: "smartwatch", closed: 0, yaw: [0.28, 0.78], pitch: 0.18 },
  { watch: null, closed: 1, yaw: [0.55, 1.05], pitch: 0.32 },
  { watch: "analog", closed: 0, yaw: [0.2, 0.7], pitch: 0.16 },
  { watch: "contour", closed: 0, yaw: [0.2, 0.7], pitch: 0.22 },
];

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
  const KEY = 1.4;
  const RIM = 2.6;
  const key = new THREE.DirectionalLight(0xffffff, KEY);
  key.position.set(-1.6, 2.4, 2.6);
  const rim = new THREE.DirectionalLight(0xcfe0ff, RIM);
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

  // the watches' screens glow on their own; they go dark with the light too
  const glowing: { m: THREE.MeshPhysicalMaterial; base: number }[] = [];
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshPhysicalMaterial | undefined;
    if (m && m.emissiveIntensity > 0 && m.emissiveMap) glowing.push({ m, base: m.emissiveIntensity });
  });

  const camera = new THREE.PerspectiveCamera(24, 1, 0.005, 5);
  let shown = -1;
  let drawn = "";

  const configure = (i: number) => {
    if (i === shown) return;
    shown = i;
    const w = WAYS[i];
    smartwatch.visible = w.watch === "smartwatch";
    analog.visible = w.watch === "analog";
    contour.visible = w.watch === "contour";
    strap.visible = w.watch !== "contour"; // the Cyphix watch has its own band
    closeLink(w.closed);
    link.visible = w.closed > 0;
  };

  const render = (i: number, t: number, light: number) => {
    const k = `${i}:${t.toFixed(4)}:${light.toFixed(3)}`;
    if (k === drawn) return;
    drawn = k;
    configure(i);
    const w = WAYS[i];
    spin.rotation.y = w.yaw[0] + (w.yaw[1] - w.yaw[0]) * t;
    tilt.rotation.x = w.pitch;
    // the light: everything that lights the product, eased so it lingers in the highlights
    const l = light * light * (3 - 2 * light);
    scene.environmentIntensity = l;
    key.intensity = KEY * l;
    rim.intensity = RIM * l;
    glowing.forEach(({ m, base }) => (m.emissiveIntensity = base * l));
    // and it fades into the stage's navy as the last of the light goes, never a dark cut-out
    canvas.style.opacity = Math.min(1, light * 1.6).toFixed(3);
    renderer.render(scene, camera);
  };

  // setting a canvas's size, even to the same value, clears and reallocates it: a phone's
  // address bar hiding fires resize without changing the stage, so unchanged sizes are skipped
  let size = "";
  const resize = () => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    if (`${w}x${h}` === size) return false;
    size = `${w}x${h}`;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // large and centred under the copy: the product's half extents over ~60% of the stage's
    // height, or ~86% of a narrow stage's width, held low in the frame, clear of the copy
    const dist = Math.max(0.042 / tan / 0.6, 0.046 / (tan * aspect) / 0.86);
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    camera.setViewOffset(w, h, 0, -h * 0.16, w, h);
    camera.updateProjectionMatrix();
    drawn = "";
    return true;
  };

  root.updateMatrixWorld(true);
  resize();

  // every part's shaders compiled and every texture uploaded now, before the visitor gets here
  [smartwatch, analog, contour, link].forEach((o) => (o.visible = true));
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

// v0.31.0 — as the light goes the product also fades into the navy stage (no dark silhouette)
// v0.31.0 — the product never moves across the screen: it turns slowly in place, and between the ways to wear it its light goes out into the black and the next is lit out of the dark (the column of v0.30.0 withdrawn)
// v0.30.0 — no transitions, only the scroll: the four ways in a column a screen apart, passed at the scroll's own speed
// v0.29.0 — the dark moment, calm: the product large and centred under the copy, a soft dissolve between ways
