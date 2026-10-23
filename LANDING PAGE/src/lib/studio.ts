import * as THREE from "three";

/* ==================================================================
   The product studio, shared by the live scene (strapScene.ts) and the
   offline renders of the stills (same code, bundled for the render page):

   - studioEnvironment: a photographer's set built as a scene and baked to
     a PMREM — dark cyclorama, one big overhead softbox, two tall strip
     lights left and right, a low warm bounce — so polished metal shows
     long crisp highlights instead of a grey room.
   - dressModel: real materials by the export's material names, the
     CYPHIX wordmark on the watch screen, an analog dial with indices,
     and the strap's lug adapters moved from the smartwatch to the strap
     (so the strap alone has finished ends and any watch clips into them).
   - contactShadow: a soft shadow under the product from a blurred depth
     render seen from below.
   ================================================================== */

/** The CYPHIX wordmark (mirrors src/components/Logo.tsx, viewBox 0 0 346 72). */
const WORDMARK =
  "M65.36 19.19 C60.25 7.51 49.44 0.68 34.81 0.68 C14.92 0.68 0.31 15.76 0.31 36.3 C0.31 56.84 14.92 71.92 34.81 71.92 C49.47 71.92 60.29 65.07 65.39 53.35 L58.74 50.81 C54.64 60.21 46.19 65.69 34.81 65.69 C19.51 65.69 7.47 52.74 7.47 36.3 C7.47 19.86 19.51 6.91 34.81 6.91 C46.09 6.91 54.5 12.31 58.63 21.57Z M67.26 1.88 L75.36 1.88 L97.81 37.25 L120.03 1.88 L128.09 1.88 L101.42 44.33 L101.42 70.72 L94.22 70.72 L94.22 44.34Z M132.75 27.44 L132.75 24.68 C132.75 10 141.97 1.28 157.5 1.28 C173.03 1.28 182.26 10 182.26 24.68 C182.26 36.78 172.74 45.54 159.57 45.54 L154.27 45.54 C145.7 45.54 139.96 51.05 139.96 59.27 L139.96 70.72 L132.6 70.72 L132.6 59.27 C132.6 47.14 141.15 39.24 154.27 39.24 L159.57 39.24 C168.22 39.24 174.9 32.89 174.9 24.68 C174.9 13.86 168.51 7.58 157.5 7.58 C146.49 7.58 140.11 13.86 140.11 24.68 L140.11 27.44Z M201.59 32.17 L201.59 1.88 L194.43 1.88 L194.43 70.72 L201.59 70.72 L201.59 38.44 L243.38 38.44 L243.38 70.72 L250.54 70.72 L250.54 1.88 L243.38 1.88 L243.38 32.17Z M267.67 1.88 L274.82 1.88 L274.82 70.72 L267.67 70.72Z M344.19 1.88 L335.66 1.88 L315.17 29.47 L294.7 1.88 L286.03 1.88 L310.83 35.31 L284.54 70.72 L293.08 70.72 L315.1 41.06 L337.09 70.72 L345.77 70.72 L319.44 35.22Z";

/* ---------- the set ---------- */

export type Strip = { w: number; h: number; intensity: number; pos: [number, number, number] };

/** `strips`: extra narrow softboxes for a still, placed in a part's reflection angle
    (the polished electrodes need one to show a specular band on a light set). */
export function studioEnvironment(renderer: THREE.WebGLRenderer, mood: "light" | "dark" = "light", strips: Strip[] = []) {
  const set = new THREE.Scene();
  const walls = new THREE.Mesh(
    new THREE.SphereGeometry(10, 48, 24),
    new THREE.MeshBasicMaterial({ color: mood === "light" ? 0x6f7680 : 0x4a515c, side: THREE.BackSide }),
  );
  set.add(walls);
  const panel = (w: number, h: number, intensity: number, color: number, pos: [number, number, number]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    set.add(m);
  };
  panel(7, 5, 3.2, 0xffffff, [0, 6.5, 1.5]); // overhead softbox
  panel(1.2, 7, 4.5, 0xffffff, [-6, 1, 3]); // key strip, front left
  panel(1.0, 7, 3.4, 0xdfe8ff, [6.5, 0.5, -1.5]); // rim strip, back right
  panel(1.0, 6, 2.0, 0xe8eeff, [-5, 0.5, -5]); // back left kicker
  panel(8, 1.6, 0.9, 0xfff1e6, [0, -6, 2]); // low warm bounce
  panel(3.2, 1.4, 2.2, 0xffffff, [1.5, 3.2, 6.5]); // front-high fill: flat polished faces (the electrodes) catch a gradient
  strips.forEach((st) => panel(st.w, st.h, st.intensity, 0xffffff, st.pos));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(set, 0.02).texture;
  pmrem.dispose();
  set.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
  });
  return tex;
}

