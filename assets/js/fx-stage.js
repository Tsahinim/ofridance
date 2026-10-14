// OFRIDANCE formation app: drawing the stage seen from above, in real metres.
// x runs across the stage from the centre (negative = the audience's left), y from the front edge (0) to the back (d).
// The stage sits inside a lighter band for the wings and the backstage, framed in red, with red centre marks;
// "קהל" (audience) below and "אחורי הבמה" (backstage) above, or the other way round in the mirror view.
export const SVGNS = 'http://www.w3.org/2000/svg';
export const S = 56; // pixels per metre
export const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(SVGNS, tag); for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
export const LIGHT = new Set(['#ffffff', '#f2b705', '#ffd54f', '#cddc39', '#bdbdbd', '#90caf9', '#8bc34a', '#00bcd4', '#2bb3a3', '#ff8a80', '#ff7a45', '#7ee0ff', '#b9f6ca', '#ffe082', '#5ce1e6', '#7ed957']);
const LABEL = 0.7;

export function geometry(st) {
  const side = st.side ?? 1.5, back = st.back ?? 1, front = st.front ?? 0.5;
  return { w: st.w, d: st.d, side, back, front, vw: (st.w + 2 * side) * S, vh: (st.d + back + front + 2 * LABEL) * S };
}
// the mirror view turns the stage around, as dancers see it when they face a studio mirror
export function toPx(st, x, y) { const g = geometry(st); return st.mirror ? [(-x + g.w / 2 + g.side) * S, (LABEL + g.front + y) * S] : [(x + g.w / 2 + g.side) * S, (LABEL + g.back + g.d - y) * S]; }
export function toM(st, px, py) { const g = geometry(st); return st.mirror ? [-(px / S - g.w / 2 - g.side), py / S - LABEL - g.front] : [px / S - g.w / 2 - g.side, LABEL + g.back + g.d - py / S]; }
export const roundTo = (v, s) => Math.round(v / s) * s;
const fmt = (v) => (Number.isInteger(v) ? String(v) : String(+v.toFixed(2)));

