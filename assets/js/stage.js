// OFRIDANCE — the virtual stage (formation editor on a count timeline).
// Mini mode on the home page (#mini-stage) and the full editor on stage.html (#stage-app).
// Positions are stored normalised: x 0..1 across the stage as the audience sees it, y 0..1 from upstage (0) to downstage (1).

import { analyze, tapper, sections, filePlayer, youtubePlayer, youtubeId, youtubeProblem, songStore } from './music.js';
const SVGNS = 'http://www.w3.org/2000/svg';
const W = 1000, H = 600, PADX = 50, TOP = 34, DEPTH = 500;
const NAMES = ['נועה', 'מאיה', 'תמר', 'יעל', 'שירה', 'ליה', 'אגם', 'רוני', 'עדי', 'הילה', 'דנה', 'אור', 'שני', 'גאיה', 'אלה', 'רז'];
const COLORS = ['#d92b21', '#ffffff', '#f2b705', '#2bb3a3', '#3a7bd5', '#ff7a45', '#8bc34a', '#e91e63', '#00bcd4', '#bdbdbd', '#ffd54f', '#a1887f', '#4caf50', '#ff8a80', '#90caf9', '#cddc39'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const px = (p) => [PADX + p[0] * (W - 2 * PADX), TOP + p[1] * DEPTH];
const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(SVGNS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };

// ---------- formations ----------
export const PRESETS = {
  line: { name: 'שורה', f: (n) => spread(n, 0.12, 0.88).map((x) => [x, 0.62]) },
  twoLines: { name: 'שתי שורות', f: (n) => { const a = Math.ceil(n / 2), b = n - a; const r1 = spread(a, 0.16, 0.84).map((x) => [x, 0.42]); const s = (0.68 / Math.max(a - 1, 1)) / 2; const r2 = spread(b, 0.16 + s, 0.84 - s * (a > b ? 1 : 0) + (a > b ? 0 : s)).map((x) => [x, 0.74]); return r1.concat(r2); } },
  v: { name: 'וי', f: (n) => vShape(n, 1) },
  arrow: { name: 'חץ', f: (n) => vShape(n, -1) },
  circle: { name: 'מעגל', f: (n) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2; return [0.5 + Math.cos(a) * 0.24, 0.52 + Math.sin(a) * 0.36]; }) },
  semi: { name: 'חצי מעגל', f: (n) => Array.from({ length: n }, (_, i) => { const a = Math.PI * (1.08 + 0.84 * (n === 1 ? 0.5 : i / (n - 1))); return [0.5 + Math.cos(a) * 0.38, 0.8 + Math.sin(a) * 0.55]; }) },
  diagonal: { name: 'אלכסון', f: (n) => Array.from({ length: n }, (_, i) => { const t = n === 1 ? 0.5 : i / (n - 1); return [0.15 + t * 0.7, 0.18 + t * 0.66]; }) },
  column: { name: 'טור', f: (n) => spread(n, 0.14, 0.9).map((y) => [0.5, y]) },
  triangle: { name: 'משולש', f: (n) => { const out = []; let row = 1, y = 0.82; while (out.length < n) { const k = Math.min(row, n - out.length); spread(k, 0.5 - 0.09 * (k - 1), 0.5 + 0.09 * (k - 1)).forEach((x) => out.push([x, y])); row++; y -= 0.2; } return out; } },
  windows: { name: 'חלונות', f: (n) => { const per = Math.ceil(n / 3) || 1; const out = []; for (let i = 0; i < n; i++) { const r = Math.floor(i / per), c = i % per; const off = r % 2 ? 0.5 : 0; out.push([clamp(0.18 + (c + off) * (0.64 / Math.max(per - 0.5, 1)), 0.06, 0.94), 0.3 + r * 0.24]); } return out; } },
  cluster: { name: 'אשכול', f: (n) => { const out = [[0.5, 0.6]]; let ring = 1; while (out.length < n) { const k = ring * 6; for (let i = 0; i < k && out.length < n; i++) { const a = (i / k) * Math.PI * 2; out.push([0.5 + Math.cos(a) * 0.09 * ring, 0.6 + Math.sin(a) * 0.14 * ring]); } ring++; } return out.slice(0, n); } },
  scatter: { name: 'פיזור', f: (n) => Array.from({ length: n }, (_, i) => { const g = 0.618034; return [0.12 + ((i * g + 0.21) % 1) * 0.76, 0.16 + (((i * g * g) + 0.37 + i * 0.13) % 1) * 0.7]; }) },
};
function spread(n, a, b) { if (n <= 0) return []; if (n === 1) return [(a + b) / 2]; return Array.from({ length: n }, (_, i) => a + (b - a) * (i / (n - 1))); }
function vShape(n, dir) { const out = []; const tip = dir > 0 ? 0.82 : 0.24; for (let i = 0; i < n; i++) { const k = Math.ceil(i / 2), side = i % 2 ? 1 : -1; out.push([0.5 + side * k * 0.085, tip - dir * k * 0.12]); } return out.map((p) => [clamp(p[0], 0.05, 0.95), clamp(p[1], 0.05, 0.95)]); }

