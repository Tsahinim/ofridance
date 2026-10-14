// OFRIDANCE — 3D view of the stage (three.js, loaded on demand).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const SW = 16, SD = 10; // stage width and depth in metres-ish units
export function mount(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#0a0a0a');
  const cam = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 200);
  cam.position.set(0, 9, 17);
  const controls = new OrbitControls(cam, renderer.domElement);
  controls.target.set(0, 0.8, 0); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = 6; controls.maxDistance = 40;

  const floor = new THREE.Mesh(new THREE.BoxGeometry(SW, 0.3, SD), new THREE.MeshStandardMaterial({ color: '#1d1d1d', roughness: 0.85 }));
  floor.position.y = -0.15; floor.receiveShadow = true; scene.add(floor);
  const apron = new THREE.Mesh(new THREE.BoxGeometry(SW, 0.3, 0.12), new THREE.MeshStandardMaterial({ color: '#d92b21' }));
  apron.position.set(0, -0.14, SD / 2 + 0.06); scene.add(apron);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(SW, 6), new THREE.MeshStandardMaterial({ color: '#111' }));
  back.position.set(0, 3, -SD / 2); scene.add(back);
  // spike marks on the front edge
  for (let i = 1; i < 8; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(i === 4 ? 0.12 : 0.06, 0.02, 0.4), new THREE.MeshBasicMaterial({ color: i === 4 ? '#d92b21' : '#666' })); m.position.set(-SW / 2 + (i / 8) * SW, 0.01, SD / 2 - 0.3); scene.add(m); }

  scene.add(new THREE.HemisphereLight('#ffffff', '#222', 0.55));
  const key = new THREE.SpotLight('#fff3e6', 900, 60, Math.PI / 5, 0.5, 1.6); key.position.set(-6, 14, 10); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key); scene.add(key.target);
  const rim = new THREE.SpotLight('#ff5a4f', 500, 50, Math.PI / 5, 0.6, 1.6); rim.position.set(7, 10, -6); scene.add(rim);

  const figs = new Map();
  function figure(color, name) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.0, 6, 14), mat); body.position.y = 0.95; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 16), mat); head.position.y = 1.86; head.castShadow = true; g.add(head);
    const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d');
    x.font = '600 52px "IBM Plex Sans Hebrew", Arial'; x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl'; x.fillText(name, 128, 48);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
    label.scale.set(1.6, 0.6, 1); label.position.y = 2.5; g.add(label);
    g.userData = { mat, label, name };
    return g;
  }
  function update(dancers, pos) {
    const seen = new Set();
    dancers.forEach((d) => {
      seen.add(d.id);
      let f = figs.get(d.id);
      if (!f || f.userData.name !== d.name) { if (f) scene.remove(f); f = figure(d.color, d.name); figs.set(d.id, f); scene.add(f); }
      f.userData.mat.color.set(d.color);
      const p = pos[d.id] || [0.5, 0.5];
      f.position.set((p[0] - 0.5) * (SW - 1.2), 0, (p[1] - 0.5) * (SD - 1));
    });
    for (const [id, f] of figs) if (!seen.has(id)) { scene.remove(f); figs.delete(id); }
  }
  const resize = () => { const w = host.clientWidth, h = host.clientHeight || w * 0.6; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(host); resize();
  let on = true;
  const loop = () => { if (!on) return; controls.update(); renderer.render(scene, cam); requestAnimationFrame(loop); };
  loop();
  return { update, dispose() { on = false; ro.disconnect(); renderer.dispose(); renderer.domElement.remove(); } };
}
