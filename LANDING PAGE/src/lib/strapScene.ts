import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { FACE, dressModel, studioEnvironment } from "./studio";

/* ==================================================================
   "One strap. Any watch." — the closing journey, rendered live from the
   team's own 3D model (public/models/cyphix.glb: "strap", "smartwatch",
   "analog" and "contour", the Cyphix watch, on one origin), dressed in the
   shared product studio. Five chapters:

     the moment   0.00–0.15  in the dark, a close-up of the module's
                             electrodes; a sweep of light finds them
     the strap    0.11–0.30  the camera pulls back, then the product turns:
                             the strap on a smartwatch, near full height
                  0.37–0.45  the smartwatch unclips and rises out
                  0.45–0.60  the strap closes into a bracelet, then opens
                  0.575–0.64 the analog watch comes down and clicks in
     six leads    0.635–0.685 the camera comes round to the analog face,
                             straight on (the page draws the six lead axes
                             over its twelve hours: components/OneStrap)
                  0.775–0.815 and back out
     ours         0.795–0.83 the strap and the analog rise out together
                  0.80–0.845 as the Cyphix watch rises in from below
     clinician    (the page fades the canvas into the day scene)

   Scroll progress p (0..1) drives everything; nothing runs on a timer.
   The caller draws a frame with render(p), in its own animation frame,
   and only when p or the size changes. Every part moves physically and
   stays opaque.
   ================================================================== */

export type DialOnScreen = { x: number; y: number; r: number };

