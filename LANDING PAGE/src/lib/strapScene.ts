import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { FACE, dressModel, studioEnvironment } from "./studio";

/* ==================================================================
   "One strap. Any watch." — the closing scene, rendered live from the
   team's own 3D model (public/models/cyphix.glb: "strap", "smartwatch",
   "analog" and "contour", the Cyphix watch, on one origin), dressed in the
   shared product studio. Four ways to wear it, in the team's order:

   Scroll progress p (0..1) drives everything; nothing runs on a timer
   and a frame is drawn only when p or the size changes. Every part moves
   physically and stays opaque:
     0.00–0.24  on a smartwatch, the strap turns to show the module's electrodes
     0.24–0.34  back to a three-quarter front, the module still in view
     0.34–0.37  the smartwatch unclips, with its lug housings
     0.365–0.43 and rises out of frame
     0.43–0.52  the strap closes: a band grows from both cut ends and meets in the middle
     0.60–0.66  and opens again
     0.68–0.735 the analog watch comes down
     0.735–0.765 and clicks into the same strap
     0.83–0.89  the strap and the analog watch rise out together
     0.885–0.95 the Cyphix watch, its electrodes in its own band, comes down
     0.95–1.00  hold
   ================================================================== */

export type StrapScene = {
  setProgress: (p: number) => void;
  resize: () => void;
  dispose: () => void;
};

const MODEL_URL = "/models/cyphix.glb";

const UNCLIP = 0.012; // metres out of the adapters along the face normal
const RISE = 0.17; // metres up, enough for a watch to leave the frame
const RISE_ALL = 0.23; // the whole strap loop needs more
const TAU = Math.PI * 2;
const Y0 = 0.6; // three-quarter front: the module stays in view beside the watch

/** [progress, yaw, pitch] — a monotone cubic through these, so the turn never stutters at a key. */
const KEYS: [number, number, number][] = [
  [0.0, Y0, 0.2],
  [0.24, Y0 + Math.PI, 0.32],
  [0.34, Y0 + TAU, 0.22],
  [0.43, Y0 + TAU + 0.1, 0.28],
  [0.52, Y0 + TAU + 0.18, 0.36], // a little from above: the closed loop reads as a bracelet
  [0.62, Y0 + TAU + 0.26, 0.32],
  [0.765, Y0 + TAU + 0.36, 0.26],
  [0.89, Y0 + TAU + 0.44, 0.26],
  [1.0, Y0 + TAU + 0.56, 0.24],
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const span = (a: number, b: number, v: number) => clamp01((v - a) / (b - a));
const easeInCubic = (t: number) => t * t * t;
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

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

/** A soft cool pool of light under the product on the dark stage. */
function floorGlow() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, "rgba(150,180,255,0.55)");
  r.addColorStop(0.45, "rgba(120,150,230,0.16)");
  r.addColorStop(1, "rgba(120,150,230,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.2).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  mesh.renderOrder = -1;
  return mesh;
}

export async function createStrapScene(host: HTMLElement): Promise<StrapScene> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer, "dark");
  scene.environmentIntensity = 1.0;
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(-1.6, 2.4, 2.6);
  const rim = new THREE.DirectionalLight(0xcfe0ff, 2.6);
  rim.position.set(2.4, 1.4, -2.6);
  scene.add(key, rim);

  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(MODEL_URL);
  const root = gltf.scene;
  const { strap, smartwatch, analog, contour, link, closeLink } = dressModel(root);
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
  const glow = floorGlow();
  glow.position.y = -box.getSize(new THREE.Vector3()).y / 2 - 0.004;
  scene.add(glow);

  const camera = new THREE.PerspectiveCamera(24, 1, 0.005, 5);
  const worldUp = new THREE.Vector3();
  const inv = new THREE.Matrix4();

  let progress = 0;
  let frame = 0;

  /** world-up expressed in the watches' parent space, so they rise straight up whatever the turn */
  const upInRoot = () => {
    root.updateMatrixWorld(true);
    inv.copy(root.matrixWorld).invert();
    return worldUp.set(0, 1, 0).transformDirection(inv);
  };

  const draw = () => {
    frame = 0;
    const p = progress;
    spin.rotation.y = yawAt(p);
    tilt.rotation.x = pitchAt(p);
    const up = upInRoot();

    // the smartwatch: unclip, then rise out of frame
    const out = easeInOut(span(0.34, 0.37, p));
    const rise = easeInCubic(span(0.365, 0.43, p));
    smartwatch.position.copy(FACE).multiplyScalar(out * UNCLIP).addScaledVector(up, rise * RISE);
    smartwatch.visible = rise < 0.999;

    // the strap alone closes into a bracelet, then opens again for the analog
    const closed = easeInOut(span(0.43, 0.52, p)) * (1 - easeInOut(span(0.6, 0.66, p)));
    closeLink(closed);
    link.visible = closed > 0.001;

    // the strap with the analog watch leaves together for the Cyphix watch
    const away = easeInCubic(span(0.83, 0.89, p));
    strap.position.copy(up).multiplyScalar(away * RISE_ALL);
    strap.visible = away < 0.999;

    // the analog: down from above, then click into the same strap
    const fall = 1 - easeOutCubic(span(0.68, 0.735, p));
    const clip = 1 - easeInOut(span(0.735, 0.765, p));
    analog.position.copy(FACE).multiplyScalar(clip * UNCLIP).addScaledVector(up, fall * RISE + away * RISE_ALL);
    analog.visible = p > 0.675 && away < 0.999;

    // the Cyphix watch: one piece, its electrodes in its own band
    const arrive = 1 - easeOutCubic(span(0.885, 0.95, p));
    contour.position.copy(up).multiplyScalar(arrive * RISE_ALL);
    contour.visible = p > 0.88;

    renderer.render(scene, camera);
  };
  const request = () => {
    if (!frame) frame = requestAnimationFrame(draw);
  };

  const resize = () => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    const aspect = w / h;
    camera.aspect = aspect;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const wide = aspect >= 1.15;
    // the product's half extents across the whole turn, in metres; on wide stages it takes
    // ~72% of the height right of centre beside the copy, on tall ones ~80% of the width under it
    const dist = wide
      ? Math.max(0.042 / tan / 0.72, 0.045 / (tan * aspect) / 0.5)
      : Math.max(0.042 / tan / 0.6, 0.032 / (tan * aspect) / 0.8);
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    if (wide) camera.setViewOffset(w, h, -w * 0.2, 0, w, h);
    else camera.setViewOffset(w, h, 0, -h * 0.06, w, h);
    camera.updateProjectionMatrix();
    request();
  };

  resize();

  return {
    setProgress: (p: number) => {
      const next = clamp01(p);
      if (Math.abs(next - progress) < 1e-4) return;
      progress = next;
      request();
    },
    resize,
    dispose: () => {
      if (frame) cancelAnimationFrame(frame);
      scene.environment?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

// v0.10.0 — the strap closes by growing from its cut ends, not by a dropped-in link
// v0.10.0 — four ways to wear it: smartwatch → the strap closes into a bracelet → analog → the Cyphix watch (the Contour)
// v0.8.0 — the "One strap. Any watch." scene: studio-dressed GLB; the watch unclips and rises out, the analog comes down and clicks in, all opaque
