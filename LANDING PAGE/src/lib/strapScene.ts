import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { FACE, dressModel, studioEnvironment } from "./studio";

/* ==================================================================
   "One strap. Any watch." — the closing journey, rendered live from the
   team's own 3D model (public/models/cyphix.glb: "strap", "smartwatch",
   "analog" and "contour", the Cyphix watch, on one origin), dressed in the
   shared product studio. Four chapters:

     the moment   0.00–0.15   in the dark, a close-up of the module's
                              electrodes; a sweep of light finds them
     the strap    0.11–0.32   the camera pulls back, then the product turns:
                              the strap on a smartwatch, near full height
                  0.3875–0.495 the smartwatch unclips and rises out
                  0.495–0.575 the strap closes into a bracelet
                  0.61–0.725  it opens, and the analog watch comes down
                              and clicks in
     ours         0.7625–0.82 the strap and the analog rise out together
                  0.775–0.84  as the Cyphix watch rises in from below
     clinician    (the page fades the canvas into the day scene)

   Scroll progress p (0..1) drives everything; nothing runs on a timer.
   The caller draws a frame with render(p), in its own animation frame,
   and only when p or the size changes. Every part moves physically and
   stays opaque, and nothing is drawn over the product.
   ================================================================== */

export type StrapScene = {
  /** draws the scene at progress p (0..1) now; skipped when nothing changed */
  render: (p: number) => void;
  /** re-reads the host's size; returns true when it changed */
  resize: () => boolean;
  dispose: () => void;
};

const MODEL_URL = "/models/cyphix.glb";

const UNCLIP = 0.012; // metres out of the adapters along the face normal
const RISE = 0.17; // metres up, enough for a watch to leave the frame
const RISE_ALL = 0.23; // the whole strap loop needs more
const PI = Math.PI;
const TAU = PI * 2;

/** [progress, yaw, pitch] — a monotone cubic through these, so the turn never stutters at a key.
    Yaw 0 (mod 2π) puts the watch faces square to the camera; π puts the module there. */
