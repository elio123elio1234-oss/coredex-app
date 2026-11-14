/* Still renders of the Band alpha design model, lit by the landing page's own studio.
   One shot per page load: render.html#<shot name>. Shots come from shots.json, which
   render_id.py writes from the CAD numbers. Coordinates in shots are CAD millimetres. */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { studioEnvironment, contactShadow } from "../../../LANDING PAGE/src/lib/studio";

type Shot = {
  files: string[];
  orient: "wrist" | "island";            // which way is up: the wrist above the island, or the island on top
  pos: [number, number, number];
  target: [number, number, number];
  fov: number;
  ground?: number | null;                // CAD height (along "up") of the shadow plane, or null for none
  hide?: string[];                       // name prefixes
  ghost?: Record<string, number>;        // name prefix -> opacity
  exposure?: number;
  strips?: { w: number; h: number; intensity: number; pos: [number, number, number] }[];
};

const P = THREE.MeshPhysicalMaterial;
const SPEC: Record<string, THREE.MeshPhysicalMaterialParameters> = {
  // the island: an insulating body, satin, deep navy
  body: { color: 0x1b2743, metalness: 0, roughness: 0.34, clearcoat: 0.55, clearcoatRoughness: 0.22 },
  body_gloss: { color: 0x1b2740, metalness: 0, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 },
  // the same polished steel the landing page model uses for its electrodes
  electrode: { color: 0xf7f9fc, metalness: 1, roughness: 0.13, clearcoat: 0.6, clearcoatRoughness: 0.05 },
  steel: { color: 0xe0e4ea, metalness: 1, roughness: 0.1 },
  gold: { color: 0xd6ad4f, metalness: 1, roughness: 0.2 },
  // fluoroelastomer, as on the landing page's own watch band
  fkm: { color: 0x262b36, metalness: 0, roughness: 0.5, sheen: 0.6, sheenColor: new THREE.Color(0x8d9ab0), sheenRoughness: 0.55, clearcoat: 0.15, clearcoatRoughness: 0.5 },
  polyimide: { color: 0xc98a2b, metalness: 0, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.2 },
  copper: { color: 0xe48a4a, metalness: 1, roughness: 0.3 },
  copper_dim: { color: 0xa86a45, metalness: 1, roughness: 0.4 },
  anchor: { color: 0xdfe2e6, metalness: 0, roughness: 0.55 },
  pcb: { color: 0x10573d, metalness: 0, roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.3 },
  chip: { color: 0x16181c, metalness: 0, roughness: 0.45 },
  connector: { color: 0xe9e6dc, metalness: 0, roughness: 0.5 },
  shield: { color: 0xc9ccd2, metalness: 1, roughness: 0.32 },
  cell: { color: 0xbfc3ca, metalness: 0.85, roughness: 0.42 },
  led: { color: 0xffffff, emissive: 0xbfe0ff, emissiveIntensity: 0.9, metalness: 0, roughness: 0.3 },
  dock_metal: { color: 0xdfe2e7, metalness: 1, roughness: 0.4 },
  dock_pad: { color: 0x1a1d22, metalness: 0, roughness: 0.85 },
  wrist: { color: 0xe3e6ea, metalness: 0, roughness: 0.95 },
};

const MM = 0.001;
const mark = (step: string) => { document.title = step; };

async function main() {
  const name = location.hash.slice(1) || "hero";
  const shots: Record<string, Shot> = await (await fetch("shots.json")).json();
  const shot = shots[name];
  if (!shot) throw new Error(`no shot "${name}"`);

  const canvas = document.getElementById("c") as HTMLCanvasElement;
  const W = canvas.width, H = canvas.height;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = shot.exposure ?? 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  mark("renderer");
  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer, "light", shot.strips ?? []);

  mark("environment");
  // CAD is Z-out-of-the-leg-face; the studio is Y-up
  const root = new THREE.Group();
  root.rotation.x = shot.orient === "wrist" ? Math.PI / 2 : -Math.PI / 2;
  scene.add(root);

  const loader = new GLTFLoader();
  for (const file of shot.files) {
    const gltf = await loader.loadAsync(file);
    root.add(gltf.scene);
  }
  root.updateMatrixWorld(true);
  mark("loaded");

  const hidden = (n: string) => (shot.hide ?? []).some((p) => n.startsWith(p));
  const ghostOf = (n: string) => {
    let best = "", val: number | null = null;
    for (const [p, v] of Object.entries(shot.ghost ?? {})) if (n.startsWith(p) && p.length >= best.length) { best = p; val = v; }
    return val;
  };
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const part = mesh.name || mesh.parent?.name || "";
    if (hidden(part)) { mesh.visible = false; return; }
    if (!mesh.geometry.getAttribute("normal")) mesh.geometry = toCreasedNormals(mesh.geometry, 0.62);
    const key = (mesh.material as THREE.Material).name;
    const mat = new P(SPEC[key] ?? SPEC.body);
    mat.name = key;
    const g = ghostOf(part);
    if (g !== null) {
      mat.transparent = true;
      mat.opacity = g;
      mat.depthWrite = false;
      mat.side = THREE.DoubleSide;
      mesh.renderOrder = 2;
      mesh.userData.ghost = true;
    }
    mesh.material = mat;
  });

  mark("materials");
  const camera = new THREE.PerspectiveCamera(shot.fov, W / H, 0.005, 5);
  const toWorld = (v: [number, number, number]) => root.localToWorld(new THREE.Vector3(v[0] * MM, v[1] * MM, v[2] * MM));
  camera.position.copy(toWorld(shot.pos));
  camera.up.set(0, 1, 0);
  camera.lookAt(toWorld(shot.target));

  if (shot.ground !== null && shot.ground !== undefined) {
    // "ground" is given as a CAD height along the up direction
    const y = (shot.orient === "wrist" ? -shot.ground : shot.ground) * MM;
    const ghosts: THREE.Object3D[] = [];
    root.traverse((o) => { if (o.userData.ghost) ghosts.push(o); });
    ghosts.forEach((o) => (o.visible = false));
    const sh = contactShadow(renderer, scene, root, { size: 0.3, y, darkness: 0.42, blur: 2.6, height: 0.16 });
    sh.update();
    ghosts.forEach((o) => (o.visible = true));
  }
  mark("shadow");
  renderer.render(scene, camera);
  // The page hands the picture to the render script itself: the browser's own
  // screenshot switch never returned with this scene.
  const out = document.createElement("canvas");
  out.width = W; out.height = H;
  const g = out.getContext("2d")!;
  const bg = g.createRadialGradient(W * 0.5, H * 0.38, 0, W * 0.5, H * 0.38, Math.hypot(W, H) * 0.62);
  bg.addColorStop(0, "#ffffff"); bg.addColorStop(0.55, "#f4f6f9"); bg.addColorStop(1, "#e4e8ee");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.drawImage(canvas, 0, 0);
  const blob: Blob = await new Promise((res) => out.toBlob((b) => res(b!), "image/png"));
  await fetch("save/" + name, { method: "POST", body: blob });
  mark("done");
}

main().catch((e) => {
  document.title = "error";
  const pre = document.createElement("pre");
  pre.textContent = String(e && (e.stack || e));
  document.body.appendChild(pre);
});
// v1.0.0 - one still per page load, lit by the landing page's studio environment and contact shadow
