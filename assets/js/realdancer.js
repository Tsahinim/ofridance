// OFRIDANCE — a rigged 3D dancer driven by real motion capture (AIST++ street dance, CMU modern dance).
// Each clip stores, per frame, the pelvis position and the world orientation of 20 body segments.
// The player maps every segment onto the model's own rest pose, so the recording plays on her body as it was danced.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

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
// Two dancers built in Blender from MakeHuman (one body, dressed twice): street clothes and a ponytail for hip-hop,
// a studio top, soft trousers, bare feet and a bun for modern. Each outfit is its own rigged model.
const MODELS = { hiphop: 'models/dancer-hiphop.glb', modern: 'models/dancer-modern.glb' };
const models = {};
function loadModel(name) {
  const src = MODELS[name] || MODELS.hiphop;
  if (!models[src]) {
    const get = () => new GLTFLoader().loadAsync(BASE + src);
    models[src] = get().catch(() => new Promise((ok) => setTimeout(ok, 600)).then(get)).catch((e) => { delete models[src]; throw e; });
  }
  return models[src];
}

// skin and cloth are solid; hair, brows and lashes are cut-outs (sorted blending would flicker on a moving body)
function tuneMaterial(m) {
  const n = (m.name || '').toLowerCase();
  const cutout = /hair|ponytail|bun|braid|eyebrow|eyelash/.test(n);
  m.transparent = false; m.depthWrite = true;
  m.alphaTest = cutout ? 0.45 : 0;
  m.side = cutout ? THREE.DoubleSide : THREE.FrontSide;
  // one dancer in both outfits: the same warm skin and the same dark-brown hair
  if (/bun|braid/.test(n)) m.color.setRGB(0.24, 0.16, 0.12);
  if (/ponytail/.test(n)) m.color.setRGB(0.78, 0.62, 0.52);
  if (/crop_top/.test(n)) m.color.setRGB(0.74, 0.74, 0.74);
  if (/body/.test(n)) { m.color.setRGB(1, 0.86, 0.74); m.roughness = 0.62; m.metalness = 0; }
  else if (/eye/.test(n) && !cutout) { m.roughness = 0.25; }
  else { m.roughness = Math.max(0.75, m.roughness ?? 0.8); m.metalness = 0; }
  m.envMapIntensity = 0.55;
}

async function buildRig(name) {
  const gltf = await loadModel(name);
  const { clone } = await import('three/addons/utils/SkeletonUtils.js');
  const root = clone(gltf.scene);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; o.material = o.material.clone(); tuneMaterial(o.material); } });
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
  const rest = SEGS.map((seg) => {
    const b = bones[seg];
    const d = CHILD[seg] ? wp(CHILD[seg]).sub(wp(seg)) : UP.clone();
    return { b, qRest: b.getWorldQuaternion(new THREE.Quaternion()), qBasisInv: basisQuat(d).invert() };
  });
  const legLen = wp('LeftLeg').distanceTo(wp('LeftUpLeg')) + wp('LeftFoot').distanceTo(wp('LeftLeg'));
  // the head has no end bone: keep a point at the crown to measure how tall she reaches
  const crown = new THREE.Object3D(); bones.Head.add(crown);
  crown.position.copy(bones.Head.worldToLocal(new THREE.Vector3(0, box2.max.y - box2.min.y + 0.0, 0).setX(wp('Head').x).setZ(wp('Head').z)));
  bones.HeadTop_End = crown;
  // fingers: relax the flat rest pose into a soft natural curl
  for (const side of ['Left', 'Right']) for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) for (let i = 1; i <= 3; i++) {
    const b = bones[`${side}Hand${f}${i}`]; if (!b) continue;
    b.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), i === 1 ? 0.35 : 0.45));
  }
  return { root, bones, rest, legLen, hipRest: wp('Hips'), wp, fitCache: new WeakMap() };
}