/* ---------- textures drawn in code ---------- */

function screenTexture() {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 800;
  const g = c.getContext("2d")!;
  g.fillStyle = "#050608";
  g.fillRect(0, 0, 640, 800);
  // the real wordmark, white, 230 px wide
  g.save();
  g.translate(70, 128);
  const s = 230 / 346;
  g.scale(s, s);
  g.fillStyle = "#ffffff";
  g.fill(new Path2D(WORDMARK));
  g.restore();
  g.fillStyle = "#9aa3b2";
  g.font = "500 36px Sora, Arial, sans-serif";
  g.fillText("6-lead ECG", 72, 236);
  g.fillStyle = "#f2574c";
  g.beginPath();
  g.arc(562, 150, 14, 0, Math.PI * 2);
  g.fill();
  const cols = ["#ff8c7c", "#f8b07a", "#eed37f", "#9ee0bd", "#8dcff1", "#bca7f6"];
  const amp = [1, 1.25, 0.55, -0.9, 0.35, 0.95];
  const beat = (t: number) => {
    const gauss = (m: number, sd: number, a: number) => a * Math.exp(-((t - m) ** 2) / (2 * sd * sd));
    return gauss(0.18, 0.025, 0.12) - gauss(0.36, 0.008, 0.18) + gauss(0.385, 0.01, 1) - gauss(0.41, 0.01, 0.28) + gauss(0.62, 0.05, 0.28);
  };
  for (let i = 0; i < 6; i++) {
    const y0 = 330 + i * 76;
    g.strokeStyle = cols[i];
    g.lineWidth = 5;
    g.lineJoin = "round";
    g.beginPath();
    for (let x = 0; x <= 500; x += 2) {
      const t = ((x / 500) * 3 + i * 0.07) % 1;
      const y = y0 - beat(t) * 46 * amp[i];
      if (x === 0) g.moveTo(70 + x, y);
      else g.lineTo(70 + x, y);
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  tex.anisotropy = 8;
  return tex;
}

function dialTexture() {
  const N = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d")!;
  const r = N / 2;
  const grad = g.createRadialGradient(r * 0.85, r * 0.75, r * 0.1, r, r, r);
  grad.addColorStop(0, "#f6f3ec");
  grad.addColorStop(1, "#e2ddd2");
  g.fillStyle = grad;
  g.fillRect(0, 0, N, N);
  g.translate(r, r);
  // minute track
  g.strokeStyle = "#2a2d33";
  for (let i = 0; i < 60; i++) {
    if (i % 5 === 0) continue;
    const a = (i / 60) * Math.PI * 2;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(Math.sin(a) * r * 0.9, -Math.cos(a) * r * 0.9);
    g.lineTo(Math.sin(a) * r * 0.85, -Math.cos(a) * r * 0.85);
    g.stroke();
  }
  // applied baton indices, double at 12
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.save();
    g.rotate(a);
    g.fillStyle = "#1d2027";
    const w = i % 3 === 0 ? 20 : 14;
    if (i === 0) {
      g.fillRect(-w - 6, -r * 0.88, w, r * 0.17);
      g.fillRect(6, -r * 0.88, w, r * 0.17);
    } else g.fillRect(-w / 2, -r * 0.88, w, r * (i % 3 === 0 ? 0.17 : 0.12));
    g.restore();
  }
  // small seconds sub-dial at 6
  g.strokeStyle = "#8a8d93";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(0, r * 0.42, r * 0.17, 0, Math.PI * 2);
  g.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.beginPath();
    g.moveTo(Math.sin(a) * r * 0.17, r * 0.42 - Math.cos(a) * r * 0.17);
    g.lineTo(Math.sin(a) * r * 0.14, r * 0.42 - Math.cos(a) * r * 0.14);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  tex.anisotropy = 8;
  return tex;
}

/** Planar UVs across a flat part (display, dial), facing its averaged normal. */
function planarUV(mesh: THREE.Mesh, square = false) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  geo.computeVertexNormals();
  const nor = geo.attributes.normal;
  const n = new THREE.Vector3();
  for (let i = 0; i < nor.count; i++) n.add(new THREE.Vector3().fromBufferAttribute(nor, i));
  n.normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const u = new THREE.Vector3().crossVectors(up, n).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();
  const P = new THREE.Vector3();
  const a: number[] = [];
  let umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    P.fromBufferAttribute(pos, i);
    const x = P.dot(u), y = P.dot(v);
    a.push(x, y);
    umin = Math.min(umin, x); umax = Math.max(umax, x); vmin = Math.min(vmin, y); vmax = Math.max(vmax, y);
  }
  if (square) {
    const cu = (umin + umax) / 2, cv = (vmin + vmax) / 2, h = Math.max(umax - umin, vmax - vmin) / 2;
    umin = cu - h; umax = cu + h; vmin = cv - h; vmax = cv + h;
  }
  const out = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    out[2 * i] = (a[2 * i] - umin) / (umax - umin);
    out[2 * i + 1] = 1 - (a[2 * i + 1] - vmin) / (vmax - vmin);
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(out, 2));
}