// a smooth line through points, and the point at k (0..1) along it
export function smooth(P) {
  if (P.length < 3) return 'M' + P.map((p) => p.join(' ')).join(' L');
  let d = `M${P[0][0]} ${P[0][1]}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
  }
  return d;
}
export function along(P, k) {
  if (P.length === 2) return [P[0][0] + (P[1][0] - P[0][0]) * k, P[0][1] + (P[1][1] - P[0][1]) * k];
  const segs = P.length - 1, f = Math.min(segs - 1e-9, Math.max(0, k) * segs), i = Math.floor(f), u = f - i;
  const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
  const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
  const b = (a, c, e, h) => (1 - u) ** 3 * a + 3 * (1 - u) ** 2 * u * c + 3 * (1 - u) * u * u * e + u ** 3 * h;
  return [b(p1[0], c1[0], c2[0], p2[0]), b(p1[1], c1[1], c2[1], p2[1])];
}

// ui: { pos, ghost, paths, showPaths:'always'|'selected'|'never', sel:Set, selProp, editing, names, props, propPos, marquee, print, note }
export function renderStage(svg, prod, ui) {
  const st = prod.stage, g = geometry(st), P = (x, y) => toPx(st, x, y);
  svg.setAttribute('viewBox', `0 0 ${g.vw} ${g.vh}`);
  svg.innerHTML = '';
  const id = svg.dataset.uid || (svg.dataset.uid = 's' + Math.random().toString(36).slice(2, 7));
  const defs = el('defs', {}, svg);
  const mk = el('marker', { id: id + 'a', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 4.5, markerHeight: 4.5, orient: 'auto-start-reverse' }, defs);
  el('path', { d: 'M0 0 L10 5 L0 10 Z', fill: 'context-stroke' }, mk);
  const pr = !!ui.print;
  const C = pr ? { band: '#eceef5', floor: '#ffffff', gridIn: '#c9cbd8', gridOut: '#d8dae4', red: '#d92b21', ink: '#111', label: '#666' } : { band: '#474b66', floor: '#272b47', gridIn: '#3a3f5e', gridOut: '#575b76', red: '#ef4b3f', ink: '#e8e8ee', label: '#8d8fa3' };
  // band (wings, backstage, a little apron) and the stage
  const oy = LABEL * S, oh = (g.d + g.back + g.front) * S;
  el('rect', { x: 1.5, y: oy, width: g.vw - 3, height: oh, rx: 14, fill: C.band }, svg);
  const [ax, ay] = P(-g.w / 2, st.mirror ? 0 : g.d);
  el('rect', { x: Math.min(ax, P(g.w / 2, 0)[0]), y: ay, width: g.w * S, height: g.d * S, fill: C.floor }, svg);
  // grid, centred on the middle of the stage
  const gs = st.grid || 1;
  if (st.gridLines !== false) {
    const x0 = 1.5, x1 = g.vw - 1.5, y0 = oy, y1 = oy + oh, sx0 = Math.min(ax, P(g.w / 2, 0)[0]), sx1 = sx0 + g.w * S, sy0 = ay, sy1 = ay + g.d * S;
    for (let x = -Math.floor((g.w / 2 + g.side) / gs) * gs; x <= g.w / 2 + g.side + 1e-6; x += gs) {
      const [px] = P(x, 0); if (px <= x0 + 2 || px >= x1 - 2) continue;
      el('line', { x1: px, y1: y0, x2: px, y2: y1, stroke: C.gridOut, 'stroke-width': 1 }, svg);
      if (px > sx0 && px < sx1) el('line', { x1: px, y1: sy0, x2: px, y2: sy1, stroke: C.gridIn, 'stroke-width': 1 }, svg);
    }
    for (let y = -Math.floor(g.front / gs) * gs; y <= g.d + g.back + 1e-6; y += gs) {
      const [, py] = P(0, y); if (py <= y0 + 2 || py >= y1 - 2) continue;
      el('line', { x1: x0, y1: py, x2: x1, y2: py, stroke: C.gridOut, 'stroke-width': 1 }, svg);
      if (py > sy0 && py < sy1) el('line', { x1: sx0, y1: py, x2: sx1, y2: py, stroke: C.gridIn, 'stroke-width': 1 }, svg);
    }
  }
  el('rect', { x: 1.5, y: oy, width: g.vw - 3, height: oh, rx: 14, fill: 'none', stroke: C.red, 'stroke-width': 3 }, svg);
  // red centre marks on the four edges, and a small cross at the centre
  const cx = g.vw / 2, cyy = oy + oh / 2;
  for (const [a, b, c, d] of [[cx, oy, cx, oy + 14], [cx, oy + oh, cx, oy + oh - 14], [1.5, cyy, 15, cyy], [g.vw - 1.5, cyy, g.vw - 15, cyy]]) el('line', { x1: a, y1: b, x2: c, y2: d, stroke: C.red, 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
  const [mx, my] = P(0, g.d / 2);
  el('path', { d: `M${mx - 6} ${my - 6} L${mx + 6} ${my + 6} M${mx + 6} ${my - 6} L${mx - 6} ${my + 6}`, stroke: C.red, 'stroke-width': 2.2, opacity: 0.85 }, svg);
  // labels above and below
  const top = el('text', { x: cx, y: oy - 0.24 * S, fill: C.label, 'font-size': 15, 'text-anchor': 'middle', 'letter-spacing': 1 }, svg); top.textContent = st.mirror ? 'קהל' : 'אחורי הבמה';
  const bot = el('text', { x: cx, y: oy + oh + 0.46 * S, fill: C.label, 'font-size': 15, 'text-anchor': 'middle', 'letter-spacing': 1 }, svg); bot.textContent = st.mirror ? 'אחורי הבמה' : 'קהל';
  // optional numbers along the front edge (metres from the centre), as on a real stage
  if (st.numbers) for (let x = -Math.floor(g.w / 2); x <= g.w / 2 + 1e-6; x += 1) { const [px, py] = P(x, 0); const t = el('text', { x: px, y: py + (st.mirror ? -6 : 15), fill: C.ink, 'font-size': 12, 'text-anchor': 'middle', opacity: 0.8 }, svg); t.textContent = fmt(Math.abs(x)); }

  // props
  for (const p of ui.props || []) {
    const q = (ui.propPos || {})[p.id]; if (!q) continue;
    const [x, y] = P(q.x, q.y), w = q.w * S, h = q.h * S, sel = ui.selProp === p.id;
    const grp = el('g', { class: 'prop', 'data-prop': p.id, transform: `translate(${x} ${y}) rotate(${q.r || 0})`, opacity: q.o !== undefined ? q.o : null }, svg);
    const fill = q.color || p.color || '#ef4b3f';
    if (p.kind === 'circle') el('ellipse', { rx: w / 2, ry: h / 2, fill, 'fill-opacity': 0.9, stroke: sel ? '#fff' : 'none', 'stroke-width': 3 }, grp);
    else el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: p.kind === 'rounded' ? Math.min(w, h) * 0.3 : 3, fill, 'fill-opacity': 0.9, stroke: sel ? '#fff' : 'none', 'stroke-width': 3 }, grp);
    if (p.label && w > p.label.length * 8 + 6) { const t = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': 14, fill: '#fff', direction: 'rtl' }, grp); t.textContent = p.label; }
    if (sel && ui.editing) el('circle', { class: 'prop-size', cx: w / 2, cy: -h / 2, r: 9, fill: '#fff', stroke: C.red, 'stroke-width': 3 }, grp);
  }

  // where everyone comes from: hollow circles and their routes
  const pos = ui.pos || {}, mode = ui.showPaths || 'selected';
  if (ui.ghost && mode !== 'never') {
    for (const d of prod.dancers) {
      const a = ui.ghost[d.id], b = pos[d.id]; if (!a || !b) continue;
      const sel = ui.sel && ui.sel.has(d.id);
      if (mode === 'selected' && !sel && ui.sel && ui.sel.size) continue;
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.05) continue;
      const pts = [a, ...((ui.paths || {})[d.id] || []), b].map((p) => P(p[0], p[1]));
      el('circle', { cx: pts[0][0], cy: pts[0][1], r: 0.25 * S, fill: 'none', stroke: pr ? '#666' : '#cfd2e6', 'stroke-width': 2 }, svg);
      const L = pts.length, [ex, ey] = pts[L - 1], [px2, py2] = pts[L - 2], dl = Math.hypot(ex - px2, ey - py2) || 1, r = 0.31 * S;
      const route = smooth([...pts.slice(0, -1), [ex - ((ex - px2) / dl) * r, ey - ((ey - py2) / dl) * r]]);
      el('path', { class: 'route', 'data-route': d.id, d: route, fill: 'none', stroke: 'transparent', 'stroke-width': 18 }, svg);
      el('path', { d: route, fill: 'none', stroke: sel ? d.color : pr ? '#444' : '#ffffff', 'stroke-width': sel ? 3 : 2, 'marker-end': `url(#${id}a)`, opacity: sel ? 1 : 0.7, 'pointer-events': 'none' }, svg);
      if (sel && ui.editing) {
        pts.slice(1, -1).forEach((p, i) => el('circle', { class: 'bend', 'data-route': d.id, 'data-i': i, cx: p[0], cy: p[1], r: 8, fill: '#fff', stroke: d.color, 'stroke-width': 3 }, svg));
        // a handle in the middle of each stretch adds a new bend point
        for (let i = 0; i < L - 1; i++) { const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]; el('circle', { class: 'bend-add', 'data-route': d.id, 'data-i': i, cx: m[0], cy: m[1], r: 6, fill: d.color, stroke: '#fff', 'stroke-width': 1.5, opacity: 0.8 }, svg); }
      }
    }
  }

  // dancers
  for (const d of prod.dancers) {
    const q = pos[d.id]; if (!q) continue;
    const [x, y] = P(q[0], q[1]), sel = ui.sel && ui.sel.has(d.id), r = 0.29 * S;
    const grp = el('g', { class: 'dancer', 'data-id': d.id, transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})`, tabindex: ui.editing ? 0 : -1, role: 'button', 'aria-label': d.name }, svg);
    if (ui.alpha && ui.alpha[d.id] !== undefined) grp.setAttribute('opacity', ui.alpha[d.id]);
    if (sel) el('circle', { r: r + 6, fill: 'none', stroke: '#ffffff', 'stroke-width': 3 }, grp);
    el('circle', { r, fill: d.color, stroke: pr ? '#000' : 'rgba(0,0,0,0.3)', 'stroke-width': 1.2 }, grp);
    const t = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 14, 'font-weight': 700, fill: LIGHT.has(d.color) ? '#111' : '#fff' }, grp); t.textContent = d.num || '';
    if (ui.names) { const n = el('text', { y: r + 14, 'text-anchor': 'middle', 'font-size': 13, fill: pr ? '#111' : '#f0f0f5', 'paint-order': 'stroke', stroke: pr ? '#fff' : '#1c1c1e', 'stroke-width': 3.5 }, grp); n.textContent = d.name; }
    if (st.numbers) { const n = el('text', { y: -r - 7, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#ffb3ab', 'paint-order': 'stroke', stroke: pr ? '#fff' : '#1c1c1e', 'stroke-width': 3.5 }, grp); n.textContent = fmt(Math.abs(roundTo(q[0], 0.5))); }
  }
  // alignment guides while dragging: a red line through everyone she lines up with
  for (const gd of ui.guides || []) { const [a, b] = P(gd[0], gd[1]), [c, d] = P(gd[2], gd[3]); el('line', { x1: a, y1: b, x2: c, y2: d, stroke: C.red, 'stroke-width': 1.6, 'stroke-dasharray': '7 5', 'pointer-events': 'none' }, svg); }
  if (ui.marquee) { const m = ui.marquee; el('rect', { x: Math.min(m[0], m[2]), y: Math.min(m[1], m[3]), width: Math.abs(m[2] - m[0]), height: Math.abs(m[3] - m[1]), fill: 'rgba(239,75,63,0.14)', stroke: C.red, 'stroke-dasharray': '6 6', 'stroke-width': 2 }, svg); }
}

// a small picture of a formation for the timeline, the list and the ideas
export function miniStage(prod, pos, opts = {}) {
  const st = prod.stage, g = geometry(st), w = 100, h = Math.round((w * (g.d + g.back + g.front)) / (g.w + 2 * g.side));
  const X = (x) => ((st.mirror ? -x : x) + g.w / 2 + g.side) / (g.w + 2 * g.side) * w, Y = (y) => st.mirror ? ((g.front + y) / (g.d + g.back + g.front)) * h : ((g.back + g.d - y) / (g.d + g.back + g.front)) * h;
  let s = `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true" preserveAspectRatio="xMidYMid meet">`;
  if (opts.frame) s += `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="3" fill="#272b47" stroke="#ef4b3f" stroke-width="0.8"/>`;
  for (const d of prod.dancers) { const q = pos[d.id]; if (q) s += `<circle cx="${X(q[0]).toFixed(1)}" cy="${Y(q[1]).toFixed(1)}" r="${opts.r || 3.2}" fill="${d.color}"/>`; }
  return s + '</svg>';
}
