// OFRIDANCE — 3D view of the stage (three.js, loaded on demand).
// Each dancer shows where she faces; a click on a dancer puts the camera in her eyes.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const SW = 16, SD = 10; // stage width and depth
const D2R = Math.PI / 180;
export function mount(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#070707');
  scene.fog = new THREE.Fog('#070707', 26, 60);
  const cam = new THREE.PerspectiveCamera(42, 16 / 9, 0.05, 200);
  cam.position.set(0, 9, 17);
  const controls = new OrbitControls(cam, renderer.domElement);
  controls.target.set(0, 0.8, 0); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = 4; controls.maxDistance = 40;

  // floor boards
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#1e1c1a'; x.fillRect(0, 0, 512, 512);
  for (let r = 0; r < 16; r++) { x.fillStyle = r % 2 ? '#22201d' : '#1b1917'; x.fillRect(0, r * 32, 512, 31); x.fillStyle = '#121110'; x.fillRect(((r * 97) % 512), r * 32, 2, 31); }
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 2); tex.colorSpace = THREE.SRGBColorSpace;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(SW, 0.3, SD), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
  floor.position.y = -0.15; floor.receiveShadow = true; scene.add(floor);
  const apron = new THREE.Mesh(new THREE.BoxGeometry(SW, 0.3, 0.12), new THREE.MeshStandardMaterial({ color: '#d92b21' }));
  apron.position.set(0, -0.14, SD / 2 + 0.06); scene.add(apron);
  // curtains: back drop and wings
  const red = new THREE.MeshStandardMaterial({ color: '#5c0f0b', roughness: 0.9 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(SW + 4, 8), new THREE.MeshStandardMaterial({ color: '#0d0d0d' })); back.position.set(0, 4, -SD / 2 - 0.5); scene.add(back);
  for (const side of [-1, 1]) for (let k = 0; k < 3; k++) {
    const wing = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 7, 10, 1, true), red);
    wing.position.set(side * (SW / 2 + 0.4), 3.5, -SD / 2 + 1 + k * 3.2); scene.add(wing);
    const wing2 = wing.clone(); wing2.position.x += side * 0.55; wing2.position.z += 0.5; scene.add(wing2);
  }
  // spike marks
  for (let i = 1; i < 8; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(i === 4 ? 0.12 : 0.06, 0.02, 0.4), new THREE.MeshBasicMaterial({ color: i === 4 ? '#d92b21' : '#777' })); m.position.set(-SW / 2 + (i / 8) * SW, 0.01, SD / 2 - 0.3); scene.add(m); }

  // the house: rows of seats, a few people, and the front-of-house lights the dancers look into
  const houseFloor = new THREE.Mesh(new THREE.PlaneGeometry(40, 26), new THREE.MeshStandardMaterial({ color: '#0c0c0c', roughness: 1 }));
  houseFloor.rotation.x = -Math.PI / 2; houseFloor.position.set(0, -1.2, SD / 2 + 13.5); scene.add(houseFloor);
  const seatGeo = new THREE.BoxGeometry(0.62, 0.9, 0.6), seatMat = new THREE.MeshStandardMaterial({ color: '#2a0806', roughness: 0.95 });
  const headGeo = new THREE.SphereGeometry(0.17, 12, 10), headMat = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 1 });
  const seats = new THREE.InstancedMesh(seatGeo, seatMat, 14 * 22), heads = new THREE.InstancedMesh(headGeo, headMat, 14 * 22);
  const m4 = new THREE.Matrix4(); let si = 0, hi = 0;
  for (let row = 0; row < 14; row++) for (let k = 0; k < 22; k++) {
    const z = SD / 2 + 2.2 + row * 1.05, xx = (k - 10.5) * 0.78, yy = -1.2 + 0.45 + row * 0.16;
    m4.makeTranslation(xx, yy, z); seats.setMatrixAt(si++, m4);
    if ((row * 7 + k * 3) % 5 !== 0) { m4.makeTranslation(xx, yy + 0.78, z - 0.05); heads.setMatrixAt(hi++, m4); }
  }
  heads.count = hi; scene.add(seats); scene.add(heads);
  for (let k = 0; k < 6; k++) {
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.22, 18), new THREE.MeshBasicMaterial({ color: '#fff4e0' }));
    lamp.position.set(-5 + k * 2, 6.2, SD / 2 + 15); lamp.lookAt(0, 1, 0); scene.add(lamp);
  }
  const exit = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.35), new THREE.MeshBasicMaterial({ color: '#2fbf5a' }));
  exit.position.set(9, 3.2, SD / 2 + 18); exit.lookAt(0, 3.2, 0); scene.add(exit);
  scene.add(new THREE.HemisphereLight('#ffffff', '#1a1a1a', 0.35));
  const key = new THREE.SpotLight('#fff1dc', 1100, 70, Math.PI / 4.5, 0.55, 1.5); key.position.set(-5, 15, 11); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key); scene.add(key.target);
  const rim = new THREE.SpotLight('#ff4a3d', 520, 50, Math.PI / 5, 0.6, 1.6); rim.position.set(7, 10, -6); scene.add(rim);

  const figs = new Map();
  function figure(color, name) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.45 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.0, 6, 14), mat); body.position.y = 0.95; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 16), mat); head.position.y = 1.86; head.castShadow = true; g.add(head);
    // the "nose": a cone in front of the head shows where she faces
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.34, 14), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 }));
    nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.86, 0.32); g.add(nose);
    // a pool of light on the floor
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.95, 32), new THREE.MeshBasicMaterial({ color: '#fff1dc', transparent: true, opacity: 0.12, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = 0.012; g.add(pool);
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96; const t = cv.getContext('2d');
    t.font = '600 52px "IBM Plex Sans Hebrew", Arial'; t.fillStyle = '#fff'; t.textAlign = 'center'; t.textBaseline = 'middle'; t.direction = 'rtl'; t.fillText(name, 128, 48);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false }));
    label.scale.set(1.6, 0.6, 1); label.position.y = 2.55; g.add(label);
    g.userData = { mat, label, name, body, head };
    return g;
  }
  function update(dancers, pos) {
    const seen = new Set();
    dancers.forEach((d) => {
      seen.add(d.id);
      let f = figs.get(d.id);
      if (!f || f.userData.name !== d.name) { if (f) scene.remove(f); f = figure(d.color, d.name); f.userData.id = d.id; figs.set(d.id, f); scene.add(f); }
      f.userData.mat.color.set(d.color);
      const p = pos[d.id] || [0.5, 0.5, 0];
      f.position.set((p[0] - 0.5) * (SW - 1.2), 0, (p[1] - 0.5) * (SD - 1));
      f.rotation.y = -(p[2] || 0) * D2R;
      f.visible = !(pov && pov.id === d.id);
    });
    for (const [id, f] of figs) if (!seen.has(id)) { scene.remove(f); figs.delete(id); }
  }

  // point of view: click a dancer to see the stage through her eyes
  let pov = null; const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  const hint = document.createElement('div'); hint.className = 'pov-hint'; host.appendChild(hint);
  const back3 = document.createElement('button'); back3.type = 'button'; back3.className = 'chip pov-back'; back3.textContent = 'חזרה למבט כללי'; back3.hidden = true; host.appendChild(back3);
  const setHint = () => { hint.textContent = pov ? `המבט של ${figs.get(pov.id)?.userData.name || ''}. כך היא רואה את הבמה ואת הקהל.` : 'לחצו על רקדנית כדי לראות את הבמה מהעיניים שלה. גררו כדי לסובב.'; back3.hidden = !pov; };
  setHint();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects([...figs.values()].flatMap((g) => [g.userData.body, g.userData.head]))[0];
    if (hit) { const g = hit.object.parent; pov = { id: g.userData.id }; figs.forEach((f) => { f.visible = f !== g; }); controls.enabled = false; setHint(); }
  });
  back3.addEventListener('click', () => { pov = null; figs.forEach((f) => { f.visible = true; }); controls.enabled = true; cam.position.set(0, 9, 17); controls.target.set(0, 0.8, 0); setHint(); });

  const resize = () => { const w = host.clientWidth, h = host.clientHeight || w * 0.6; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(host); resize();
  let on = true; const eye = new THREE.Vector3(), look = new THREE.Vector3(), dir = new THREE.Vector3();
  const loop = () => {
    if (!on) return;
    if (pov && figs.get(pov.id)) {
      const g = figs.get(pov.id); g.getWorldDirection(dir);
      eye.set(g.position.x, 1.8, g.position.z).addScaledVector(dir, 0.3);
      look.copy(eye).addScaledVector(dir, 6); look.y = 1.2;
      cam.position.lerp(eye, 0.18); controls.target.lerp(look, 0.18); cam.lookAt(controls.target);
    } else controls.update();
    renderer.render(scene, cam); requestAnimationFrame(loop);
  };
  loop();
  return { update, dispose() { on = false; ro.disconnect(); renderer.dispose(); renderer.domElement.remove(); hint.remove(); back3.remove(); } };
}