/* ---------- materials ---------- */

/** Moulded-silicone grain: a fine value-noise bump in the band's own object space,
    so it stays put as the strap turns (about 0.4 mm cells, a few pixels at page scale). */
function siliconeGrain(mat: THREE.MeshPhysicalMaterial) {
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>
        varying vec3 vObj;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        vObj = position;`);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vObj;
        float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float vnoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
          return mix(mix(mix(h3(i+vec3(0,0,0)),h3(i+vec3(1,0,0)),f.x), mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x), mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        vec3 q = vObj * 2600.0;
        vec3 g = vec3(vnoise(q + vec3(0.0, 13.1, 7.7)), vnoise(q + vec3(5.3, 0.0, 2.9)), vnoise(q + vec3(9.1, 4.4, 0.0))) - 0.5;
        normal = normalize(normal + g * 0.07);`,
      );
  };
  mat.customProgramCacheKey = () => "silicone-grain";
}

type Spec = THREE.MeshPhysicalMaterialParameters;
const SPEC: Record<string, Spec> = {
  watch_aluminum_generic: { color: 0xd3d7de, metalness: 1, roughness: 0.24, clearcoat: 0.2, clearcoatRoughness: 0.2 },
  system_titanium_brushed: { color: 0x6d747f, metalness: 1, roughness: 0.42 },
  electrode_steel_polished: { color: 0xf7f9fc, metalness: 1, roughness: 0.09, clearcoat: 1, clearcoatRoughness: 0.03 },
  glass_black: { color: 0x030405, metalness: 0, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.01 },
  ceramic_black: { color: 0x0c0d10, metalness: 0.1, roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.1 },
  insulator_dark: { color: 0x07080a, metalness: 0, roughness: 0.5 },
  ppg_green_emitter: { color: 0x0f5a2e, metalness: 0, roughness: 0.25, clearcoat: 1 },
  strap_silicone_slate: { color: 0x3d4b66, metalness: 0, roughness: 0.55, sheen: 0.7, sheenColor: new THREE.Color(0x9fb2d4), sheenRoughness: 0.6, clearcoat: 0.18, clearcoatRoughness: 0.45 },
  watch_steel_polished: { color: 0xe0e4ea, metalness: 1, roughness: 0.1 },
  watch_hands_dark_steel: { color: 0x15181d, metalness: 0.9, roughness: 0.2 },
  crystal_sapphire: { color: 0xffffff, metalness: 0, roughness: 0, transparent: true, opacity: 0.12, clearcoat: 1, clearcoatRoughness: 0 },
};

export type Dressed = { strap: THREE.Object3D; smartwatch: THREE.Object3D; analog: THREE.Object3D };

export function dressModel(root: THREE.Object3D): Dressed {
  const get = (name: string) => {
    const g = root.getObjectByName(name);
    if (!g) throw new Error(`model is missing "${name}"`);
    return g;
  };
  const strap = get("strap");
  const smartwatch = get("smartwatch");
  const analog = get("analog");

  // the lug adapters belong to the strap: the strap alone keeps finished ends, any watch clips in
  const adapters = smartwatch.children.filter((o) => /^strap_(housing|channel)_(12|6)/.test(o.name));
  adapters.forEach((o) => strap.attach(o));
  analog.children.filter((o) => /^strap_(housing|channel)/.test(o.name)).forEach((o) => (o.visible = false));

  const screen = screenTexture();
  const dial = dialTexture();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const old = mesh.material as THREE.MeshStandardMaterial;
    const name = old.name;
    let mat: THREE.Material;
    if (mesh.name === "watch_display") {
      mat = new THREE.MeshPhysicalMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: screen, emissiveIntensity: 1.05, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.02 });
    } else if (mesh.name.startsWith("analog_dial")) {
      planarUV(mesh, true);
      mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: dial, roughness: 0.5, metalness: 0, sheen: 0.3, sheenColor: new THREE.Color(0xffffff) });
    } else {
      const spec = SPEC[name];
      mat = spec ? new THREE.MeshPhysicalMaterial(spec) : old;
      if (name === "strap_silicone_slate") siliconeGrain(mat as THREE.MeshPhysicalMaterial);
    }
    mat.name = name;
    mesh.material = mat;
    mesh.castShadow = true;
  });
  return { strap, smartwatch, analog };
}