// ---------- audio: a click per count, accent on 1 ----------
let actx = null;
function tick(accent) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'square'; o.frequency.value = accent ? 1320 : 880;
    g.gain.setValueAtTime(0.0001, actx.currentTime); g.gain.exponentialRampToValueAtTime(accent ? 0.22 : 0.12, actx.currentTime + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.07);
    o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.08);
  } catch (e) { /* audio is optional */ }
}
const HE_COUNTS = ['אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה'];
function say(n) { try { if (!('speechSynthesis' in window)) return; const u = new SpeechSynthesisUtterance(HE_COUNTS[n - 1]); u.lang = 'he-IL'; u.rate = 1.4; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {} }

// ---------- the stage drawing: a theatre stage seen from above ----------
// Positions are [x, y, facing]. Facing is in degrees: 0 faces the audience, 90 faces stage right
// (the performer's right, the audience's left), 180 faces upstage, 270 faces stage left.
let stageUid = 0;
class StageView {
  constructor(host, opts = {}) {
    this.opts = opts;
    const id = 'st' + (++stageUid);
    this.svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'stage-svg', role: 'img', 'aria-label': opts.label || 'במה' });
    host.appendChild(this.svg);
    this.flip = false;
    const defs = el('defs', {}, this.svg);
    // floor boards
    const pat = el('pattern', { id: id + 'b', width: 240, height: 48, patternUnits: 'userSpaceOnUse' }, defs);
    el('rect', { width: 240, height: 48, fill: '#1c1b1a' }, pat);
    el('rect', { y: 0, width: 240, height: 23, fill: '#201f1d' }, pat);
    el('rect', { x: 0, y: 23, width: 240, height: 1.2, fill: '#121110' }, pat);
    el('rect', { x: 0, y: 47, width: 240, height: 1.2, fill: '#121110' }, pat);
    el('rect', { x: 150, y: 0, width: 1.2, height: 23, fill: '#141312' }, pat);
    el('rect', { x: 60, y: 24, width: 1.2, height: 23, fill: '#141312' }, pat);
    // a soft pool of light under each dancer
    const rg = el('radialGradient', { id: id + 'l' }, defs);
    el('stop', { offset: '0', 'stop-color': '#fff3df', 'stop-opacity': '0.55' }, rg);
    el('stop', { offset: '0.55', 'stop-color': '#fff3df', 'stop-opacity': '0.16' }, rg);
    el('stop', { offset: '1', 'stop-color': '#fff3df', 'stop-opacity': '0' }, rg);
    this.lightFill = `url(#${id}l)`;
    const floor = el('g', {}, this.svg);
    el('rect', { x: 0, y: 0, width: W, height: TOP + DEPTH + 26, fill: `url(#${id}b)` }, floor);
    // spike marks: centre line and eighths along the front, as on a real stage
    for (let i = 1; i < 8; i++) {
      const x = PADX + (i / 8) * (W - 2 * PADX);
      el('rect', { x: x - (i === 4 ? 2 : 1), y: TOP + DEPTH + 6, width: i === 4 ? 4 : 2, height: 14, fill: i === 4 ? '#d92b21' : '#8a8a8a' }, floor);
      for (let r = 1; r < 5; r++) { const y = TOP + (r / 5) * DEPTH; el('circle', { cx: x, cy: y, r: 2, fill: '#4a4744' }, floor); }
    }
    // apron edge and the house
    el('rect', { x: 0, y: TOP + DEPTH + 24, width: W, height: 3, fill: '#d92b21' }, floor);
    el('rect', { x: 0, y: TOP + DEPTH + 27, width: W, height: H - (TOP + DEPTH + 27), fill: '#0a0a0a' }, floor);
    for (let row = 0; row < 2; row++) for (let s = 0; s < 34; s++) {
      const x = 40 + s * 28 + (row ? 14 : 0), y = TOP + DEPTH + 44 + row * 16;
      el('rect', { x: x - 8, y: y - 5, width: 16, height: 9, rx: 3, fill: row ? '#151515' : '#1d1d1d' }, floor);
    }
    // wings: deep red curtain folds on both sides, and a valance on top
    const curtain = (x0, w, dir) => {
      const g = el('g', {}, floor);
      el('rect', { x: x0, y: 0, width: w, height: TOP + DEPTH + 24, fill: '#5c0f0b' }, g);
      for (let k = 0; k < 4; k++) el('rect', { x: x0 + (dir > 0 ? k * (w / 4) : w - (k + 1) * (w / 4)), y: 0, width: w / 8, height: TOP + DEPTH + 24, fill: '#7a1712', opacity: 0.9 }, g);
    };
    curtain(0, 30, 1); curtain(W - 30, 30, -1);
    const val = el('g', {}, floor);
    el('rect', { x: 0, y: 0, width: W, height: 14, fill: '#5c0f0b' }, val);
    let d = 'M0 14'; for (let x = 0; x < W; x += 50) d += ` Q${x + 25} 34 ${x + 50} 14`; d += ` L${W} 0 L0 0 Z`;
    el('path', { d, fill: '#6e1510' }, val);
    this.audience = el('text', { x: W / 2, y: H - 6, 'text-anchor': 'middle', fill: '#8a8a8a', 'font-size': 15 }, floor);
    this.sideA = el('text', { x: 15, y: TOP + DEPTH / 2, fill: '#f0c9c4', 'font-size': 15, transform: `rotate(-90 15 ${TOP + DEPTH / 2})`, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, floor);
    this.sideB = el('text', { x: W - 15, y: TOP + DEPTH / 2, fill: '#f0c9c4', 'font-size': 15, transform: `rotate(90 ${W - 15} ${TOP + DEPTH / 2})`, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, floor);
    this.back = el('text', { x: W / 2, y: 52, fill: '#7a7672', 'font-size': 15, 'text-anchor': 'middle' }, floor);
    this.lights = el('g', { style: 'mix-blend-mode:screen' }, this.svg);
    this.trailLayer = el('g', {}, this.svg);
    this.paths = el('g', {}, this.svg);
    this.layer = el('g', {}, this.svg);
    this.handle = el('g', { class: 'face-handle', visibility: 'hidden' }, this.svg);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 62, stroke: '#ffffff', 'stroke-width': 2, 'stroke-dasharray': '3 5' }, this.handle);
    el('circle', { cx: 0, cy: 62, r: 11, fill: '#ffffff', stroke: '#d92b21', 'stroke-width': 3 }, this.handle);
    this.nodes = new Map(); this.pools = new Map(); this.trails = new Map();
    this.labels();
  }
  labels() {
    // stage right is the performer's right: the audience sees it on their left
    this.sideA.textContent = this.flip ? 'שמאל הבמה' : 'ימין הבמה';
    this.sideB.textContent = this.flip ? 'ימין הבמה' : 'שמאל הבמה';
    this.back.textContent = this.flip ? 'קדמת הבמה' : 'עומק הבמה';
    this.audience.textContent = this.flip ? 'עומק הבמה · מבט הרקדניות' : 'קהל';
  }
  setFlip(f) { this.flip = f; this.labels(); this.trails.clear(); }
  map(p) { const q = this.flip ? [1 - p[0], 1 - p[1]] : p; return px(q); }
  unmap(x, y) { let p = [(x - PADX) / (W - 2 * PADX), (y - TOP) / DEPTH]; p = [clamp(p[0], 0.02, 0.98), clamp(p[1], 0.02, 0.98)]; return this.flip ? [1 - p[0], 1 - p[1]] : p; }
  toSvg(evt) { const pt = this.svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY; return pt.matrixTransform(this.svg.getScreenCTM().inverse()); }
  scale() { return Math.min(2.4, Math.max(1, 640 / (this.svg.clientWidth || 640))); }
  faceAngle(p) { return ((p && p[2]) || 0) + (this.flip ? 180 : 0); }
  draw(dancers, positions, opts = {}) {
    const seen = new Set(); const k = this.scale();
    dancers.forEach((d, i) => {
      seen.add(d.id);
      let n = this.nodes.get(d.id);
      if (!n) {
        n = el('g', { class: 'dancer', tabindex: this.opts.editable ? 0 : -1, role: 'button' }, this.layer);
        n.shadow = el('ellipse', { rx: 30, ry: 10, cy: 26, fill: 'rgba(0,0,0,0.55)' }, n);
        n.ring = el('circle', { r: 35, fill: 'none', stroke: '#ffffff', 'stroke-width': 3, opacity: 0 }, n);
        n.face = el('g', {}, n);
        n.nose = el('path', { d: 'M-11 21 L0 41 L11 21 Z', fill: '#ffffff', stroke: '#0a0a0a', 'stroke-width': 2, 'stroke-linejoin': 'round' }, n.face);
        n.dot = el('circle', { r: 26, class: 'dot' }, n);
        n.num = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 22, 'font-weight': 600 }, n);
        n.name = el('text', { 'text-anchor': 'middle', y: 58, 'font-size': 18, fill: '#f2f2f2', 'paint-order': 'stroke', stroke: '#0a0a0a', 'stroke-width': 4 }, n);
        n.dataset.id = d.id;
        this.nodes.set(d.id, n);
        const pool = el('ellipse', { rx: 74, ry: 46, fill: this.lightFill }, this.lights);
        this.pools.set(d.id, pool);
      }
      n.dot.setAttribute('fill', d.color);
      n.nose.setAttribute('fill', d.color === '#ffffff' ? '#d92b21' : '#ffffff');
      const light = ['#ffffff', '#f2b705', '#ffd54f', '#cddc39', '#bdbdbd', '#90caf9', '#8bc34a', '#00bcd4', '#2bb3a3', '#ff8a80', '#ff7a45'].includes(d.color);
      n.num.setAttribute('fill', light ? '#0a0a0a' : '#ffffff');
      n.num.textContent = i + 1;
      n.name.textContent = d.name;
      n.setAttribute('aria-label', `${d.name}, רקדנית ${i + 1}`);
      const p = positions[d.id] || [0.5, 0.5, 0];
      const [x, y] = this.map(p);
      n.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(2)})`);
      n.face.setAttribute('transform', `rotate(${this.faceAngle(p).toFixed(1)})`);
      n.ring.setAttribute('opacity', opts.selected === d.id ? 1 : 0);
      const pool = this.pools.get(d.id);
      pool.setAttribute('transform', `translate(${x.toFixed(1)} ${(y + 8).toFixed(1)}) scale(${k.toFixed(2)})`);
      pool.setAttribute('opacity', opts.playing ? 1 : 0.55);
      if (opts.selected === d.id && this.opts.editable && !opts.playing) {
        this.handle.setAttribute('visibility', 'visible');
        this.handle.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(2)}) rotate(${this.faceAngle(p).toFixed(1)})`);
        this.handle.dataset.id = d.id;
      }
    });
    if (!opts.selected || opts.playing) this.handle.setAttribute('visibility', 'hidden');
    for (const [id, n] of this.nodes) if (!seen.has(id)) { n.remove(); this.nodes.delete(id); this.pools.get(id)?.remove(); this.pools.delete(id); }
    this.drawTrails(dancers, positions, !!opts.playing);
  }
  // a short fading trail of where each dancer has just been, while the piece plays
  drawTrails(dancers, positions, active) {
    if (!active) { if (this.trails.size) { this.trails.clear(); this.trailLayer.innerHTML = ''; this.trailEls = new Map(); } return; }
    this.trailEls = this.trailEls || new Map();
    dancers.forEach((d) => {
      const p = positions[d.id]; if (!p) return;
      const [x, y] = this.map(p);
      const t = this.trails.get(d.id) || []; const last = t[t.length - 1];
      if (!last || Math.hypot(last[0] - x, last[1] - y) > 2) t.push([x, y]);
      if (t.length > 40) t.shift();
      this.trails.set(d.id, t);
      let els = this.trailEls.get(d.id);
      if (!els) { els = [0, 1, 2, 3].map((q) => el('polyline', { fill: 'none', stroke: d.color, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': 3 + q * 2.6, opacity: 0.1 + q * 0.13 }, this.trailLayer)); this.trailEls.set(d.id, els); }
      const n = t.length;
      els.forEach((e, q) => { const seg = t.slice(Math.floor((q * n) / 4), Math.floor(((q + 1) * n) / 4) + 1); e.setAttribute('points', seg.map((v) => v[0].toFixed(1) + ',' + v[1].toFixed(1)).join(' ')); });
    });
  }
  drawPaths(dancers, from, to) {
    this.paths.innerHTML = '';
    if (!from || !to) return;
    dancers.forEach((d) => {
      const a = from[d.id], b = to[d.id]; if (!a || !b) return;
      const [x1, y1] = this.map(a), [x2, y2] = this.map(b);
      if (Math.hypot(x2 - x1, y2 - y1) < 4) return;
      el('line', { x1, y1, x2, y2, stroke: d.color, 'stroke-width': 3, 'stroke-dasharray': '2 10', 'stroke-linecap': 'round', opacity: 0.85 }, this.paths);
      el('circle', { cx: x1, cy: y1, r: 9, fill: 'none', stroke: d.color, 'stroke-width': 2, opacity: 0.7 }, this.paths);
    });
  }
}

// shortest turn between two facings
const turn = (a, b, k) => { let dlt = ((b - a + 540) % 360) - 180; return a + dlt * k; };
// interpolate the whole cast at a count position in the timeline
function poseAt(state, tCounts) {
  const F = state.formations; let start = 0;
  for (let i = 0; i < F.length; i++) {
    const f = F[i], end = start + f.counts;
    if (tCounts < end || i === F.length - 1) {
      const prev = i > 0 ? F[i - 1].pos : f.pos;
      const local = tCounts - start, mv = Math.min(f.move, f.counts);
      const k = i === 0 ? 1 : ease(clamp(mv ? local / mv : 1, 0, 1));
      const out = {};
      state.dancers.forEach((d) => { const a = prev[d.id] || f.pos[d.id] || [0.5, 0.5, 0], b = f.pos[d.id] || a; out[d.id] = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, turn(a[2] || 0, b[2] || 0, k)]; });
      return { pos: out, index: i, local };
    }
    start = end;
  }
  return { pos: {}, index: 0, local: 0 };
}

const total = (s) => s.formations.reduce((a, f) => a + f.counts, 0);

function makeCast(n) { return Array.from({ length: n }, (_, i) => ({ id: 'd' + (i + 1) + Math.random().toString(36).slice(2, 6), name: NAMES[i % NAMES.length], color: COLORS[i % COLORS.length] })); }
function applyPreset(dancers, key) { const pts = PRESETS[key].f(dancers.length); const pos = {}; dancers.forEach((d, i) => { pos[d.id] = pts[i]; }); return pos; }

// ---------- MINI (home page) ----------
function mini(host) {
  const dancers = makeCast(5);
  const keys = ['line', 'v', 'circle', 'diagonal', 'cluster'];
  let current = applyPreset(dancers, 'line');
  const wrap = document.createElement('div'); wrap.className = 'mini';
  host.appendChild(wrap);
  const view = new StageView(wrap, { label: 'במה עם חמש רקדניות', editable: true });
  const bar = document.createElement('div'); bar.className = 'mini-bar';
  const count = document.createElement('output'); count.className = 'mini-count'; count.textContent = '·';
  keys.forEach((k) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = PRESETS[k].name; b.addEventListener('click', () => go(k, b)); bar.appendChild(b); });
  bar.appendChild(count);
  wrap.appendChild(bar);
  view.draw(dancers, current);
  let raf = 0;
  function go(k, btn) {
    bar.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', c === btn));
    const from = current, to = applyPreset(dancers, k), t0 = performance.now(), beat = 60000 / 110;
    view.drawPaths(dancers, from, to);
    cancelAnimationFrame(raf);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let last = 0;
    const step = (now) => {
      const c = (now - t0) / beat; const n = Math.min(8, Math.floor(c) + 1);
      if (n !== last) { last = n; count.textContent = n; }
      const k2 = reduce ? 1 : ease(clamp(c / 8, 0, 1));
      const pos = {}; dancers.forEach((d) => { const a = from[d.id], b = to[d.id]; pos[d.id] = [a[0] + (b[0] - a[0]) * k2, a[1] + (b[1] - a[1]) * k2]; });
      view.draw(dancers, pos, { playing: k2 < 1 });
      if (k2 < 1) raf = requestAnimationFrame(step); else { current = to; view.drawPaths(dancers, null, null); count.textContent = '8'; }
    };
    raf = requestAnimationFrame(step);
  }
  dragify(view, () => dancers, () => current, (id, p) => { current[id] = p; view.draw(dancers, current); });
}

function dragify(view, getDancers, getPos, onMove, onSelect, onEnd) {
  let dragging = null;
  view.svg.addEventListener('pointerdown', (e) => {
    const g = e.target.closest('.dancer'); if (!g) { onSelect && onSelect(null); return; }
    dragging = g.dataset.id; g.setPointerCapture(e.pointerId); onSelect && onSelect(dragging); e.preventDefault();
  });
  view.svg.addEventListener('pointermove', (e) => { if (!dragging) return; const p = view.toSvg(e); onMove(dragging, view.unmap(p.x, p.y)); });
  const up = () => { if (dragging) { dragging = null; onEnd && onEnd(); } };
  view.svg.addEventListener('pointerup', up); view.svg.addEventListener('pointercancel', up);
  view.svg.style.touchAction = 'none';
}

// ---------- FULL editor (stage.html) ----------
const STORE = 'ofridance-stage-v1';
function defaultState() {
  const dancers = makeCast(6);
  const mk = (name, key, counts = 8, move = 4) => ({ name, counts, move, pos: applyPreset(dancers, key) });
  return { title: 'הקטע שלי', bpm: 100, dancers, formations: [mk('פתיחה', 'cluster'), mk('שורה', 'line'), mk('וי', 'v'), mk('מעגל', 'circle'), mk('אלכסון', 'diagonal'), mk('סיום', 'twoLines')] };
}
function encodeState(s) { const json = JSON.stringify(s); return btoa(String.fromCharCode(...new TextEncoder().encode(json))); }
function decodeState(b) { const bin = atob(b); return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))); }