const KEYS: [number, number, number][] = [
  [0.0, PI + 0.55, 0.1], // the module's electrodes, close, at an angle the light can sweep
  [0.13, PI + 0.22, 0.14],
  [0.21, PI + 0.85, 0.16], // the camera is back first, so the turn never sweeps under the copy
  [0.32, TAU + 0.6, 0.2], // the reveal: round to a three-quarter front, the module still in view
  [0.4, TAU + 0.7, 0.22],
  [0.575, TAU + 0.85, 0.36], // a little from above: the closed loop reads as a bracelet
  [0.66, TAU + 0.9, 0.3],
  [0.73, TAU + 0.62, 0.18], // the analog, its face toward the camera
  [0.84, TAU + 0.5, 0.24],
  [1.0, TAU + 0.6, 0.24],
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const span = (a: number, b: number, v: number) => clamp01((v - a) / (b - a));
const smooth = (a: number, b: number, v: number) => {
  const t = span(a, b, v);
  return t * t * (3 - 2 * t);
};
const easeInCubic = (t: number) => t * t * t;
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
/** lets the page breathe between the heavy steps of the build, so none of them is one long task */
const breathe = () => new Promise<void>((r) => setTimeout(r, 0));

/** Fritsch–Carlson monotone cubic through (xs, ys). */
function monotone(xs: number[], ys: number[]) {
  const n = xs.length;
  const d = xs.slice(1).map((x, i) => (ys[i + 1] - ys[i]) / (x - xs[i]));
  const m = ys.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

const yawAt = monotone(KEYS.map((k) => k[0]), KEYS.map((k) => k[1]));
const pitchAt = monotone(KEYS.map((k) => k[0]), KEYS.map((k) => k[2]));

export async function createStrapScene(host: HTMLElement): Promise<StrapScene> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  // 1.5x is still sharp with antialiasing, and a 2x screen fills 44 % fewer pixels each frame
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);

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

  // the camera's two subjects: the module's electrodes, the whole product
  const electrodes = ["electrode_LL1", "electrode_LL2", "electrode_RLD", "electrode_LA1", "electrode_LA2"].map(
    (n) => root.getObjectByName(n)!,
  );

  const camera = new THREE.PerspectiveCamera(24, 1, 0.005, 5);
  const worldUp = new THREE.Vector3();
  const inv = new THREE.Matrix4();
  const V = new THREE.Vector3();
  const atMacro = new THREE.Vector3();

  let drawn = -1; // the progress last drawn; -1 forces the next render
  let w = 1;
  let h = 1;
  let distFull = 1;
  let distMacro = 1;

  /** world-up expressed in the watches' parent space, so they rise straight up whatever the turn */
  const upInRoot = () => {
    root.updateMatrixWorld(true);
    inv.copy(root.matrixWorld).invert();
    return worldUp.set(0, 1, 0).transformDirection(inv);
  };

  const pose = (p: number) => {
    spin.rotation.y = yawAt(p);
    tilt.rotation.x = pitchAt(p);
    const up = upInRoot();

    // the opening: the room is dark, and a sweep of light crosses the polished electrodes
    scene.environmentIntensity = 0.12 + 0.88 * smooth(0.0, 0.11, p);
    // (it comes to rest at the studio's own angle, which the rest of the scene is lit by)
    scene.environmentRotation.y = -1.6 + 1.6 * smooth(0.0, 0.14, p);
    key.intensity = 1.4 * smooth(0.02, 0.12, p);

    // the smartwatch: unclip, then rise out of frame
    const out = easeInOut(span(0.3875, 0.42, p));
    const rise = easeInCubic(span(0.415, 0.495, p));
    smartwatch.position.copy(FACE).multiplyScalar(out * UNCLIP).addScaledVector(up, rise * RISE);
    smartwatch.visible = rise < 0.999;

    // the strap alone closes into a bracelet, then opens again for the analog
    const closed = easeInOut(span(0.495, 0.575, p)) * (1 - easeInOut(span(0.61, 0.66, p)));
    closeLink(closed);
    link.visible = closed > 0.001;

    // the strap with the analog watch leaves together for the Cyphix watch
    const away = easeInCubic(span(0.7625, 0.82, p));
    strap.position.copy(up).multiplyScalar(away * RISE_ALL);
    strap.visible = away < 0.999;

    // the analog: down from above, then click into the same strap
    const fall = 1 - easeOutCubic(span(0.635, 0.7, p));
    const clip = 1 - easeInOut(span(0.7, 0.725, p));
    analog.position.copy(FACE).multiplyScalar(clip * UNCLIP).addScaledVector(up, fall * RISE + away * RISE_ALL);
    analog.visible = p > 0.63 && away < 0.999;

    // the Cyphix watch: one piece, its electrodes in its own band, rising in from below as the
    // strap and the analog leave above, so the stage is never empty
    const arrive = 1 - easeOutCubic(span(0.775, 0.84, p));
    contour.position.copy(up).multiplyScalar(-arrive * RISE_ALL);
    contour.visible = p > 0.7625;

    // the camera: close on the electrodes, then out to the whole product; the distance blends in
    // log space, so the move reads as one continuous dolly
    tilt.updateMatrixWorld(true);
    const wMacro = 1 - smooth(0.11, 0.2, p);
    atMacro.set(0, 0, 0);
    electrodes.forEach((e) => atMacro.add(e.getWorldPosition(V)));
    atMacro.multiplyScalar(wMacro / electrodes.length);
    const dist = Math.exp(wMacro * Math.log(distMacro) + (1 - wMacro) * Math.log(distFull));
    camera.position.set(atMacro.x, atMacro.y, atMacro.z + dist);
    camera.lookAt(atMacro);
    camera.updateMatrixWorld(true);
  };

  const render = (p: number) => {
    const next = clamp01(p);
    if (Math.abs(next - drawn) < 1e-5) return;
    drawn = next;
    pose(next);
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
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    const aspect = w / h;
    camera.aspect = aspect;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const wide = aspect >= 1.15;
    // the product's half extents across the whole turn, in metres: on wide stages it takes ~88%
    // of the height right of centre beside the copy, on tall ones ~90% of the width under it
    distFull = wide
      ? Math.max(0.042 / tan / 0.88, 0.045 / (tan * aspect) / 0.56)
      : Math.max(0.042 / tan / 0.66, 0.032 / (tan * aspect) / 0.9);
    // the module close, still whole
    distMacro = distFull * 0.5;
    if (wide) camera.setViewOffset(w, h, -w * 0.2, 0, w, h);
    else camera.setViewOffset(w, h, 0, -h * 0.08, w, h);
    camera.updateProjectionMatrix();
    drawn = -1;
    return true;
  };

  root.updateMatrixWorld(true);
  resize();

  // Every part's shaders are compiled now, with every part shown: each watch used to compile
  // the first time it came into view, which froze the scroll right in the scene. Then one
  // frame with everything in it uploads the textures, before the visitor gets here.
  const parts = [smartwatch, analog, contour, link];
  parts.forEach((o) => (o.visible = true));
  await renderer.compileAsync(scene, camera);
  await breathe();
  renderer.render(scene, camera);
  pose(0);

  return {
    render,
    resize,
    dispose: () => {
      scene.environment?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

// v0.33.0 — back to the v0.27.0 journey the user called "really beautiful", with only the user's own notes on it: the white pool under the product withdrawn, no six-leads move (nothing drawn over the product), each move given more scroll
// v0.27.0 — the journey: a dark close-up of the electrodes found by a sweep of light, the pull-back reveal, the product larger (~88% of the stage), the camera round to the analog face straight on for the six leads, the Cyphix watch, then the page's day scene
// v0.26.0 — smooth scroll: drawn in the caller's frame (render(p)), every shader compiled and every texture uploaded before the visitor arrives, the build in short steps, 1.5x pixel cap, no canvas reset on unchanged resizes
// v0.10.0 — the strap closes by growing from its cut ends, not by a dropped-in link
// v0.10.0 — four ways to wear it: smartwatch → the strap closes into a bracelet → analog → the Cyphix watch (the Contour)
// v0.8.0 — the "One strap. Any watch." scene: studio-dressed GLB; the watch unclips and rises out, the analog comes down and clicks in, all opaque