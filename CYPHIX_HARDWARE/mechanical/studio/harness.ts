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
  up?: [number, number, number];         // CAD direction that is "up" in the picture (default: the studio's up)
  fov: number;
  ground?: number | null;                // CAD height (along "up") of the shadow plane, or null for none
  hide?: string[];                       // name prefixes
  ghost?: Record<string, number>;        // name prefix -> opacity
  exposure?: number;
  strips?: { w: number; h: number; intensity: number; pos: [number, number, number] }[];
  palette?: Record<string, Record<string, number>>;   // material name -> overrides (colourways of the premium variant)
  env?: "light" | "night";                             // night: a black set lit only by the strips
  bg?: "light" | "apple" | "night" | "none";          // what the picture sits on ("none": transparent, for a composite)
};

const P = THREE.MeshPhysicalMaterial;
const SPEC: Record<string, THREE.MeshPhysicalMaterialParameters> = {
  // the island: graphite, as in the owner's render - near-black with a soft gloss
  body: { color: 0x16181d, metalness: 0, roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.14 },
  // the plates' faces: the same 316L steel, bead-blasted to a satin grey (the polished edge is "electrode")
  electrode_satin: { color: 0xaab0b9, metalness: 1, roughness: 0.42 },
  steel_dark: { color: 0x50555e, metalness: 1, roughness: 0.22 },
  // sapphire over the PPG sensor: dark, polished, and just see-through enough to show what is behind it
  glass: { color: 0x0b1019, metalness: 0, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.66 },
  led_green: { color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.55, metalness: 0, roughness: 0.3 },
  pd: { color: 0x241c3a, metalness: 0.2, roughness: 0.15, clearcoat: 1 },
  tpad: { color: 0x8d97a5, metalness: 0, roughness: 0.85 },
  // the same polished steel the landing page model uses for its electrodes
  electrode: { color: 0xf7f9fc, metalness: 1, roughness: 0.13, clearcoat: 0.6, clearcoatRoughness: 0.05 },
  steel: { color: 0xe0e4ea, metalness: 1, roughness: 0.1 },
  gold: { color: 0xd6ad4f, metalness: 1, roughness: 0.2 },
  // fluoroelastomer in the slate blue-grey of the owner's render
  fkm: { color: 0x4f5c77, metalness: 0, roughness: 0.6, sheen: 0.6, sheenColor: new THREE.Color(0xa8b5cf), sheenRoughness: 0.6, clearcoat: 0.08, clearcoatRoughness: 0.6 },
  // hook-and-loop, laminated flush: the loops a soft navy textile, the hooks a darker, drier layer
  loop: { color: 0x4a5671, metalness: 0, roughness: 0.95, sheen: 1, sheenColor: new THREE.Color(0xa8b5cf), sheenRoughness: 0.8 },
  hook: { color: 0x323b4e, metalness: 0, roughness: 0.82, sheen: 0.4, sheenColor: new THREE.Color(0x6f7b96), sheenRoughness: 0.7 },
  polyimide: { color: 0xc98a2b, metalness: 0, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.2 },
  copper: { color: 0xe48a4a, metalness: 1, roughness: 0.3 },
  copper_dim: { color: 0xa86a45, metalness: 1, roughness: 0.4 },
  anchor: { color: 0xdfe2e6, metalness: 0, roughness: 0.55 },
  pcb: { color: 0x10573d, metalness: 0, roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.3 },
  chip: { color: 0x16181c, metalness: 0, roughness: 0.45 },
  connector: { color: 0xe9e6dc, metalness: 0, roughness: 0.5 },
  shield: { color: 0xc9ccd2, metalness: 1, roughness: 0.32 },
  cell: { color: 0xbfc3ca, metalness: 0.85, roughness: 0.42 },
  led: { color: 0xeaf4ff, emissive: 0x9cc8ff, emissiveIntensity: 0.55, metalness: 0, roughness: 0.25 },
  dock_metal: { color: 0xdfe2e7, metalness: 1, roughness: 0.4 },
  dock_pad: { color: 0x1a1d22, metalness: 0, roughness: 0.85 },
  wrist: { color: 0xe3e6ea, metalness: 0, roughness: 0.95 },
  // premium variant (band_premium.py): black polished ceramic centre of the wrist face, polished ring, flush contacts
  back: { color: 0x0b0c0f, metalness: 0, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04 },
  ring: { color: 0xf1f3f6, metalness: 1, roughness: 0.07 },
  contact: { color: 0xe6e8ec, metalness: 1, roughness: 0.12 },
};