export async function createRealDancer(opts = {}) {
  // a stable holder: the page keeps this object while the outfits change inside it
  const holder = new THREE.Group();
  const rigs = {};
  let rig = null, root = null, bones = null, rest = null, legLen = 1, wp = null, outfit = null;
  async function setOutfit(name) {
    if (!MODELS[name]) name = 'hiphop';
    if (!rigs[name]) rigs[name] = buildRig(name).catch((e) => { delete rigs[name]; throw e; });
    const r = await rigs[name];
    if (rig) holder.remove(rig.root);
    rig = r; ({ root, bones, rest, legLen, wp } = r); outfit = name;
    holder.add(root);
    if (clip) { const id = clip.id; clip = null; await setClip(id); }
  }
  let clip = null, floor = 0, k = 1, offsets = null;
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qw = new THREE.Quaternion(), qp = new THREE.Quaternion();
  const v = new THREE.Vector3(), v2 = new THREE.Vector3();

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
    else if (offsets) { v.x += offsets[2 * f0] + (offsets[2 * f1] - offsets[2 * f0]) * a; v.z += offsets[2 * f0 + 1] + (offsets[2 * f1 + 1] - offsets[2 * f0 + 1]) * a; }
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
  // keep planted feet planted: our body is not the recorded dancer's, so the recorded hip path makes the feet
  // skate a little. Wherever a foot is down and still, move the hips so that foot stays exactly where it landed.
  function footLock(c) {
    const n = c.n, feet = [[], []], foot = (toe, ank) => { const a = wp(toe), b = wp(ank); return [(a.x + b.x) / 2, Math.min(a.y, b.y - 0.07), (a.z + b.z) / 2]; };
    for (let f = 0; f < n; f++) { pose(f / c.fps); feet[0].push(foot('LeftToeBase', 'LeftFoot')); feet[1].push(foot('RightToeBase', 'RightFoot')); }
    const off = new Float32Array(n * 2), anchor = [null, null]; let cx = 0, cz = 0;
    for (let f = 0; f < n; f++) {
      let sx = 0, sz = 0, m = 0;
      for (let s = 0; s < 2; s++) {
        const p = feet[s][f], q = feet[s][Math.max(0, f - 1)], still = Math.hypot(p[0] - q[0], p[2] - q[2]) < 0.025 && p[1] < 0.08;
        if (still) { if (!anchor[s]) anchor[s] = [p[0] + cx, p[2] + cz]; sx += anchor[s][0] - p[0]; sz += anchor[s][1] - p[2]; m++; } else anchor[s] = null;
      }
      if (m) { cx = sx / m; cz = sz / m; }
      off[2 * f] = cx; off[2 * f + 1] = cz;
    }
    // soften the corrections so the body never jerks
    const out = new Float32Array(n * 2), W = 4;
    for (let f = 0; f < n; f++) { let ax = 0, az = 0, cnt = 0; for (let j = -W; j <= W; j++) { const g = Math.min(n - 1, Math.max(0, f + j)); ax += off[2 * g]; az += off[2 * g + 1]; cnt++; } out[2 * f] = ax / cnt; out[2 * f + 1] = az / cnt; }
    return out;
  }
  async function setClip(id) {
    const c = await loadClip(id);
    clip = c; c.id = id; k = legLen / c.leg; offsets = null;
    const fitCache = rig.fitCache;
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
      floor = fl; offsets = null;
      fitCache.set(c, { floor: fl, top: Math.max(...tops) + fl + 0.12, r: r + 0.15, offsets: footLock(c) });
    }
    const fit = fitCache.get(c); floor = fit.floor; offsets = fit.offsets; c.fit = fit;
    pose(0);
    return c;
  }
  await setOutfit(opts.outfit || 'hiphop');
  return { root: holder, get bones() { return bones; }, setClip, pose, setOutfit, get outfit() { return outfit; }, get clip() { return clip; },
    get hipRest() { return rig.hipRest; }, hips: () => wp('Hips') };
}

// ---------- a little theatre to show her in ----------
// The camera always keeps the whole body in frame: it is fitted to the room the clip needs (jumps and arms included)
// and follows the dancer when she travels.
export function createViewer(host, { background = '#111111' } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(background);
  // soft light from every side, as in a studio with white walls, so skin and cloth read as real materials
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55;
  scene.fog = new THREE.Fog(background, 9, 22);
  scene.add(new THREE.HemisphereLight('#ffffff', '#4a4a4a', 1.1));
  const key = new THREE.DirectionalLight('#fff4e8', 2.4); key.position.set(2.5, 5, 4); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 4; key.shadow.bias = -0.0004; Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 }); scene.add(key); scene.add(key.target);
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
