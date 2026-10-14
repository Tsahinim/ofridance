// OFRIDANCE — a rigged 3D dancer driven by real motion capture (AIST++ street dance, CMU modern dance).
// Each clip stores, per frame, the pelvis position and the world orientation of 20 body segments.
// The player maps every segment onto the model's own rest pose, so the recording plays on her body as it was danced.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const SEGS = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
  'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];
const CHILD = { Hips: null, Spine: 'Spine1', Spine1: 'Spine2', Spine2: 'Neck', Neck: 'Head', Head: null,
  LeftShoulder: 'LeftArm', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand', LeftHand: 'LeftHandMiddle1',
  RightShoulder: 'RightArm', RightArm: 'RightForeArm', RightForeArm: 'RightHand', RightHand: 'RightHandMiddle1',
  LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', LeftFoot: 'LeftToeBase', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot', RightFoot: 'RightToeBase' };
const UP = new THREE.Vector3(0, 1, 0), FWD = new THREE.Vector3(0, 0, 1);
const BASE = new URL('../', import.meta.url).href;

function basisQuat(d) {
  d = d.clone().normalize();
  const s = Math.abs(d.dot(FWD)) > 0.7 ? UP : FWD;
  const e2 = s.clone().addScaledVector(d, -s.dot(d)).normalize();
  const e3 = new THREE.Vector3().crossVectors(d, e2);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(d, e2, e3));
}

// ---------- clips ----------
const clipCache = new Map();
export function loadClip(id) {
  if (!clipCache.has(id)) {
    const get = () => fetch(`${BASE}mocap/${id}.json`).then((r) => { if (!r.ok) throw new Error('clip ' + id); return r.json(); });
    // one quiet retry: a dropped connection should not cost the dancer her move
    clipCache.set(id, get().catch(() => new Promise((ok) => setTimeout(ok, 600)).then(get)).then((c) => {
      const bin = atob(c.data); const buf = new Int16Array(bin.length / 2);
      for (let i = 0; i < buf.length; i++) { const lo = bin.charCodeAt(2 * i), hi = bin.charCodeAt(2 * i + 1); let v = lo | (hi << 8); if (v > 32767) v -= 65536; buf[i] = v; }
      c.frames = buf; c.stride = 3 + SEGS.length * 4; c.duration = c.n / c.fps; delete c.data;
      return c;
    }).catch((e) => { clipCache.delete(id); throw e; }));
  }
  return clipCache.get(id);
}

// ---------- outfits ----------
// One body, two outfits. Parts of the mesh are triangle ranges (found once by connectivity):
// sunglasses always come off so the face shows; the headphones stay for hip-hop only.
// Modern swaps the texture: the yellow street trousers become black studio trousers.
const PARTS = { glasses: [[16036, 17136], [20272, 21424]], headphones: [[21424, 27146]] };
const OUTFITS = {
  hiphop: { hide: ['glasses'], map: null },
  modern: { hide: ['glasses', 'headphones'], map: 'models/dancer-modern.png' },
};
const maps = {};
function outfitMap(src) {
  if (!maps[src]) {
    const get = () => new THREE.TextureLoader().loadAsync(BASE + src);
    maps[src] = get().catch(() => new Promise((ok) => setTimeout(ok, 600)).then(get))
      .then((t) => { t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; return t; })
      .catch((e) => { delete maps[src]; throw e; });
  }
  return maps[src];
}

let modelPromise = null;
function loadModel() {
  if (!modelPromise) modelPromise = new GLTFLoader().loadAsync(`${BASE}models/dancer.glb`);
  return modelPromise;
}