/* ---------- contact shadow ---------- */

/** A soft contact shadow on a plane under `target`, refreshed with `update()` (call once per frame). */
export function contactShadow(renderer: THREE.WebGLRenderer, scene: THREE.Scene, target: THREE.Object3D, opts: { size: number; y: number; darkness?: number; blur?: number; height?: number }) {
  const RES = 512;
  const size = opts.size;
  const group = new THREE.Group();
  group.position.y = opts.y;
  scene.add(group);
  const rt = new THREE.WebGLRenderTarget(RES, RES);
  const rtBlur = new THREE.WebGLRenderTarget(RES, RES);
  rt.texture.generateMipmaps = rtBlur.texture.generateMipmaps = false;
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size).rotateX(Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: rt.texture, transparent: true, opacity: opts.darkness ?? 0.55, depthWrite: false }),
  );
  plane.renderOrder = -1;
  plane.scale.y = -1;
  group.add(plane);
  const cam = new THREE.OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, 0, opts.height ?? size * 0.6);
  cam.rotation.x = Math.PI / 2;
  group.add(cam);
  const depth = new THREE.MeshDepthMaterial();
  depth.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );",
      "gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * 1.6 );",
    );
  };
  depth.depthTest = depth.depthWrite = false;
  const blurMat = (horizontal: boolean) =>
    new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, h: { value: 1 / RES } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: `uniform sampler2D tDiffuse; uniform float h; varying vec2 vUv;
        void main(){ vec4 s = vec4(0.0); float w[5]; w[0]=0.227; w[1]=0.1946; w[2]=0.1216; w[3]=0.054; w[4]=0.0162;
          s += texture2D(tDiffuse, vUv) * w[0];
          for(int i=1;i<5;i++){ vec2 o = ${horizontal ? "vec2(h*float(i),0.0)" : "vec2(0.0,h*float(i))"};
            s += texture2D(tDiffuse, vUv + o) * w[i]; s += texture2D(tDiffuse, vUv - o) * w[i]; }
          gl_FragColor = s; }`,
    });
  const hBlur = blurMat(true), vBlur = blurMat(false);
  // the blur quad lies flat like the shadow plane, facing the camera that looks up at it
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(Math.PI / 2), hBlur);
  quad.visible = false;
  group.add(quad);
  const blur = (amount: number) => {
    quad.visible = true;
    quad.material = hBlur;
    hBlur.uniforms.tDiffuse.value = rt.texture;
    hBlur.uniforms.h.value = amount / RES;
    renderer.setRenderTarget(rtBlur);
    renderer.render(quad, cam);
    quad.material = vBlur;
    vBlur.uniforms.tDiffuse.value = rtBlur.texture;
    vBlur.uniforms.h.value = amount / RES;
    renderer.setRenderTarget(rt);
    renderer.render(quad, cam);
    quad.visible = false;
  };
  return {
    update() {
      const bg = scene.background;
      const env = scene.environment;
      scene.background = null;
      scene.overrideMaterial = depth;
      const vis = plane.visible;
      plane.visible = false;
      const clear = renderer.getClearAlpha();
      renderer.setClearAlpha(0);
      renderer.setRenderTarget(rt);
      renderer.clear();
      renderer.render(scene, cam);
      scene.overrideMaterial = null;
      const b = opts.blur ?? 3;
      blur(b);
      blur(b * 0.5);
      renderer.setRenderTarget(null);
      renderer.setClearAlpha(clear);
      plane.visible = vis;
      scene.background = bg;
      scene.environment = env;
      void target;
    },
    group,
    dispose() {
      rt.dispose();
      rtBlur.dispose();
    },
  };
}

// v0.8.0 — review round 2: front-high fill, bright polished electrodes against satin titanium, silicone grain, a true contact shadow (height-limited)
// v0.8.0 — the product studio: softbox environment, dressed materials (real wordmark on the screen, analog dial), lug adapters on the strap, contact shadow