export type StrapScene = {
  /** draws the scene at progress p (0..1) now; skipped when nothing changed */
  render: (p: number) => void;
  /** re-reads the host's size; returns true when it changed */
  resize: () => boolean;
  /** the analog dial's centre and radius in CSS pixels of the host, as last drawn */
  dial: () => DialOnScreen | null;
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
  [0.2, PI + 0.85, 0.16], // the camera is back first, so the turn never sweeps under the copy
  [0.3, TAU + 0.6, 0.2], // the reveal: round to a three-quarter front, the module still in view
  [0.37, TAU + 0.7, 0.22],
  [0.52, TAU + 0.85, 0.36], // a little from above: the closed loop reads as a bracelet
  [0.6, TAU + 0.9, 0.3],
  [0.635, TAU + 0.62, 0.16],
  [0.685, TAU, 0], // the analog, straight on
  [0.775, TAU + 0.04, 0],
  [0.815, TAU + 0.4, 0.22],
  [0.86, TAU + 0.5, 0.24],
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
  const glow = floorGlow();
  glow.position.y = -box.getSize(new THREE.Vector3()).y / 2 - 0.004;
  scene.add(glow);

  // the camera's three subjects: the module's electrodes, the whole product, the analog dial
  const electrodes = ["electrode_LL1", "electrode_LL2", "electrode_RLD", "electrode_LA1", "electrode_LA2"].map(
    (n) => root.getObjectByName(n)!,
  );
  const dialMesh = root.getObjectByName("analog_dial") as THREE.Mesh;
  dialMesh.geometry.computeBoundingSphere();
  const dialLocalR = dialMesh.geometry.boundingSphere!.radius;

  const camera = new THREE.PerspectiveCamera(24, 1, 0.005, 5);
  const worldUp = new THREE.Vector3();
  const inv = new THREE.Matrix4();
  const V = new THREE.Vector3();
  const aim = new THREE.Vector3();
  const atMacro = new THREE.Vector3();
  const atDial = new THREE.Vector3();
  const edge = new THREE.Vector3();

  let drawn = -1; // the progress last drawn; -1 forces the next render
  let w = 1;
  let h = 1;
  let distFull = 1;
  let distMacro = 1;
  let distDial = 1;
  let dialShown: DialOnScreen | null = null;

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
    const out = easeInOut(span(0.37, 0.4, p));
    const rise = easeInCubic(span(0.395, 0.45, p));
    smartwatch.position.copy(FACE).multiplyScalar(out * UNCLIP).addScaledVector(up, rise * RISE);
    smartwatch.visible = rise < 0.999;

    // the strap alone closes into a bracelet, then opens again for the analog
    const closed = easeInOut(span(0.45, 0.52, p)) * (1 - easeInOut(span(0.56, 0.6, p)));
    closeLink(closed);
    link.visible = closed > 0.001;

    // the strap with the analog watch leaves together for the Cyphix watch
    const away = easeInCubic(span(0.795, 0.83, p));
    strap.position.copy(up).multiplyScalar(away * RISE_ALL);
    strap.visible = away < 0.999;

    // the analog: down from above, then click into the same strap
    const fall = 1 - easeOutCubic(span(0.575, 0.62, p));
    const clip = 1 - easeInOut(span(0.62, 0.64, p));
    analog.position.copy(FACE).multiplyScalar(clip * UNCLIP).addScaledVector(up, fall * RISE + away * RISE_ALL);
    analog.visible = p > 0.57 && away < 0.999;

    // the Cyphix watch: one piece, its electrodes in its own band, rising in from below as the
    // strap and the analog leave above, so the stage is never empty
    const arrive = 1 - easeOutCubic(span(0.8, 0.845, p));
    contour.position.copy(up).multiplyScalar(-arrive * RISE_ALL);
    contour.visible = p > 0.795;

    // the camera: close on the electrodes, out to the whole product, in to the dial, out again;
    // the distance blends in log space, so the move reads as one continuous dolly
    tilt.updateMatrixWorld(true);
    const wMacro = 1 - smooth(0.11, 0.2, p);
    const wDial = smooth(0.635, 0.685, p) * (1 - smooth(0.775, 0.815, p));
    const wFull = Math.max(0, 1 - wMacro - wDial);
    atMacro.set(0, 0, 0);
    electrodes.forEach((e) => atMacro.add(e.getWorldPosition(V)));
    atMacro.multiplyScalar(1 / electrodes.length);
    dialMesh.getWorldPosition(atDial);
    aim.copy(atMacro).multiplyScalar(wMacro).addScaledVector(atDial, wDial);
    const dist = Math.exp(wMacro * Math.log(distMacro) + wFull * Math.log(distFull) + wDial * Math.log(distDial));
    camera.position.set(aim.x, aim.y, aim.z + dist);
    camera.lookAt(aim);
    camera.updateMatrixWorld(true);
  };

  const measureDial = (): DialOnScreen | null => {
    if (!analog.visible) return null;
    dialMesh.getWorldPosition(atDial);
    const r = dialLocalR * dialMesh.matrixWorld.getMaxScaleOnAxis();
    edge.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(r).add(atDial);
    const c = atDial.clone().project(camera);
    const e = edge.project(camera);
    const x = ((c.x + 1) / 2) * w;
    const y = ((1 - c.y) / 2) * h;
    return { x, y, r: Math.hypot(((e.x + 1) / 2) * w - x, ((1 - e.y) / 2) * h - y) };
  };

  const render = (p: number) => {
    const next = clamp01(p);
    if (Math.abs(next - drawn) < 1e-5) return;
    drawn = next;
    pose(next);
    renderer.render(scene, camera);
    dialShown = measureDial();
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
    // the module close, still whole; the dial at ~42% of the height (half a phone's width), so
    // the lead axes drawn over it reach well past the case
    distMacro = distFull * 0.5;
    const dialR = dialLocalR * dialMesh.matrixWorld.getMaxScaleOnAxis();
    distDial = wide ? dialR / tan / 0.42 : dialR / (tan * aspect) / 0.5;
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
    dial: () => dialShown,
    dispose: () => {
      scene.environment?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

// v0.27.0 — the journey: a dark close-up of the electrodes found by a sweep of light, the pull-back reveal, the product larger (~88% of the stage), the camera round to the analog face straight on for the six leads, the Cyphix watch, then the page's day scene
// v0.26.0 — smooth scroll: drawn in the caller's frame (render(p)), every shader compiled and every texture uploaded before the visitor arrives, the build in short steps, 1.5x pixel cap, no canvas reset on unchanged resizes
// v0.10.0 — the strap closes by growing from its cut ends, not by a dropped-in link
// v0.10.0 — four ways to wear it: smartwatch → the strap closes into a bracelet → analog → the Cyphix watch (the Contour)
// v0.8.0 — the "One strap. Any watch." scene: studio-dressed GLB; the watch unclips and rises out, the analog comes down and clicks in, all opaque