export async function createRealDancer(opts = {}) {
  const gltf = await loadModel();
  // every dancer gets its own copy of the skeleton
  const { clone } = await import('three/addons/utils/SkeletonUtils.js');
  const root = clone(gltf.scene);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; o.material = o.material.clone(); } });
  const bones = {};
  root.traverse((o) => { if (o.isBone) bones[o.name.replace(/^mixamorig:?/, '')] = o; });
  // normalise height to 1.66 m, feet on the floor
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root, true);
  root.scale.multiplyScalar(1.66 / (box.max.y - box.min.y));
  root.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(root, true);
  root.position.y -= box2.min.y;
  root.updateMatrixWorld(true);

  const wp = (n) => bones[n].getWorldPosition(new THREE.Vector3());
  const rest = SEGS.map((name) => {
    const b = bones[name];
    const d = CHILD[name] ? wp(CHILD[name]).sub(wp(name)) : UP.clone();
    return { b, qRest: b.getWorldQuaternion(new THREE.Quaternion()), qBasisInv: basisQuat(d).invert() };
  });
  const legLen = wp('LeftLeg').distanceTo(wp('LeftUpLeg')) + wp('LeftFoot').distanceTo(wp('LeftLeg'));
  const hipRest = wp('Hips');

  // fingers: relax the flat rest pose into a soft natural curl
  for (const side of ['Left', 'Right']) for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) for (let i = 1; i <= 3; i++) {
    const b = bones[`${side}Hand${f}${i}`]; if (!b) continue;
    b.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(side === 'Left' ? 1 : 1, 0, 0), i === 1 ? 0.35 : 0.45));
  }

  const meshes = []; root.traverse((m) => { if (m.isMesh) meshes.push(m); });
  for (const m of meshes) { m.geometry = m.geometry.clone(); m.userData.fullIndex = m.geometry.index.array.slice(); m.userData.map = m.material.map; }
  let outfit = null;
  async function setOutfit(name) {
    const o = OUTFITS[name] || OUTFITS.hiphop; outfit = name;
    const map = o.map ? await outfitMap(o.map) : null;
    const cut = o.hide.flatMap((p) => PARTS[p]);
    for (const m of meshes) {
      const full = m.userData.fullIndex, keep = [];
      let t = 0; const nt = full.length / 3;
      for (const [s0, s1] of [...cut].sort((p, q) => p[0] - q[0])) { for (; t < Math.min(s0, nt); t++) keep.push(full[3 * t], full[3 * t + 1], full[3 * t + 2]); t = Math.max(t, s1); }
      for (; t < nt; t++) keep.push(full[3 * t], full[3 * t + 1], full[3 * t + 2]);
      m.geometry.setIndex(keep);
      m.material.map = map || m.userData.map; m.material.needsUpdate = true;
    }
  }
  await setOutfit(opts.outfit || 'hiphop');

  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qw = new THREE.Quaternion(), qp = new THREE.Quaternion();
  const v = new THREE.Vector3(), v2 = new THREE.Vector3();
  let clip = null, floor = 0, k = 1;

  function frameQuat(c, f, s, out) {
    const o = f * c.stride + 3 + s * 4, F = c.frames;
    return out.set(F[o] / 32767, F[o + 1] / 32767, F[o + 2] / 32767, F[o + 3] / 32767).normalize();
  }
  function pose(t, travel = true) {
    if (!clip) return;
    const c = clip; const x = ((t * c.fps) % c.n + c.n) % c.n; const f0 = Math.floor(x), f1 = (f0 + 1) % c.n, a = x - f0;
    // pelvis
    const F = c.frames, o0 = f0 * c.stride, o1 = f1 * c.stride;
    v.set(F[o0] + (F[o1] - F[o0]) * a, F[o0 + 1] + (F[o1 + 1] - F[o0 + 1]) * a, F[o0 + 2] + (F[o1 + 2] - F[o0 + 2]) * a).multiplyScalar(k / 1000);
    if (f1 === 0) v.set(F[o0], F[o0 + 1], F[o0 + 2]).multiplyScalar(k / 1000);
    if (!travel) { v.x = 0; v.z = 0; }
    v.y += floor;
    // segments, parent first
    root.updateMatrixWorld(true);
    for (let s = 0; s < SEGS.length; s++) {
      const r = rest[s];
      frameQuat(c, f0, s, qa); frameQuat(c, f1, s, qb); if (qa.dot(qb) < 0) qb.set(-qb.x, -qb.y, -qb.z, -qb.w);
      qw.slerpQuaternions(qa, qb, a).multiply(r.qBasisInv).multiply(r.qRest);
      r.b.parent.getWorldQuaternion(qp);
      r.b.quaternion.copy(qp.invert().multiply(qw));
      if (s === 0) { v2.copy(v); r.b.parent.worldToLocal(v2); r.b.position.copy(v2); }
      r.b.updateMatrixWorld(true);
    }
  }
  const fitCache = new WeakMap();
  async function setClip(id) {
    const c = await loadClip(id);
    clip = c; k = legLen / c.leg;
    if (!fitCache.has(c)) {
      // sample the clip once: lift it so the lowest foot rests on the floor, and measure how much room the whole body needs
      floor = 0; const lows = [], tops = []; let r = 0;
      const ends = ['HeadTop_End', 'LeftHand', 'RightHand', 'LeftToeBase', 'RightToeBase', 'LeftForeArm', 'RightForeArm', 'LeftLeg', 'RightLeg'].filter((n) => bones[n]);
      for (let f = 0; f < c.n; f += 3) {
        pose(f / c.fps);
        lows.push(Math.min(wp('LeftToeBase').y, wp('RightToeBase').y, wp('LeftFoot').y - 0.07, wp('RightFoot').y - 0.07));
        const h = wp('Hips'); let top = 0;
        for (const n of ends) { const q = wp(n); top = Math.max(top, q.y); r = Math.max(r, Math.hypot(q.x - h.x, q.z - h.z)); }
        tops.push(top);
      }
      lows.sort((p, q) => p - q); const fl = -lows[Math.floor(lows.length * 0.05)];
      fitCache.set(c, { floor: fl, top: Math.max(...tops) + fl + 0.12, r: r + 0.15 });
    }
    const fit = fitCache.get(c); floor = fit.floor; c.fit = fit;
    pose(0);
    return c;
  }
  return { root, bones, setClip, pose, setOutfit, get outfit() { return outfit; }, get clip() { return clip; }, hipRest,
    hips: () => wp('Hips') };
}