function full(app) {
  let state;
  try { const h = location.hash.match(/s=([^&]+)/); state = h ? decodeState(decodeURIComponent(h[1])) : JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { state = null; }
  if (!state || !state.formations || !state.formations.length) state = defaultState();
  let sel = 0, selDancer = null, playing = false, t = 0, raf = 0, lastCount = -1, voice = false, showPaths = true, mode3d = null, player = null, click = !state.music;
  const undo = [];
  const $ = (q) => app.querySelector(q);
  const view = new StageView($('.stage-host'), { label: 'הבמה', editable: true });

  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} };
  const snapshot = () => { undo.push(JSON.stringify(state)); if (undo.length > 60) undo.shift(); };
  const startOf = (i) => state.formations.slice(0, i).reduce((a, f) => a + f.counts, 0);
  const bpmNow = () => (state.music ? state.music.bpm : state.bpm);
  const songTimeOf = (counts) => state.music.offset + (counts * 60) / state.music.bpm;
  const countsOfSong = (sec) => ((sec - state.music.offset) * state.music.bpm) / 60;

  function renderTimeline() {
    const tl = $('.timeline'); tl.innerHTML = '';
    state.formations.forEach((f, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'block'; b.style.flexGrow = f.counts;
      b.setAttribute('aria-pressed', i === sel);
      b.innerHTML = `<span class="bn">${escapeHtml(f.name)}</span><span class="bc">${f.counts} ספירות · מעבר ${f.move}</span>`;
      b.addEventListener('click', () => { const was = playing; stop(); sel = i; t = was ? startOf(i) : startOf(i) + f.counts - 0.001; renderAll(); if (was) play(); });
      tl.appendChild(b);
    });
    const ph = document.createElement('span'); ph.className = 'playhead'; tl.appendChild(ph);
    // a ruler of counts above the timeline, every eight numbered
    const ru = $('.ruler'); if (ru) { ru.innerHTML = ''; const T = total(state); for (let c = 0; c < T; c++) { if (T > 200 && c % 8) continue; const t2 = document.createElement('span'); if (c % 8 === 0) { t2.className = 'e'; t2.innerHTML = `<b>${c / 8 + 1}</b>`; } t2.style.insetInlineStart = `${(c / T) * 100}%`; ru.appendChild(t2); } }
    placeHead();
  }
  function placeHead() { const ph = $('.timeline .playhead'); if (ph) ph.style.insetInlineStart = `${(clamp(t, 0, total(state)) / total(state)) * 100}%`; }
  function renderForm() {
    const f = state.formations[sel];
    $('#f-name').value = f.name; $('#f-counts').value = f.counts; $('#f-move').value = f.move;
    $('#f-move').max = f.counts;
    $('.sel-label').textContent = `מערך ${sel + 1} מתוך ${state.formations.length}`;
  }
  function renderCast() {
    const list = $('.cast'); list.innerHTML = '';
    state.dancers.forEach((d, i) => {
      const li = document.createElement('li'); li.className = 'cast-row' + (selDancer === d.id ? ' on' : '');
      li.innerHTML = `<span class="sw" style="background:${d.color}">${i + 1}</span><input aria-label="שם רקדנית ${i + 1}" value="${escapeHtml(d.name)}" maxlength="14"><button type="button" class="col" aria-label="החלפת צבע">צבע</button><button type="button" class="rm" aria-label="הסרת ${escapeHtml(d.name)}">הסרה</button>`;
      li.querySelector('input').addEventListener('input', (e) => { d.name = e.target.value; drawNow(); save(); });
      li.querySelector('.col').addEventListener('click', () => { snapshot(); d.color = COLORS[(COLORS.indexOf(d.color) + 1) % COLORS.length]; renderCast(); drawNow(); save(); });
      li.querySelector('.rm').addEventListener('click', () => { if (state.dancers.length <= 1) return; snapshot(); state.dancers = state.dancers.filter((x) => x !== d); state.formations.forEach((f) => delete f.pos[d.id]); renderAll(); save(); });
      li.addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return; selDancer = d.id; renderCast(); drawNow(); });
      list.appendChild(li);
    });
    $('.cast-count').textContent = `${state.dancers.length} רקדניות`;
  }
  function drawNow() {
    const r = poseAt(state, Math.max(0, t));
    const f = state.formations[sel];
    const pos = playing ? r.pos : f.pos;
    view.draw(state.dancers, pos, { selected: selDancer, playing });
    if (showPaths && !playing && sel > 0) view.drawPaths(state.dancers, state.formations[sel - 1].pos, f.pos); else view.drawPaths(state.dancers, null, null);
    if (mode3d) mode3d.update(state.dancers, pos);
  }
  function renderAll() { renderTimeline(); renderForm(); renderCast(); drawNow(); updateCount(); }
  function updateCount() {
    const c = ((Math.floor(t) % 8) + 8) % 8 + 1, eight = Math.max(1, Math.floor(t / 8) + 1);
    $('.big-count').textContent = playing ? c : '·';
    drawStrip();
    $('.eight').textContent = `שמינייה ${eight} מתוך ${Math.ceil(total(state) / 8)}`;
  }

  // drag dancers on the selected formation
  dragify(view, () => state.dancers, () => state.formations[sel].pos, (id, p) => {
    if (playing) return;
    const f = state.formations[sel];
    if ($('#snap').checked) p = [Math.round(p[0] * 16) / 16, Math.round(p[1] * 10) / 10];
    f.pos[id] = [p[0], p[1], (f.pos[id] && f.pos[id][2]) || 0]; selDancer = id; drawNow();
  }, (id) => { if (id) { snapshot(); selDancer = id; renderCast(); } else { selDancer = null; renderCast(); drawNow(); } }, () => save());

  // turning a dancer: drag the round handle, or use the facing buttons, or Q / E
  const setFace = (id, deg) => { const f = state.formations[sel]; const p = f.pos[id] || [0.5, 0.5, 0]; f.pos[id] = [p[0], p[1], ((deg % 360) + 360) % 360]; };
  let turning = null;
  view.handle.addEventListener('pointerdown', (e) => { if (playing) return; turning = view.handle.dataset.id; snapshot(); view.handle.setPointerCapture(e.pointerId); e.preventDefault(); e.stopPropagation(); });
  view.handle.addEventListener('pointermove', (e) => {
    if (!turning) return; const q = view.toSvg(e); const c = view.map(state.formations[sel].pos[turning] || [0.5, 0.5]);
    let deg = (Math.atan2(-(q.x - c[0]), q.y - c[1]) * 180) / Math.PI - (view.flip ? 180 : 0);
    if (!e.shiftKey) deg = Math.round(deg / 45) * 45;
    setFace(turning, deg); drawNow();
  });
  const endTurn = () => { if (turning) { turning = null; save(); } };
  view.handle.addEventListener('pointerup', endTurn); view.handle.addEventListener('pointercancel', endTurn);
  view.handle.style.cursor = 'grab'; view.handle.style.touchAction = 'none';
  app.querySelectorAll('[data-face]').forEach((b) => b.addEventListener('click', () => {
    if (playing) return; snapshot();
    if (b.dataset.face === 'all') state.dancers.forEach((d) => setFace(d.id, 0));
    else if (selDancer) setFace(selDancer, +b.dataset.face);
    else { flash('בחרו קודם רקדנית על הבמה.'); return; }
    drawNow(); save();
  }));

  // keyboard nudging of the selected dancer
  view.svg.addEventListener('keydown', (e) => {
    const g = e.target.closest('.dancer'); if (!g) return; const id = g.dataset.id; selDancer = id;
    const f = state.formations[sel]; const p = f.pos[id] || [0.5, 0.5]; const s = e.shiftKey ? 0.05 : 0.0125;
    const dir = view.flip ? -1 : 1;
    if (e.code === 'KeyQ' || e.code === 'KeyE') { e.preventDefault(); snapshot(); setFace(id, (p[2] || 0) + (e.code === 'KeyQ' ? -45 : 45)); drawNow(); save(); return; }
    const m = { ArrowLeft: [-s * dir, 0], ArrowRight: [s * dir, 0], ArrowUp: [0, -s * dir], ArrowDown: [0, s * dir] }[e.key];
    if (!m) return; e.preventDefault(); snapshot(); f.pos[id] = [clamp(p[0] + m[0], 0.02, 0.98), clamp(p[1] + m[1], 0.02, 0.98), p[2] || 0]; drawNow(); save();
  });

  // presets
  const pre = $('.presets');
  Object.entries(PRESETS).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = v.name; b.addEventListener('click', () => { stop(); snapshot(); state.formations[sel].pos = applyPreset(state.dancers, k); drawNow(); save(); }); pre.appendChild(b); });

  // formation fields
  $('#f-name').addEventListener('input', (e) => { state.formations[sel].name = e.target.value || 'מערך'; renderTimeline(); save(); });
  $('#f-counts').addEventListener('change', (e) => { snapshot(); const f = state.formations[sel]; f.counts = clamp(parseInt(e.target.value, 10) || 8, 1, 64); f.move = Math.min(f.move, f.counts); renderAll(); save(); });
  $('#f-move').addEventListener('change', (e) => { snapshot(); const f = state.formations[sel]; f.move = clamp(parseInt(e.target.value, 10) || 0, 0, f.counts); renderAll(); save(); });
  $('#add-f').addEventListener('click', () => { stop(); snapshot(); const f = state.formations[sel]; state.formations.splice(sel + 1, 0, { name: 'מערך חדש', counts: 8, move: 4, pos: JSON.parse(JSON.stringify(f.pos)) }); sel++; t = startOf(sel) + 7.999; renderAll(); save(); });
  $('#del-f').addEventListener('click', () => { if (state.formations.length <= 1) return; stop(); snapshot(); state.formations.splice(sel, 1); sel = Math.max(0, sel - 1); t = startOf(sel); renderAll(); save(); });
  $('#add-d').addEventListener('click', () => {
    if (state.dancers.length >= 16) return; snapshot();
    const i = state.dancers.length; const d = { id: 'd' + Date.now().toString(36), name: NAMES[i % NAMES.length], color: COLORS[i % COLORS.length] };
    state.dancers.push(d); state.formations.forEach((f) => { f.pos[d.id] = [0.5, 0.9]; }); renderAll(); save();
  });

  // playback
  $('#bpm').addEventListener('input', (e) => { state.bpm = +e.target.value; $('#bpm-out').textContent = state.bpm; save(); });
  $('#bpm').value = state.bpm; $('#bpm-out').textContent = state.bpm;
  $('#click').checked = click; $('#click').addEventListener('change', (e) => { click = e.target.checked; });
  $('#voice').addEventListener('change', (e) => { voice = e.target.checked; });
  $('#paths').addEventListener('change', (e) => { showPaths = e.target.checked; drawNow(); });
  $('#flip').addEventListener('change', (e) => { view.setFlip(e.target.checked); drawNow(); });
  const playBtn = $('#play');
  function play() {
    if (playing) return stop();
    playing = true; playBtn.textContent = 'עצירה'; playBtn.setAttribute('aria-pressed', 'true');
    if (t >= total(state) - 0.01 || t < 0) t = 0;
    lastCount = -1;
    if (player && state.music) {
      // the song itself counts us in: start four counts before the chosen moment
      const from = Math.max(0, songTimeOf(t - 4));
      player.seek(from); Promise.resolve(player.play()).catch(() => { flash('הדפדפן חסם את הנגינה. לחצו שוב על נגן.'); stop(); });
      follow();
      return;
    }
    let prev = performance.now();
    const loop = (now) => {
      const dt = (now - prev) / 1000; prev = now;
      t += dt * (bpmNow() / 60);
      if (t >= total(state)) { t = total(state) - 0.001; stop(); return; }
      const c = Math.floor(t);
      if (c !== lastCount) { lastCount = c; const n = c % 8 + 1; if (click) tick(n === 1); if (voice) say(n); }
      const r = poseAt(state, t); if (r.index !== sel) { sel = r.index; renderTimeline(); renderForm(); }
      drawNow(); updateCount(); placeHead();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }
  // follow the song: the dancers take their time from the music player
  function follow() {
    cancelAnimationFrame(raf);
      const loop = () => {
        if (!playing) return;
        t = countsOfSong(player.time);
        if (t >= total(state) || (player.duration && player.time >= player.duration - 0.05)) { t = Math.min(t, total(state) - 0.001); stop(); return; }
        const c = Math.floor(t);
        if (c !== lastCount) { lastCount = c; const n = ((c % 8) + 8) % 8 + 1; if (click) tick(n === 1); if (voice) say(n); }
        if (t >= 0) { const r = poseAt(state, t); if (r.index !== sel) { sel = r.index; renderTimeline(); renderForm(); } }
        drawNow(); updateCount(); placeHead();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
  }
  function followExternal() {
    // the video was started from its own controls: follow it without seeking
    if (playing || !player || !state.music || countsOfSong(player.time) >= total(state)) return;
    playing = true; playBtn.textContent = 'עצירה'; playBtn.setAttribute('aria-pressed', 'true'); lastCount = -1;
    follow();
  }
  function stop() { if (!playing) return; playing = false; cancelAnimationFrame(raf); if (player) player.pause(); if (t < 0) t = 0; playBtn.textContent = 'נגן'; playBtn.setAttribute('aria-pressed', 'false'); updateCount(); drawNow(); }
  playBtn.addEventListener('click', play);
  $('#rewind').addEventListener('click', () => { stop(); t = 0; sel = 0; renderAll(); });
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select')) return;
    if (e.code === 'Space') { e.preventDefault(); play(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); const s = undo.pop(); if (s) { state = JSON.parse(s); sel = Math.min(sel, state.formations.length - 1); renderAll(); save(); } }
  });
  $('#undo').addEventListener('click', () => { const s = undo.pop(); if (s) { state = JSON.parse(s); sel = Math.min(sel, state.formations.length - 1); renderAll(); save(); } });

  // save, share, export, reset
  $('#share').addEventListener('click', async () => {
    const url = location.href.split('#')[0] + '#s=' + encodeURIComponent(encodeState(state));
    try { await navigator.clipboard.writeText(url); flash('הקישור הועתק. מי שתפתח אותו תראה בדיוק את הקטע הזה.'); } catch (e) { prompt('העתיקו את הקישור:', url); }
  });
  $('#png').addEventListener('click', () => exportPng(view.svg, (state.formations[sel].name || 'מערך') + '.png'));
  $('#print').addEventListener('click', () => printSheet(state));
  $('#reset').addEventListener('click', () => { if (!confirm('להתחיל קטע חדש? הקטע הנוכחי יימחק מהדפדפן.')) return; snapshot(); state = defaultState(); sel = 0; t = 0; renderAll(); save(); });
  function flash(msg) { const o = document.querySelector('.flash'); o.textContent = msg; o.classList.add('on'); clearTimeout(o._t); o._t = setTimeout(() => o.classList.remove('on'), 3200); }


  // ---------- music: a song file or a YouTube link ----------
  const strip = $('.song-strip'), cv = strip.querySelector('canvas'), stat = $('.music-status');
  const taps = tapper();
  function setStatus(msg) { stat.textContent = msg; }
  function musicUI() {
    const m = state.music;
    $('.music-fields').hidden = !m; strip.hidden = !m; $('#music-clear').hidden = !m;
    $('.bpm-plain').hidden = !!m;
    if (m) {
      $('#m-bpm').value = m.bpm; $('#m-offset').textContent = m.offset.toFixed(2);
      $('#skeleton').closest('.row').hidden = !m.energy;
      $('.song-name').textContent = m.name || '';
    }
    drawStrip();
  }
  function drawStrip() {
    const m = state.music; if (!m || strip.hidden) return;
    const dpr = Math.min(devicePixelRatio || 1, 2), w = strip.clientWidth, h = 84;
    if (!w) return;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = h * dpr; cv.style.height = h + 'px'; }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const dur = m.duration || (player && player.duration) || 0; if (!dur) return;
    const X = (sec) => w - (sec / dur) * w; // right to left, like the timeline
    const a = X(songTimeOf(0)), b = X(songTimeOf(total(state)));
    g.fillStyle = '#2a2a2a'; g.fillRect(b, 0, a - b, h);
    if (m.peaks) { const n = m.peaks.length; g.fillStyle = '#8a8a8a'; for (let i = 0; i < n; i++) { const v = m.peaks[i] * (h * 0.42); const x = w - ((i + 0.5) / n) * w; g.fillRect(x - 0.5, h / 2 - v, Math.max(1, w / n - 0.5), v * 2); } }
    else { g.fillStyle = '#3a3a3a'; g.fillRect(0, h / 2 - 1, w, 2); }
    const eightS = (8 * 60) / m.bpm;
    g.fillStyle = 'rgba(255,255,255,0.22)';
    for (let s2 = m.offset % eightS; s2 < dur; s2 += eightS) g.fillRect(X(s2), h - 10, 1, 10);
    g.fillStyle = '#d92b21';
    let acc = 0; for (const f of state.formations) { g.fillRect(X(songTimeOf(acc)) - 1, 0, 2, h); acc += f.counts; }
    g.fillRect(X(songTimeOf(acc)) - 1, 0, 2, h);
    const now = playing && player ? player.time : songTimeOf(Math.max(0, t));
    g.fillStyle = '#ffffff'; g.fillRect(X(now) - 1, 0, 2, h);
  }
  cv.addEventListener('click', (e) => {
    const m = state.music; if (!m) return; const r = cv.getBoundingClientRect(); const dur = m.duration || (player && player.duration) || 0; if (!dur) return;
    const sec = ((r.right - e.clientX) / r.width) * dur; const c = countsOfSong(sec);
    const was = playing; stop(); t = clamp(c, 0, total(state) - 0.001); sel = poseAt(state, t).index; renderAll(); if (was) play();
  });
  addEventListener('resize', () => drawStrip());

  async function useFile(file, fromStore) {
    stop(); if (player) { player.dispose(); player = null; }
    $('.yt-host').hidden = true;
    setStatus('קוראים את השיר…');
    try {
      const keep = fromStore && state.music && state.music.kind === 'file';
      let res = null;
      if (!keep) res = await analyze(await file.arrayBuffer(), setStatus);
      player = filePlayer(file); await player.ready;
      if (!keep) {
        snapshot();
        state.music = { kind: 'file', name: file.name || 'השיר שלי', ...res };
        click = false; $('#click').checked = false;
        songStore.save(file);
      }
      save(); musicUI();
      setStatus(keep ? `השיר "${state.music.name}" מוכן. לחצו נגן.` : `זיהינו קצב של ${state.music.bpm} פעמות לדקה, וה"אחת" הראשונה ב-${state.music.offset.toFixed(2)} שניות. לחצו נגן ובדקו שהספירה יושבת על השיר. אם לא, תקנו למטה.`);
    } catch (e) { setStatus('לא הצלחנו לקרוא את הקובץ. נסו קובץ שמע אחר, למשל MP3.'); }
  }
  $('#demo-song').addEventListener('click', async () => {
    setStatus('טוענים שיר לדוגמה…');
    try { let blob = null; for (let i = 0; i < 3 && !blob; i++) { try { const r = await fetch('assets/audio/demo-beat-96.mp3', { cache: 'no-store' }); if (r.ok) blob = await r.blob(); } catch (e) { await new Promise((ok) => setTimeout(ok, 600)); } } if (!blob) throw new Error('fetch'); useFile(new File([blob], 'ביט לדוגמה, 96 פעמות לדקה.mp3', { type: 'audio/mpeg' }), false); }
    catch (e) { setStatus('לא הצלחנו לטעון את השיר לדוגמה.'); }
  });
  $('#song-file').addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) useFile(f, false); e.target.value = ''; });
  $('#yt-btn').addEventListener('click', () => { $('.yt-form').hidden = !$('.yt-form').hidden; if (!$('.yt-form').hidden) $('#yt-url').focus(); });
  async function useYoutube(id, meta) {
    stop(); if (player) { player.dispose(); player = null; }
    setStatus('טוענים את הסרטון מיוטיוב…');
    $('.yt-host').hidden = false;
    try {
      player = await youtubePlayer($('.yt-host'), id, { onState: (st) => { if (st === 1 && !playing) followExternal(); else if (st === 2 && playing) stop(); }, onProblem: (msg, code) => { setStatus(msg); if (code !== 'autoplay') stop(); else { playing = false; cancelAnimationFrame(raf); playBtn.textContent = 'נגן'; playBtn.setAttribute('aria-pressed', 'false'); } } });
      if (!meta) { snapshot(); state.music = { kind: 'youtube', ytId: id, name: player.title || 'סרטון מיוטיוב', bpm: state.bpm, offset: 0, duration: player.duration }; click = true; $('#click').checked = true; }
      else state.music.duration = player.duration || state.music.duration;
      save(); musicUI();
      setStatus(meta ? 'הסרטון מוכן. לחצו נגן.' : 'יוטיוב לא מאפשר לאתר לשמוע את השיר, אז את הקצב קובעים בהקשה: נגנו, ולחצו "הקישו בקצב" על כל פעמה. אחר כך, בדיוק ברגע של ה"אחת", לחצו "האחת כאן".');
    } catch (e) { setStatus(e && e.code && e.code !== 'timeout' ? youtubeProblem(e.code) : 'לא הצלחנו לטעון את יוטיוב. בדקו את החיבור לאינטרנט ונסו שוב.'); $('.yt-host').hidden = true; if (player) { player.dispose(); player = null; } }
  }
  $('#yt-load').addEventListener('click', () => { const id = youtubeId($('#yt-url').value); if (!id) { setStatus('זה לא נראה כמו קישור ליוטיוב.'); return; } $('.yt-form').hidden = true; useYoutube(id, null); });
  $('#music-clear').addEventListener('click', () => { stop(); if (player) { player.dispose(); player = null; } snapshot(); state.music = null; songStore.clear(); $('.yt-host').hidden = true; click = true; $('#click').checked = true; save(); musicUI(); setStatus('בלי מוזיקה: הקצב בא מהמטרונום.'); });
  $('#m-bpm').addEventListener('change', (e) => { if (!state.music) return; snapshot(); state.music.bpm = clamp(+e.target.value || state.music.bpm, 40, 240); save(); musicUI(); });
  app.querySelectorAll('[data-tempo]').forEach((btn) => btn.addEventListener('click', () => {
    if (!state.music) return; snapshot(); state.music.bpm = +(state.music.bpm * +btn.dataset.tempo).toFixed(2); save(); musicUI();
    setStatus(`הקצב עכשיו ${state.music.bpm}. בשירים "איטיים" כמו טראפ, רקדניות סופרות לפעמים בחצי מהקצב.`);
  }));
  $('#tap').addEventListener('click', () => {
    if (!state.music) return; const v = taps.tap();
    if (v) { state.music.bpm = v; $('#m-bpm').value = v; save(); drawStrip(); setStatus(`קצב לפי ההקשות: ${v}. המשיכו להקיש כדי לדייק.`); } else setStatus(`הקישו עוד ${4 - taps.count} פעמים בקצב…`);
  });
  $('#one-here').addEventListener('click', () => {
    if (!state.music || !player) return; snapshot();
    const now = player.time; const wasT = t;
    state.music.offset = Math.max(0, +(now - 0.08).toFixed(3)); save(); musicUI();
    if (playing) { stop(); t = 0; play(); } else t = Math.max(0, wasT);
    setStatus('קבענו את ה"אחת" של הקטע ברגע הזה.');
  });
  app.querySelectorAll('[data-nudge]').forEach((b) => b.addEventListener('click', () => {
    if (!state.music) return; const beats = +b.dataset.nudge; snapshot();
    state.music.offset = Math.max(0, +(state.music.offset + (beats * 60) / state.music.bpm).toFixed(3)); save(); musicUI();
  }));
  $('#skeleton').addEventListener('click', () => {
    const m = state.music; if (!m || !m.energy) return;
    const secs = sections(m, m.offset); if (!secs.length) return;
    if (!confirm(`לבנות ${secs.length} מערכים לפי מבנה השיר? המערכים הנוכחיים יוחלפו (אפשר לחזור עם "ביטול פעולה").`)) return;
    stop(); snapshot();
    const style = $('#sk-style').value;
    // hip-hop: sharp shapes and quick transitions; modern: open, flowing shapes and long transitions
    const pick = style === 'modern'
      ? { low: ['scatter', 'cluster', 'column', 'semi'], mid: ['diagonal', 'semi', 'circle', 'windows'], high: ['circle', 'diagonal', 'triangle', 'line'] }
      : { low: ['cluster', 'column', 'semi', 'scatter'], mid: ['twoLines', 'windows', 'diagonal', 'triangle'], high: ['v', 'line', 'arrow', 'windows'] };
    const moveFor = (lv, counts) => style === 'modern' ? Math.min(counts, lv === 'high' ? 4 : 8) : Math.min(counts, lv === 'high' ? 2 : 4);
    const used = { low: 0, mid: 0, high: 0 };
    state.formations = secs.map((sct, i) => {
      const key = pick[sct.lv][used[sct.lv]++ % 4];
      const name = i === 0 ? 'פתיחה' : i === secs.length - 1 ? 'סיום' : `${sct.label} ${used[sct.lv]}`;
      return { name, counts: sct.len * 8, move: moveFor(sct.lv, sct.len * 8), pos: applyPreset(state.dancers, key), level: sct.lv };
    });
    sel = 0; t = 0; renderAll(); save();
    flash(`נבנו ${secs.length} מערכים לפי השיר. עכשיו מתאימים כל אחד ביד.`);
  });
  (async () => {
    const m = state.music; musicUI(); if (!m) return;
    if (m.kind === 'youtube' && m.ytId) { useYoutube(m.ytId, m); return; }
    const blob = await songStore.load();
    if (blob) useFile(blob, true);
    else setStatus(`הקטע מסונכרן לשיר "${m.name}", אבל הקובץ לא נמצא בדפדפן הזה. העלו אותו שוב: הקצב וה"אחת" שמורים.`);
  })();

  // 3D view, loaded only when asked for
  const b3 = $('#view3d');
  b3.addEventListener('click', async () => {
    if (mode3d) { mode3d.dispose(); mode3d = null; b3.setAttribute('aria-pressed', 'false'); b3.textContent = 'מבט תלת-ממד'; $('.stage-host').classList.remove('is-3d'); return; }
    b3.textContent = 'טוען…';
    try {
      const m = await import('./stage3d.js');
      mode3d = m.mount($('.stage-3d'));
      $('.stage-host').classList.add('is-3d'); b3.setAttribute('aria-pressed', 'true'); b3.textContent = 'חזרה למבט מלמעלה'; drawNow();
    } catch (e) { b3.textContent = 'מבט תלת-ממד'; flash('לא הצלחנו לטעון את התלת-ממד. בדקו חיבור לאינטרנט.'); }
  });

  t = startOf(sel) + state.formations[sel].counts - 0.001;
  renderAll();
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function exportPng(svg, name) {
  const clone = svg.cloneNode(true); clone.setAttribute('width', W * 2); clone.setAttribute('height', H * 2);
  clone.setAttribute('style', 'font-family: IBM Plex Sans Hebrew, Arial, sans-serif');
  const data = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  img.onload = () => { const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2; const x = c.getContext('2d'); x.drawImage(img, 0, 0); c.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);
}

function printSheet(state) {
  const sheet = document.querySelector('.print-sheet'); if (!sheet) return;
  sheet.innerHTML = `<h1>${escapeHtml(state.title)} · דף עימוד</h1><p>${state.dancers.map((d, i) => `${i + 1}. ${escapeHtml(d.name)}`).join(' · ')} · קצב ${state.bpm}</p>`;
  let start = 0;
  state.formations.forEach((f, i) => {
    const box = document.createElement('figure');
    const v = new StageView(box, { label: f.name });
    v.draw(state.dancers, f.pos);
    if (i > 0) v.drawPaths(state.dancers, state.formations[i - 1].pos, f.pos);
    const cap = document.createElement('figcaption');
    cap.textContent = `${i + 1}. ${f.name} · ספירות ${start + 1} עד ${start + f.counts} · מעבר של ${f.move}`;
    box.appendChild(cap); sheet.appendChild(box); start += f.counts;
  });
  window.print();
}

// boot
const m = document.getElementById('mini-stage'); if (m) mini(m);
const a = document.getElementById('stage-app'); if (a) full(a);
