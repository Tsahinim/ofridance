// OFRIDANCE — drawn move cards: the 3D dancer is photographed once in each move's most expressive pose.
import { createDancer, MOVES } from './dancer3d.js';

const KEY = 'ofridance-thumbs-v2';
function bestTime(m) {
  let best = 0, score = -1;
  for (const [t, p] of m.keys) {
    let s = 0; for (const k in p) if (Array.isArray(p[k])) s += Math.abs(p[k][0]) + Math.abs(p[k][1]) + Math.abs(p[k][2]);
    s += Math.abs(p.lift || 0) * 400 + Math.abs(p.turn || 0) * 0.2;
    if (s > score) { score = s; best = t; }
  }
  return best;
}
export async function moveThumbs() {
  try { const c = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (c && Object.keys(c).length === MOVES.length) return c; } catch (e) {}
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:150px;height:190px;pointer-events:none';
  document.body.appendChild(host);
  const d = createDancer(host, { transparent: true, capture: true, body: '#f2f2f2' });
  d.view('three');
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const out = {};
  for (const m of MOVES) { out[m.id] = d.snapshot(m.id, bestTime(m)); if (Object.keys(out).length % 6 === 0) await new Promise((r) => setTimeout(r, 0)); }
  d.dispose(); host.remove();
  try { sessionStorage.setItem(KEY, JSON.stringify(out)); } catch (e) {}
  return out;
}