// ---------- a little theatre to show her in ----------
// The camera always keeps the whole body in frame: it is fitted to the room the clip needs (jumps and arms included)
// and follows the dancer when she travels.
export function createViewer(host, { background = '#111111' } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(background);
  scene.fog = new THREE.Fog(background, 9, 22);
  scene.add(new THREE.HemisphereLight('#ffffff', '#4a4a4a', 2.1));
  const key = new THREE.DirectionalLight('#ffffff', 2.6); key.position.set(2.5, 5, 4); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 }); scene.add(key); scene.add(key.target);
  const fill = new THREE.DirectionalLight('#ffffff', 0.8); fill.position.set(-3, 2, 3); scene.add(fill);
  const rim = new THREE.DirectionalLight('#ff5a4c', 1.6); rim.position.set(-3, 3.5, -4); scene.add(rim);
  // a pool of light on a dark stage floor
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128); grd.addColorStop(0, '#3b3b3b'); grd.addColorStop(0.55, '#262626'); grd.addColorStop(1, background);
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const stage = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.MeshBasicMaterial({ map: tex }));
  stage.rotation.x = -Math.PI / 2; scene.add(stage);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.ShadowMaterial({ opacity: 0.45 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; shadow.receiveShadow = true; scene.add(shadow);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
  const target = new THREE.Vector3(0, 0.9, 0);
  let yaw = 0.45, dist = 5, want = 5, top = 1.9, r = 0.8, pitch = 0.1;
  function place() {
    const ch = target.y + Math.tan(pitch) * dist;
    camera.position.set(target.x + Math.sin(yaw) * dist, ch, target.z + Math.cos(yaw) * dist); camera.lookAt(target);
  }
  function solve() {
    // distance that fits the body's full height and its reach to the sides, with a margin
    const vt = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dh = (top / 2) * 1.1 / vt + 0.35, dw = Math.min(r, 1.1) * 0.85 / (vt * camera.aspect) + 0.35;
    want = Math.max(dh, dw, 2.4); target.y = top / 2 - 0.02;
  }
  function resize() { const w = host.clientWidth || 300, h = host.clientHeight || 400; renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; camera.aspect = w / h; camera.updateProjectionMatrix(); solve(); }
  resize(); dist = want; place();
  new ResizeObserver(resize).observe(host);
  // drag to walk around her
  let drag = null;
  renderer.domElement.style.touchAction = 'pan-y';
  renderer.domElement.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, yaw }; renderer.domElement.setPointerCapture(e.pointerId); });
  renderer.domElement.addEventListener('pointermove', (e) => { if (drag) { yaw = drag.yaw - (e.clientX - drag.x) * 0.01; place(); } });
  renderer.domElement.addEventListener('pointerup', () => { drag = null; });
  return {
    scene, camera, renderer, target, canvas: renderer.domElement,
    setYaw(y) { yaw = y; place(); }, get yaw() { return yaw; },
    fitTo(fit) { top = fit.top; r = fit.r; solve(); },
    snap(x, z) { target.x = x; target.z = z; dist = want; place(); },
    follow(x, z, dt = 1 / 60) {
      const kf = 1 - Math.exp(-dt * 5);
      target.x += (x - target.x) * kf; target.z += (z - target.z) * kf; dist += (want - dist) * kf;
      stage.position.set(target.x, 0, target.z); shadow.position.set(target.x, 0.002, target.z);
      key.position.set(target.x + 2.5, 5, target.z + 4); key.target.position.set(target.x, 0, target.z);
      place();
    },
    render() { renderer.render(scene, camera); },
    dispose() { renderer.dispose(); renderer.domElement.remove(); },
  };
}