/** A black set lit only by the given softboxes: the dark product shot. */
function nightEnvironment(renderer: THREE.WebGLRenderer, strips: NonNullable<Shot["strips"]>) {
  const set = new THREE.Scene();
  set.add(new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), new THREE.MeshBasicMaterial({ color: 0x050506, side: THREE.BackSide })));
  strips.forEach((st) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(st.w, st.h), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(st.intensity), side: THREE.DoubleSide }));
    m.position.set(...st.pos);
    m.lookAt(0, 0, 0);
    set.add(m);
  });
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(set, 0.02).texture;
  pmrem.dispose();
  return tex;
}

const MM = 0.001;
const mark = (step: string) => { document.title = step; };

async function main() {
  // "#hero" reads shots.json; "#p:hero" reads shots_p.json (the premium variant's shots)
  const hash = location.hash.slice(1) || "hero";
  const [set, name] = hash.includes(":") ? hash.split(":") : ["", hash];
  const shots: Record<string, Shot> = await (await fetch(set ? `shots_${set}.json` : "shots.json")).json();
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
  scene.environment = shot.env === "night" ? nightEnvironment(renderer, shot.strips ?? []) : studioEnvironment(renderer, "light", shot.strips ?? []);

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
    const mat = new P({ ...(SPEC[key] ?? SPEC.body), ...(shot.palette?.[key] ?? {}) });
    mat.name = key;
    if (mat.transparent) { mat.depthWrite = false; mesh.renderOrder = 1; }
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
  if (shot.up) camera.up.copy(new THREE.Vector3(...shot.up).applyQuaternion(root.quaternion));
  else camera.up.set(0, 1, 0);
  camera.lookAt(toWorld(shot.target));

  if (shot.ground !== null && shot.ground !== undefined) {
    // "ground" is given as a CAD height along the up direction
    const y = (shot.orient === "wrist" ? -shot.ground : shot.ground) * MM;
    const ghosts: THREE.Object3D[] = [];
    root.traverse((o) => { if (o.userData.ghost) ghosts.push(o); });
    ghosts.forEach((o) => (o.visible = false));
    const sh = contactShadow(renderer, scene, root, { size: 0.3, y, darkness: shot.bg === "night" ? 0.75 : 0.42, blur: 2.6, height: 0.16 });
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
  if (shot.bg !== "none") {
    const bg = g.createRadialGradient(W * 0.5, H * 0.38, 0, W * 0.5, H * 0.38, Math.hypot(W, H) * 0.62);
    if (shot.bg === "night") { bg.addColorStop(0, "#26282c"); bg.addColorStop(0.6, "#111214"); bg.addColorStop(1, "#050506"); }
    else if (shot.bg === "apple") { bg.addColorStop(0, "#fdfdfe"); bg.addColorStop(0.6, "#f5f5f7"); bg.addColorStop(1, "#e9e9ed"); }
    else { bg.addColorStop(0, "#ffffff"); bg.addColorStop(0.55, "#f4f6f9"); bg.addColorStop(1, "#e4e8ee"); }
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
  }
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
// v3.2.0 - premium variant support: shots_<set>.json via #set:name, per-shot palettes (colourways), a night set, Apple-grey / night / transparent backgrounds, ceramic back, ring and contact materials; v3.1 shots unchanged
