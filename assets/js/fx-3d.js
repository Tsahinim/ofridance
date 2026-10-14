// OFRIDANCE formation app: the 3D view. The stage as a dark blue slab with its grid, dancers as coloured capsules,
// props as blocks; drag to walk around it.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function mount(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#30344f', 2.2));
  const sun = new THREE.DirectionalLight('#ffffff', 1.6); sun.position.set(-4, 9, 6); scene.add(sun);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.48; controls.minDistance = 4; controls.maxDistance = 40;
  let stageKey = '', stage = null;
  const dancers = new Map(), props = new Map();
  const capsule = new THREE.CapsuleGeometry(0.2, 0.75, 6, 16);

  function buildStage(st) {
    if (stage) { scene.remove(stage); stage.traverse((o) => o.geometry && o.geometry.dispose()); }
    stage = new THREE.Group();
    const W = st.w + 2 * (st.side ?? 1.5), D = st.d + (st.back ?? 1) + (st.front ?? 0.5);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(W, 0.25, D), new THREE.MeshStandardMaterial({ color: '#474b66', roughness: 0.9 }));
    slab.position.set(0, -0.125, -((st.d + (st.back ?? 1)) - (st.front ?? 0.5)) / 2 + 0); stage.add(slab);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(st.w, st.d), new THREE.MeshStandardMaterial({ color: '#272b47', roughness: 0.85 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.002, -st.d / 2); stage.add(floor);
    const pts = [], gs = st.grid || 1;
    for (let x = -Math.floor(W / 2 / gs) * gs; x <= W / 2; x += gs) pts.push(x, 0.006, -(st.d + (st.back ?? 1)), x, 0.006, st.front ?? 0.5);
    for (let z = -(st.d + (st.back ?? 1)); z <= (st.front ?? 0.5) + 1e-6; z += gs) pts.push(-W / 2, 0.006, z, W / 2, 0.006, z);
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    stage.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: '#5a5f80' })));
    const red = new THREE.LineBasicMaterial({ color: '#ef4b3f' });
    const mark = (a, b) => { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]); stage.add(new THREE.Line(g, red)); };
    mark([0, 0.01, st.front ?? 0.5], [0, 0.01, (st.front ?? 0.5) - 0.35]); mark([0, 0.01, -(st.d + (st.back ?? 1))], [0, 0.01, -(st.d + (st.back ?? 1)) + 0.35]);
    scene.add(stage);
    camera.position.set(0, Math.max(st.w, st.d) * 0.85, st.d * 0.95 + 4); controls.target.set(0, 0, -st.d / 2); controls.update();
  }
  function resize() { const w = host.clientWidth || 600, h = host.clientHeight || 400; renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(resize); ro.observe(host); resize();
  let raf = 0; const loop = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); }; loop();

  const eye = document.createElement('button'); eye.type = 'button'; eye.className = 'chg-eye'; eye.textContent = 'מבט קהל'; host.appendChild(eye);
  let lastSt = null;
  eye.addEventListener('click', () => { if (!lastSt) return; camera.position.set(0, 1.2, (lastSt.front ?? 0.5) + Math.max(5, lastSt.w * 0.8)); controls.target.set(0, 1, -lastSt.d / 2); controls.update(); });
  return {
    // x across (audience's left negative), y from the front: in 3D the front edge is z = 0 and the back is z = -d
    update(ch, pos, propPos) {
      const st = ch.stage, key = [st.w, st.d, st.side, st.back, st.front, st.grid].join(','); lastSt = st;
      if (key !== stageKey) { stageKey = key; buildStage(st); }
      const seen = new Set();
      for (const d of ch.dancers) {
        const q = pos[d.id]; if (!q) continue; seen.add(d.id);
        let m = dancers.get(d.id);
        if (!m) { m = new THREE.Mesh(capsule, new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.45 })); scene.add(m); dancers.set(d.id, m); }
        m.material.color.set(d.color); m.position.set(q[0], 0.575, -q[1]);
      }
      for (const [id, m] of dancers) if (!seen.has(id)) { scene.remove(m); m.material.dispose(); dancers.delete(id); }
      const seenP = new Set();
      for (const p of ch.props || []) {
        const q = (propPos || {})[p.id]; if (!q) continue; seenP.add(p.id);
        let m = props.get(p.id);
        if (!m) { m = new THREE.Mesh(p.kind === 'circle' ? new THREE.CylinderGeometry(0.5, 0.5, 0.6, 32) : new THREE.BoxGeometry(1, 0.6, 1), new THREE.MeshStandardMaterial({ color: q.color || '#ef4b3f', transparent: true, opacity: 0.85 })); scene.add(m); props.set(p.id, m); }
        m.material.color.set(q.color || '#ef4b3f'); m.material.opacity = 0.85 * (q.o !== undefined ? q.o : 1); m.scale.set(q.w, 1, q.h); m.position.set(q.x, 0.3, -q.y); m.rotation.y = -((q.r || 0) * Math.PI) / 180;
      }
      for (const [id, m] of props) if (!seenP.has(id)) { scene.remove(m); props.delete(id); }
    },
    dispose() { eye.remove(); cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); renderer.domElement.remove(); },
  };
}
