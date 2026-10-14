// OFRIDANCE — formation app, laid out like the formation apps dancers already use:
// a home screen of choreographies (recent, library with crews, ideas to explore); an editor with the stage in the
// middle, undo / redo / music / layers / settings on top, and at the bottom a timeline of formation blocks joined
// by transitions, a playhead with the time, and the play button. Dancers and props come from palettes; routes can
// be bent with points; the piece plays with the music, in 2D or 3D. Hebrew, right to left; time runs left to right.
import { renderStage, miniStage, toM, toPx, roundTo, along } from './fx-stage.js';
import { analyze, filePlayer, youtubePlayer, youtubeId, youtubeProblem, tapper } from './music.js';

const COLORS = ['#ef4b3f', '#ffffff', '#5ce1e6', '#ffd54f', '#7ed957', '#ff66c4', '#3a7bd5', '#ff914d', '#b388ff', '#a1887f', '#00bfa5', '#e91e63', '#cddc39', '#90caf9', '#ff8a80', '#9e9e9e'];
const NAMES = ['נועה', 'מאיה', 'תמר', 'יעל', 'שירה', 'ליה', 'אגם', 'רוני', 'עדי', 'הילה', 'דנה', 'אור', 'שני', 'גאיה', 'אלה', 'רז', 'מיכל', 'ענבר', 'טל', 'נגה'];
const K = { list: 'chg-list-v1', crews: 'chg-crews-v1', item: (id) => 'chg-c-' + id };
const uid = () => Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 7);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o));
const smoothstep = (t) => t * t * (3 - 2 * t);
const PX = 46; // timeline pixels per second at zoom 1
const ICON = {
  back: '<path d="M9 5l7 7-7 7"/>', undo: '<path d="M9 7H4v5"/><path d="M4 12a8 8 0 1 0 3-6.2L4 8"/>', redo: '<path d="M15 7h5v5"/><path d="M20 12a8 8 0 1 1-3-6.2L20 8"/>',
  music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>', layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
  play: '<path d="M7 4l13 8-13 8z" fill="currentColor" stroke="none"/>', pause: '<path d="M7 4h4v16H7zM13 4h4v16h-4z" fill="currentColor" stroke="none"/>',
  props: '<rect x="3" y="3" width="12" height="12" rx="2"/><path d="M9 9h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z"/>', addp: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M19 8v6M16 11h6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', more: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', dup: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/><path d="M14 11v6M11 14h6"/>', grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>', share: '<path d="M4 12v7h16v-7M12 3v12M7 8l5-5 5 5"/>',
};
const icon = (n, label) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>${label ? `<span class="sr-only">${label}</span>` : ''}`;

// ---------- storage ----------
const db = {
  list() { try { const l = JSON.parse(localStorage.getItem(K.list) || 'null'); if (l && l.items) return l; } catch (e) {} return { items: {} }; },
  setList(l) { try { localStorage.setItem(K.list, JSON.stringify(l)); } catch (e) {} },
  load(id) { try { return JSON.parse(localStorage.getItem(K.item(id)) || 'null'); } catch (e) { return null; } },
  save(c) { try { localStorage.setItem(K.item(c.id), JSON.stringify(c)); const l = db.list(); l.items[c.id] = { title: c.title, updated: Date.now(), dancers: c.dancers.length, preview: c.formations[0] ? c.formations[0].pos : {}, stage: c.stage, colors: Object.fromEntries(c.dancers.map((d) => [d.id, d.color])) }; db.setList(l); return true; } catch (e) { return false; } },
  remove(id) { try { localStorage.removeItem(K.item(id)); } catch (e) {} const l = db.list(); delete l.items[id]; db.setList(l); },
  crews() { try { return JSON.parse(localStorage.getItem(K.crews) || '[]'); } catch (e) { return []; } },
  setCrews(c) { try { localStorage.setItem(K.crews, JSON.stringify(c)); } catch (e) {} },
};
const defStage = () => ({ w: 10, d: 8, side: 1.5, back: 1, front: 0.5, grid: 1, gridLines: true, mirror: false, numbers: false });
function line(dancers, d) { const n = dancers.length, pos = {}; dancers.forEach((x, i) => { pos[x.id] = [roundTo((i - (n - 1) / 2) * Math.min(1.25, 8.5 / Math.max(1, n - 1)), 0.25), roundTo(d / 2, 0.5)]; }); return pos; }
function makeChoreo({ title, dancers, stage }) {
  const st = Object.assign(defStage(), stage || {});
  return { id: uid(), v: 3, title, stage: st, dancers, props: [], formations: [{ id: 'f' + uid(), name: 'מערך 1', dur: 4, trans: 2, pos: line(dancers, st.d), paths: {}, note: '', props: {} }], music: null, bpm: 100, showPaths: 'selected', names: true, unit: 'sec' };
}
// pieces from the earlier version of the app come across once
function migrate() {
  if (localStorage.getItem('chg-migrated')) return;
  try {
    const old = JSON.parse(localStorage.getItem('ofridance-stage-lib-v1') || 'null');
    for (const id of Object.keys((old && old.items) || {})) {
      const s = JSON.parse(localStorage.getItem('ofridance-stage-p-' + id) || 'null'); if (!s || !s.formations) continue;
      const w = (s.stage && s.stage.w) || 10, d = (s.stage && s.stage.d) || 8, bpm = (s.music && s.music.bpm) || s.bpm || 100, beat = 60 / bpm;
      const dancers = s.dancers.map((x, i) => ({ id: x.id, name: x.name, color: x.color, num: String(i + 1) }));
      const M = (q) => [roundTo((q[0] - 0.5) * w, 0.01), roundTo((1 - q[1]) * d, 0.01)];
      const formations = s.formations.map((f, i) => { const pos = {}; for (const k in f.pos) pos[k] = M(f.pos[k]); const next = s.formations[i + 1]; return { id: 'f' + uid(), name: f.name || `מערך ${i + 1}`, dur: +(Math.max(0.5, (f.counts - (i ? f.move : 0)) * beat)).toFixed(2), trans: next ? +(Math.max(0, next.move * beat)).toFixed(2) : 2, pos, paths: {}, note: f.note || '', props: {} }; });
      const c = { id: 'm' + id, v: 3, title: s.title || 'הקטע שלי', stage: Object.assign(defStage(), { w, d }), dancers, props: [], formations, music: s.music && s.music.kind === 'youtube' ? s.music : null, bpm, showPaths: 'selected', names: true, unit: 'counts' };
      db.save(c);
    }
  } catch (e) {}
  try { localStorage.setItem('chg-migrated', '1'); } catch (e) {}
}

// ---------- formation ideas for the explore tab ----------
const IDEAS = (() => {
  const mk = (name, n, f) => ({ name, n, pts: Array.from({ length: n }, (_, i) => f(i, n)) });
  const out = [];
  for (const n of [4, 5, 6, 8, 10, 12]) {
    out.push(mk('שורה', n, (i) => [(i - (n - 1) / 2) * Math.min(1.2, 8 / (n - 1)), 3]));
    out.push(mk('וי', n, (i) => { const k = Math.ceil(i / 2), s = i % 2 ? 1 : -1; return [s * k * 0.9, 1.6 + k * 0.8]; }));
    out.push(mk('משולש', n, (i) => { let r = 0, c = i; while (c > r) { c -= r + 1; r++; } return [(c - r / 2) * 1.1, 1.2 + r * 1.1]; }));
    out.push(mk('חלונות', n, (i) => { const per = Math.ceil(n / 2), r = Math.floor(i / per), c = i % per; return [(c - (per - 1) / 2) * 1.6 + (r ? 0.8 : 0), 2 + r * 1.4]; }));
    out.push(mk('מעגל', n, (i) => { const a = (i / n) * Math.PI * 2; return [Math.cos(a) * 2.6, 4 + Math.sin(a) * 2.2]; }));
    out.push(mk('אלכסון', n, (i) => [(i - (n - 1) / 2) * 0.85, 1.4 + i * (5 / Math.max(1, n - 1))]));
    out.push(mk('יהלום', n, (i) => { const a = (i / n) * Math.PI * 2; const r = 2.4 / (Math.abs(Math.cos(a)) + Math.abs(Math.sin(a))); return [Math.cos(a) * r, 4 + Math.sin(a) * r]; }));
  }
  return out;
})();

// ================= the app =================
const app = document.getElementById('chg');
if (app) boot(app);

function boot(app) {
  const $ = (q, r = app) => r.querySelector(q);
  migrate();
  let ch = null, fi = 0, sel = new Set(), selProp = null, t = 0, playing = false, raf = 0, player = null, mode3d = null, drag = null, undo = [], redo = [], zoom = 1, tlSync = false;
  const svg = $('.chg-svg');

  // icons into the buttons that ask for them
  app.querySelectorAll('[data-icon]').forEach((b) => { b.innerHTML = icon(b.dataset.icon, b.getAttribute('aria-label') || '') + (b.dataset.text ? `<span class="t">${b.dataset.text}</span>` : ''); });

  // ================= home =================
  let homeTab = 'recent';
  function home() {
    stop(); if (player) { player.dispose(); player = null; } if (mode3d) { mode3d.dispose(); mode3d = null; }
    ch = null; app.dataset.screen = 'home';
    app.querySelectorAll('[data-home-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.homeTab === homeTab));
    const box = $('.chg-home-body'), q = ($('#chg-search').value || '').trim();
    if (homeTab === 'explore') {
      const n = +($('.chg-ideas-n') && $('.chg-ideas-n').value) || 6;
      box.innerHTML = `<div class="chg-explore-head"><h2>רעיונות למערכים</h2><p>נבחרו בשבילכן. לוחצים כדי לפתוח כוריאוגרפיה חדשה שמתחילה מהמערך הזה.</p><label>מספר רקדניות <select class="chg-ideas-n">${[4, 5, 6, 8, 10, 12].map((k) => `<option${k === n ? ' selected' : ''}>${k}</option>`).join('')}</select></label></div><ul class="chg-cards">${IDEAS.filter((x) => x.n === n).map((x, i) => `<li><button type="button" class="chg-card" data-idea="${IDEAS.indexOf(x)}">${ideaSvg(x)}<b>${x.name}</b><span>${x.n} רקדניות</span></button></li>`).join('')}</ul>`;
      box.querySelector('.chg-ideas-n').addEventListener('change', home);
      box.querySelectorAll('[data-idea]').forEach((b) => b.addEventListener('click', () => { const x = IDEAS[+b.dataset.idea]; const dancers = crewDancers(x.n); const c = makeChoreo({ title: `${x.name} · ${x.n} רקדניות`, dancers }); c.formations[0].pos = Object.fromEntries(dancers.map((d, i) => [d.id, [roundTo(x.pts[i][0], 0.05), roundTo(x.pts[i][1], 0.05)]])); db.save(c); open(c.id); }));
      return;
    }
    if (homeTab === 'library') {
      const crews = db.crews();
      box.innerHTML = `<div class="chg-explore-head"><h2>צוותים</h2><p>רשימות רקדניות לשימוש חוזר: יוצרים פעם אחת, ובוחרים בכל כוריאוגרפיה חדשה.</p><button type="button" class="chg-btn chg-primary" data-new-crew>צוות חדש</button></div>
        <ul class="chg-crews">${crews.length ? crews.map((c, i) => `<li><button type="button" data-crew="${i}"><b>${esc(c.name)}</b><span class="dots">${c.dancers.map((d) => `<i style="background:${d.color}"></i>`).join('')}</span><span>${c.dancers.length} רקדניות</span></button></li>`).join('') : '<li class="chg-empty">עוד אין צוותים.</li>'}</ul>`;
      box.querySelector('[data-new-crew]').addEventListener('click', () => crewSheet(null));
      box.querySelectorAll('[data-crew]').forEach((b) => b.addEventListener('click', () => crewSheet(+b.dataset.crew)));
      return;
    }
    const items = Object.entries(db.list().items).filter(([, it]) => !q || it.title.includes(q)).sort((a, b) => b[1].updated - a[1].updated);
    const when = (ms) => new Date(ms).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
    box.innerHTML = `<ul class="chg-cards">${items.length ? items.map(([id, it]) => `<li><button type="button" class="chg-card" data-open="${id}">${miniStage({ stage: it.stage || defStage(), dancers: Object.entries(it.colors || {}).map(([k, color]) => ({ id: k, color })) }, it.preview || {}, { frame: true, r: 3.4 })}<b>${esc(it.title)}</b><span>${it.dancers} רקדניות · ${when(it.updated)}</span></button><button type="button" class="chg-card-more" data-more="${id}" aria-label="אפשרויות">${icon('more')}</button></li>`).join('') : `<li class="chg-empty">${q ? 'לא נמצאה כוריאוגרפיה בשם הזה.' : 'עוד אין כוריאוגרפיות. לחצו + כדי ליצור את הראשונה.'}</li>`}</ul>`;
    box.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => open(b.dataset.open)));
    box.querySelectorAll('[data-more]').forEach((b) => b.addEventListener('click', (e) => menu(e.currentTarget, [
      ['שינוי שם', () => { const c = db.load(b.dataset.more); const v = prompt('שם הכוריאוגרפיה:', c.title); if (v) { c.title = v.slice(0, 60); db.save(c); home(); } }],
      ['שכפול', () => { const c = db.load(b.dataset.more); c.id = uid(); c.title += ' (עותק)'; db.save(c); home(); }],
      ['מחיקה', () => { const it = db.list().items[b.dataset.more]; if (confirm(`למחוק את "${it.title}"?`)) { db.remove(b.dataset.more); home(); } }],
    ])));
  }
  const ideaSvg = (x) => miniStage({ stage: defStage(), dancers: x.pts.map((_, i) => ({ id: 'i' + i, color: COLORS[i % 4 === 0 ? 0 : i % 2 ? 1 : 2] })) }, Object.fromEntries(x.pts.map((p, i) => ['i' + i, p])), { frame: true, r: 3.6 });
  app.querySelectorAll('[data-home-tab]').forEach((b) => b.addEventListener('click', () => { homeTab = b.dataset.homeTab; home(); }));
  $('#chg-search').addEventListener('input', () => { homeTab = 'recent'; home(); });
  $('#chg-new').addEventListener('click', () => newSheet());

  function crewDancers(n, crew) {
    return Array.from({ length: n }, (_, i) => { const c = crew && crew.dancers[i]; return { id: 'd' + uid(), name: c ? c.name : NAMES[i % NAMES.length], color: c ? c.color : COLORS[i % COLORS.length], num: String(i + 1) }; });
  }
  function newSheet() {
    const crews = db.crews();
    const s = sheet('chg-new-sheet', `<h2>כוריאוגרפיה חדשה</h2>
      <label>שם <input name="title" maxlength="60" value="כוריאוגרפיה חדשה"></label>
      <label>רקדניות <select name="crew"><option value="">רקדניות חדשות</option>${crews.map((c, i) => `<option value="${i}">צוות: ${esc(c.name)} (${c.dancers.length})</option>`).join('')}</select></label>
      <label class="chg-n">כמה רקדניות <input name="n" type="number" min="1" max="40" value="6"></label>
      <div class="chg-row"><label>רוחב הבמה (מ׳) <input name="w" type="number" min="3" max="40" step="0.5" value="10"></label><label>עומק (מ׳) <input name="d" type="number" min="2" max="30" step="0.5" value="8"></label></div>
      <div class="chg-actions"><button type="button" class="chg-btn chg-primary" data-go>יצירה</button><button type="button" class="chg-btn" data-x>ביטול</button></div>`);
    const f = (n) => s.querySelector(`[name="${n}"]`);
    f('crew').addEventListener('change', () => { s.querySelector('.chg-n').hidden = !!f('crew').value; });
    s.querySelector('[data-x]').addEventListener('click', () => s.close());
    s.querySelector('[data-go]').addEventListener('click', () => {
      const crew = f('crew').value ? crews[+f('crew').value] : null;
      const dancers = crewDancers(crew ? crew.dancers.length : clamp(+f('n').value || 6, 1, 40), crew);
      const c = makeChoreo({ title: f('title').value.trim() || 'כוריאוגרפיה חדשה', dancers, stage: { w: clamp(+f('w').value || 10, 3, 40), d: clamp(+f('d').value || 8, 2, 30) } });
      db.save(c); s.close(); open(c.id);
    });
    s.showModal();
  }
  function crewSheet(i) {
    const crews = db.crews(), c = i === null ? { name: 'הצוות שלי', dancers: crewDancers(6) } : clone(crews[i]);
    const s = sheet('chg-crew-sheet', `<h2>${i === null ? 'צוות חדש' : 'עריכת צוות'}</h2><label>שם הצוות <input name="name" maxlength="40" value="${esc(c.name)}"></label>
      <ol class="chg-dlist">${c.dancers.map((d) => dRow(d)).join('')}</ol><button type="button" class="chg-btn" data-add>+ רקדנית</button>
      <div class="chg-actions"><button type="button" class="chg-btn chg-primary" data-save>שמירה</button>${i !== null ? '<button type="button" class="chg-btn" data-del>מחיקת הצוות</button>' : ''}<button type="button" class="chg-btn" data-x>ביטול</button></div>`);
    const list = s.querySelector('.chg-dlist'), wire = () => list.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => b.closest('li').remove()));
    wire();
    s.querySelector('[data-add]').addEventListener('click', () => { const k = list.children.length; list.insertAdjacentHTML('beforeend', dRow({ name: NAMES[k % NAMES.length], color: COLORS[k % COLORS.length] })); wire(); });
    s.querySelector('[data-x]').addEventListener('click', () => s.close());
    const del = s.querySelector('[data-del]'); if (del) del.addEventListener('click', () => { crews.splice(i, 1); db.setCrews(crews); s.close(); home(); });
    s.querySelector('[data-save]').addEventListener('click', () => {
      const nc = { name: s.querySelector('[name="name"]').value.trim() || 'צוות', dancers: [...list.children].map((li) => ({ name: li.querySelector('[data-name]').value.trim() || 'רקדנית', color: li.querySelector('[data-color]').value })) };
      if (i === null) crews.push(nc); else crews[i] = nc; db.setCrews(crews); s.close(); home();
    });
    s.showModal();
  }
  const dRow = (d) => `<li><input type="color" data-color value="${d.color}" aria-label="צבע"><input data-name value="${esc(d.name)}" maxlength="18" aria-label="שם"><button type="button" class="chg-icon" data-rm aria-label="הסרה">${icon('close')}</button></li>`;

  // ================= editor =================
  function open(id) {
    const c = db.load(id); if (!c) { home(); return; }
    ch = c; ch.stage = Object.assign(defStage(), ch.stage); ch.props = ch.props || [];
    fi = 0; t = 0; sel.clear(); selProp = null; undo = []; redo = []; app.dataset.screen = 'editor';
    $('.chg-title').textContent = ch.title;
    if (player) { player.dispose(); player = null; }
    if (ch.music && ch.music.kind === 'youtube') loadYT(ch.music.ytId, true);
    renderAll(); requestAnimationFrame(() => { scrollToTime(0); }); setTimeout(() => tips(false), 400);
  }
  const save = () => { if (ch && !db.save(ch)) toast('הדפדפן מלא. מחקו כוריאוגרפיות ישנות.'); };
  const snap = () => { undo.push(JSON.stringify(ch)); if (undo.length > 120) undo.shift(); redo = []; };
  function restore(from, to) { const s = from.pop(); if (!s) return; to.push(JSON.stringify(ch)); ch = JSON.parse(s); fi = Math.min(fi, ch.formations.length - 1); sel.clear(); selProp = null; renderAll(); save(); }
  $('#chg-undo').addEventListener('click', () => restore(undo, redo));
  $('#chg-redo').addEventListener('click', () => restore(redo, undo));
  $('#chg-back').addEventListener('click', () => { save(); home(); });

  // ---------- time ----------
  const F = () => ch.formations;
  const startOf = (i) => { let s = 0; for (let k = 0; k < i; k++) s += F()[k].dur + F()[k].trans; return s; };
  const total = () => { const L = F().length; return startOf(L - 1) + F()[L - 1].dur; };
  const bpm = () => (ch.music && ch.music.bpm) || ch.bpm || 100;
  function where(tt) { // which formation or transition the time falls in
    let s = 0; const L = F().length;
    for (let i = 0; i < L; i++) {
      const f = F()[i];
      if (tt < s + f.dur || i === L - 1) return { i, inTrans: false, k: 0 };
      if (tt < s + f.dur + f.trans) return { i, inTrans: true, k: (tt - s - f.dur) / f.trans };
      s += f.dur + f.trans;
    }
    return { i: L - 1, inTrans: false, k: 0 };
  }
  function poseAt(tt) {
    const w = where(tt), a = F()[w.i];
    if (!w.inTrans) return { pos: a.pos, props: a.props, w };
    const b = F()[w.i + 1], k = smoothstep(clamp(w.k, 0, 1)), pos = {}, alpha = {}, props = {};
    for (const d of ch.dancers) {
      const p = a.pos[d.id], q = b.pos[d.id];
      if (p && q) pos[d.id] = along([p, ...((b.paths || {})[d.id] || []), q], k);
      else if (q) { pos[d.id] = q; alpha[d.id] = k; } else if (p) { pos[d.id] = p; alpha[d.id] = 1 - k; }
    }
    for (const pr of ch.props) { const p = (a.props || {})[pr.id], q = (b.props || {})[pr.id]; if (p && q) props[pr.id] = { x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k, w: p.w + (q.w - p.w) * k, h: p.h + (q.h - p.h) * k, r: (p.r || 0) + ((q.r || 0) - (p.r || 0)) * k, color: k < 0.5 ? p.color : q.color }; else if (q) props[pr.id] = Object.assign({}, q, { o: k }); else if (p) props[pr.id] = Object.assign({}, p, { o: 1 - k }); }
    return { pos, alpha, props, w };
  }
  const fmtT = (s) => {
    if (ch.unit === 'counts') { const beats = Math.max(0, s - ((ch.music && ch.music.offset) || 0)) * bpm() / 60; return `${Math.floor(beats / 8) + 1}.${Math.floor(beats % 8) + 1}`; }
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  // ---------- drawing ----------
  function draw() {
    if (!ch) return;
    const w = where(t), f = F()[fi], live = playing || w.inTrans;
    const r = live ? poseAt(t) : null;
    const editing = !playing && !w.inTrans;
    renderStage(svg, ch, {
      pos: live ? r.pos : f.pos, alpha: live ? r.alpha : null, props: ch.props, propPos: live ? r.props : f.props,
      ghost: !playing && fi > 0 && !w.inTrans ? F()[fi - 1].pos : null, paths: f.paths, showPaths: ch.showPaths,
      sel, selProp, editing, names: ch.names, marquee: drag && drag.kind === 'frame' ? drag.box : null, guides: drag && drag.kind === 'move' ? drag.guides : null,
    });
    const note = $('.chg-note'); const showNote = !live && f.note; note.hidden = !showNote; if (showNote) note.textContent = f.note;
    if (mode3d) mode3d.update(ch, live ? r.pos : f.pos, live ? r.props : f.props);
    selBar();
  }
  function renderAll() { timeline(); draw(); if (!pal.hidden) palette(); }

  // ---------- the timeline: formation blocks and transitions, playhead in the middle ----------
  const strip = $('.chg-strip'), tl = $('.chg-tl');
  function timeline() {
    const L = F().length; let h = '<div class="chg-pad"></div>';
    F().forEach((f, i) => {
      const on = i === fi;
      const s0 = startOf(i);
      h += `<button type="button" class="chg-block${on ? ' on' : ''}" data-f="${i}" style="width:${Math.max(28, f.dur * PX * zoom)}px" aria-label="${esc(f.name)}, ${f.dur.toFixed(2)} שניות">${miniStage(ch, f.pos, { r: 3 })}<span>${esc(f.name)}</span>${on ? `<i class="h hl" data-h="dur-start"></i><i class="h hr" data-h="dur"></i><em class="tlab te">${fmtT(s0 + f.dur)}</em>` : ''}</button>`;
      if (i < L - 1) h += `<button type="button" class="chg-trans${on || fi === i + 1 ? ' near' : ''}" data-t="${i}" style="width:${Math.max(18, f.trans * PX * zoom)}px" aria-label="מעבר של ${f.trans.toFixed(2)} שניות">${xShape()}${on ? `<i class="h hr" data-h="trans"></i><em class="tlab te">${fmtT(s0 + f.dur + f.trans)}</em>` : ''}</button>`;
    });
    h += `<button type="button" class="chg-add" aria-label="מערך חדש">${icon('plus')}</button><div class="chg-pad"></div>`;
    strip.innerHTML = h;
    strip.querySelectorAll('.chg-pad').forEach((p) => (p.style.width = half() + 'px'));
    if (ch.music && ch.music.peaks) wave();
    else $('.chg-wave').hidden = true;
    pill();
    placeTools();
  }
  const xShape = () => '<svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 4 C50 4 50 36 100 36 M0 36 C50 36 50 4 100 4" fill="none" stroke="currentColor" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>';
  function wave() {
    const cv = $('.chg-wave'); cv.hidden = false; const m = ch.music, w = Math.max(10, total() * PX * zoom), hh = 34, dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = w * dpr; cv.height = hh * dpr; cv.style.width = w + 'px'; cv.style.height = hh + 'px'; cv.style.marginLeft = half() + 'px';
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, hh); g.fillStyle = '#8b8e9e';
    const dur = m.duration || 1, n = m.peaks.length, off = m.start || 0;
    for (let x = 0; x < w; x += 2) { const sec = off + x / (PX * zoom); const i = Math.floor((sec / dur) * n); const v = (m.peaks[i] || 0) * hh * 0.45; g.fillRect(x, hh / 2 - v, 1.4, v * 2 || 1); }
  }
  // the strip scrolls; the playhead stays in the middle of the timeline
  const half = () => tl.clientWidth / 2;
  function scrollToTime(tt) { tlSync = true; tl.scrollLeft = tt * PX * zoom + timeOffsetPx(tt); requestAnimationFrame(() => (tlSync = false)); }
  // block widths have minimums, so map time to pixels through the blocks themselves
  function timeOffsetPx(tt) { let s = 0, px = 0; for (let i = 0; i < F().length; i++) { const f = F()[i]; for (const [len, minW] of [[f.dur, 28], [i < F().length - 1 ? f.trans : 0, 18]]) { if (!len) continue; const w = Math.max(minW, len * PX * zoom); if (tt <= s + len) return px + ((tt - s) / len) * w - tt * PX * zoom; s += len; px += w; } } return px - tt * PX * zoom; }
  function timeAtScroll() { let x = tl.scrollLeft, s = 0; for (let i = 0; i < F().length; i++) { const f = F()[i]; for (const [len, minW] of [[f.dur, 28], [i < F().length - 1 ? f.trans : 0, 18]]) { if (!len) continue; const w = Math.max(minW, len * PX * zoom); if (x <= w) return s + (x / w) * len; x -= w; s += len; } } return total(); }
  tl.addEventListener('scroll', () => {
    if (tlSync || playing) return;
    t = clamp(timeAtScroll(), 0, total()); const w = where(t);
    if (w.i !== fi && !w.inTrans) { fi = w.i; sel.clear(); timeline(); }
    pill(); draw();
  }, { passive: true });
  function pill() { $('.chg-time').textContent = fmtT(t); }
  strip.addEventListener('click', (e) => {
    if (drag && drag.moved) return;
    const b = e.target.closest('[data-f]'), tr = e.target.closest('[data-t]'), add = e.target.closest('.chg-add');
    if (add) { addFormation(); return; }
    if (b) { stop(); const i = +b.dataset.f; if (i === fi) { toolsOpen = !toolsOpen; placeTools(); return; } fi = i; sel.clear(); t = startOf(i); toolsOpen = true; timeline(); scrollToTime(t); draw(); return; }
    if (tr) { stop(); const i = +tr.dataset.t; fi = i + 1; t = startOf(i + 1); sel.clear(); timeline(); scrollToTime(t); draw(); toast('גררו את הנקודות על הבמה כדי לעקם מסלול. עוד אפשרויות בלחיצה על רקדנית.'); }
  });
  // drag the red handles to change how long a formation holds and how long the transition takes
  strip.addEventListener('pointerdown', (e) => {
    const h = e.target.closest('.h'); if (!h) return; e.preventDefault(); e.stopPropagation();
    snap(); const f = F()[fi]; drag = { kind: 'dur', h: h.dataset.h, x0: e.clientX, dur: f.dur, trans: f.trans, moved: false };
    strip.setPointerCapture(e.pointerId);
  });
  strip.addEventListener('pointermove', (e) => {
    if (!drag || drag.kind !== 'dur') return; const f = F()[fi], ds = (e.clientX - drag.x0) / (PX * zoom); drag.moved = true;
    if (drag.h === 'dur') f.dur = +clamp(roundTo(drag.dur + ds, 0.01), 0.25, 600).toFixed(2);
    if (drag.h === 'dur-start') f.dur = +clamp(roundTo(drag.dur - ds, 0.01), 0.25, 600).toFixed(2);
    if (drag.h === 'trans') f.trans = +clamp(roundTo(drag.trans + ds, 0.01), 0, 120).toFixed(2);
    timeline(); $('.chg-time').textContent = drag.h === 'trans' ? `מעבר ${f.trans.toFixed(2)}` : `${f.dur.toFixed(2)} שנ׳`;
  });
  const endDur = () => { if (drag && drag.kind === 'dur') { const m = drag.moved; drag = null; if (!m) undo.pop(); else { save(); setTimeout(() => pill(), 600); } setTimeout(() => { drag = null; }, 0); } };
  strip.addEventListener('pointerup', endDur); strip.addEventListener('pointercancel', endDur);
  // ctrl + wheel zooms the timeline
  tl.addEventListener('wheel', (e) => { if (!e.ctrlKey) return; e.preventDefault(); zoom = clamp(zoom * (e.deltaY < 0 ? 1.15 : 0.87), 0.3, 5); timeline(); scrollToTime(t); }, { passive: false });

  // the red pill above the selected formation: edit, delete, more
  let toolsOpen = true;
  function placeTools() {
    const tools = $('.chg-ftools'), b = strip.querySelector(`.chg-block[data-f="${fi}"]`);
    tools.hidden = !b || playing || !toolsOpen; if (tools.hidden) return;
    const r = b.getBoundingClientRect(), pr = tools.parentElement.getBoundingClientRect();
    tools.style.left = clamp(r.left - pr.left, 4, pr.width - 140) + 'px';
  }
  tl.addEventListener('scroll', placeTools, { passive: true });
  $('#chg-f-edit').addEventListener('click', () => duplicate());
  $('#chg-f-del').addEventListener('click', () => { if (F().length <= 1) { toast('זה המערך היחיד.'); return; } snap(); F().splice(fi, 1); fi = Math.max(0, fi - 1); t = startOf(fi); renderAll(); scrollToTime(t); save(); });
  $('#chg-f-more').addEventListener('click', (e) => menu(e.currentTarget, [
    ['שם, הערה ומשך', () => formationSheet()],
    ['הזזה שמאלה (מוקדם יותר)', () => moveF(-1)], ['הזזה ימינה (מאוחר יותר)', () => moveF(1)],
    ['היפוך ימין ושמאל', () => { snap(); const f = F()[fi]; for (const k in f.pos) f.pos[k] = [-f.pos[k][0], f.pos[k][1]]; renderAll(); save(); }],
    ['העתקת העמדות מהמערך הקודם', () => { if (!fi) return; snap(); F()[fi].pos = clone(F()[fi - 1].pos); renderAll(); save(); }],
    ['תמונה של המערך', () => exportPng()],
  ]));
  function moveF(d) { const j = fi + d; if (j < 0 || j >= F().length) return; snap(); [F()[fi], F()[j]] = [F()[j], F()[fi]]; fi = j; t = startOf(fi); renderAll(); scrollToTime(t); save(); }
  function addFormation() {
    stop(); snap(); const last = F()[F().length - 1];
    F().push({ id: 'f' + uid(), name: `מערך ${F().length + 1}`, dur: last.dur, trans: 2, pos: clone(last.pos), paths: {}, note: '', props: clone(last.props || {}) });
    if (last.trans === undefined || last.trans === 0) last.trans = 2;
    fi = F().length - 1; t = startOf(fi); sel.clear(); renderAll(); scrollToTime(t); save();
    toast('מערך חדש. גררו את הרקדניות למקום החדש.');
  }
  function duplicate() { stop(); snap(); const f = clone(F()[fi]); f.id = 'f' + uid(); f.name += ' (עותק)'; F().splice(fi + 1, 0, f); fi++; t = startOf(fi); renderAll(); scrollToTime(t); save(); }
  function formationSheet() {
    const f = F()[fi];
    const s = sheet('chg-f-sheet', `<h2>${esc(f.name)}</h2><label>שם המערך <input name="name" maxlength="30" value="${esc(f.name)}"></label>
      <label>הערה למערך (מופיעה על הבמה) <textarea name="note" rows="2" maxlength="160" placeholder="למשל: לאט, נמסות מהפוזה">${esc(f.note || '')}</textarea></label>
      <div class="chg-row"><label>משך המערך (שניות) <input name="dur" type="number" step="0.01" min="0.25" value="${f.dur}"></label><label>משך המעבר אחריו (שניות) <input name="trans" type="number" step="0.01" min="0" value="${f.trans}"></label></div>
      <p class="chg-hint">${ch.music ? `בקצב של השיר (${bpm()}), שמינייה היא ${(480 / bpm()).toFixed(2)} שניות.` : `בקצב ${bpm()}, שמינייה היא ${(480 / bpm()).toFixed(2)} שניות.`} <button type="button" class="chg-link" data-eight>משך המערך: שמינייה אחת</button></p>
      <div class="chg-actions"><button type="button" class="chg-btn chg-primary" data-ok>שמירה</button><button type="button" class="chg-btn" data-x>ביטול</button></div>`);
    s.querySelector('[data-x]').addEventListener('click', () => s.close());
    s.querySelector('[data-eight]').addEventListener('click', () => { s.querySelector('[name="dur"]').value = (480 / bpm()).toFixed(2); });
    s.querySelector('[data-ok]').addEventListener('click', () => { snap(); f.name = s.querySelector('[name="name"]').value.trim() || f.name; f.note = s.querySelector('[name="note"]').value.trim(); f.dur = clamp(+s.querySelector('[name="dur"]').value || f.dur, 0.25, 600); f.trans = clamp(+s.querySelector('[name="trans"]').value || 0, 0, 120); s.close(); renderAll(); save(); });
    s.showModal();
  }

  // ---------- the stage: select, drag, frame, bend routes, props ----------
  const ptM = (e) => { const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal; return toM(ch.stage, ((e.clientX - r.left) / r.width) * vb.width, ((e.clientY - r.top) / r.height) * vb.height); };
  const ptPx = (e) => { const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal; return [((e.clientX - r.left) / r.width) * vb.width, ((e.clientY - r.top) / r.height) * vb.height]; };
  const editable = () => ch && !playing && !where(t).inTrans;
  let lastTap = { id: null, at: 0 };
  svg.addEventListener('pointerdown', (e) => {
    if (!ch) return;
    if (!editable()) { if (where(t).inTrans) { t = startOf(fi); scrollToTime(t); draw(); } return; }
    const f = F()[fi], m = ptM(e), dEl = e.target.closest('.dancer'), pEl = e.target.closest('.prop'), add = e.shiftKey || e.ctrlKey || e.metaKey;
    if (e.target.classList.contains('bend') || e.target.classList.contains('bend-add')) {
      snap(); const id = e.target.dataset.route, i = +e.target.dataset.i; f.paths = f.paths || {}; f.paths[id] = f.paths[id] || [];
      if (e.target.classList.contains('bend-add')) f.paths[id].splice(i, 0, m);
      drag = { kind: 'bend', id, i, moved: true }; svg.setPointerCapture(e.pointerId); draw(); return;
    }
    if (e.target.classList.contains('prop-size')) { snap(); drag = { kind: 'psize', id: pEl.dataset.prop, moved: false }; svg.setPointerCapture(e.pointerId); return; }
    const rEl = e.target.closest('.route');
    if (rEl) { e.preventDefault(); pathMenu(rEl.dataset.route, e); return; }
    if (dEl) {
      const id = dEl.dataset.id;
      if (add) { sel.has(id) ? sel.delete(id) : sel.add(id); }
      else if (!sel.has(id)) sel = new Set([id]);
      selProp = null; snap();
      drag = { kind: 'move', start: m, orig: new Map([...sel].filter((x) => f.pos[x]).map((x) => [x, f.pos[x].slice()])), moved: false, tapId: id };
      svg.setPointerCapture(e.pointerId); draw(); e.preventDefault(); return;
    }
    if (pEl) { const pid = pEl.dataset.prop, q = f.props[pid]; selProp = pid; sel.clear(); snap(); drag = { kind: 'prop', start: m, orig: [q.x, q.y], moved: false }; svg.setPointerCapture(e.pointerId); draw(); return; }
    if (!add) { sel.clear(); selProp = null; }
    const p = ptPx(e); drag = { kind: 'frame', a: p, box: [p[0], p[1], p[0], p[1]], base: new Set(sel) }; svg.setPointerCapture(e.pointerId); draw();
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drag || !ch || drag.kind === 'dur') return; const f = F()[fi], m = ptM(e);
    if (drag.kind === 'frame') {
      const p = ptPx(e); drag.box = [drag.a[0], drag.a[1], p[0], p[1]];
      const [x0, x1] = [Math.min(drag.a[0], p[0]), Math.max(drag.a[0], p[0])], [y0, y1] = [Math.min(drag.a[1], p[1]), Math.max(drag.a[1], p[1])];
      sel = new Set(drag.base); for (const d of ch.dancers) { const q = f.pos[d.id]; if (!q) continue; const [px, py] = toPx(ch.stage, q[0], q[1]); if (px >= x0 && px <= x1 && py >= y0 && py <= y1) sel.add(d.id); }
      draw(); return;
    }
    if (drag.kind === 'bend') { f.paths[drag.id][drag.i] = [roundTo(m[0], 0.05), roundTo(m[1], 0.05)]; draw(); return; }
    if (drag.kind === 'psize') { const q = f.props[drag.id]; q.w = Math.max(0.2, roundTo(Math.abs(m[0] - q.x) * 2, 0.05)); q.h = Math.max(0.2, roundTo(Math.abs(m[1] - q.y) * 2, 0.05)); drag.moved = true; draw(); return; }
    const dx = m[0] - drag.start[0], dy = m[1] - drag.start[1]; if (Math.abs(dx) + Math.abs(dy) > 0.03) drag.moved = true; if (!drag.moved) return;
    const snapOn = ch.stage.snap !== false, st = ch.stage.grid / 4, lim = ch.stage.w / 2 + ch.stage.side - 0.3;
    if (drag.kind === 'prop') { const q = f.props[selProp]; q.x = snapOn ? roundTo(drag.orig[0] + dx, st) : drag.orig[0] + dx; q.y = snapOn ? roundTo(drag.orig[1] + dy, st) : drag.orig[1] + dy; draw(); return; }
    // geometry first: lock onto the line of another dancer, onto the mirror spot across the centre, else onto the grid
    let gdx = 0, gdy = 0; drag.guides = [];
    if (drag.orig.size === 1 && !e.altKey) {
      const [id0, o0] = [...drag.orig][0], x = o0[0] + dx, y = o0[1] + dy, thr = 0.14, others = ch.dancers.filter((d) => d.id !== id0 && f.pos[d.id]).map((d) => f.pos[d.id]);
      let bx = null, by = null;
      for (const q of others) {
        if (Math.abs(q[0] - x) < thr && (bx === null || Math.abs(q[0] - x) < Math.abs(bx - x))) bx = q[0];
        if (Math.abs(-q[0] - x) < thr && Math.abs(q[1] - y) < thr && bx === null) { bx = -q[0]; by = q[1]; }
        if (Math.abs(q[1] - y) < thr && (by === null || Math.abs(q[1] - y) < Math.abs(by - y))) by = q[1];
      }
      if (Math.abs(x) < thr && bx === null) bx = 0;
      if (bx !== null) { gdx = bx - x; drag.guides.push([bx, -ch.stage.front, bx, ch.stage.d + ch.stage.back]); }
      if (by !== null) { gdy = by - y; drag.guides.push([-ch.stage.w / 2 - ch.stage.side, by, ch.stage.w / 2 + ch.stage.side, by]); }
      if (bx === null && snapOn) gdx = roundTo(x, st) - x;
      if (by === null && snapOn) gdy = roundTo(y, st) - y;
      f.pos[id0] = [clamp(x + gdx, -lim, lim), clamp(y + gdy, -ch.stage.front + 0.3, ch.stage.d + ch.stage.back - 0.3)];
    } else drag.orig.forEach((o, id) => { let x = o[0] + dx, y = o[1] + dy; if (snapOn) { x = roundTo(x, st); y = roundTo(y, st); } f.pos[id] = [clamp(x, -lim, lim), clamp(y, -ch.stage.front + 0.3, ch.stage.d + ch.stage.back - 0.3)]; });
    draw();
  });
  const endStage = (e) => {
    if (!drag || drag.kind === 'dur') return; const k = drag; drag = null;
    if (k.kind === 'frame') { draw(); return; }
    if (!k.moved) {
      undo.pop();
      // a second tap on the same dancer opens her card
      if (k.kind === 'move' && k.tapId) { const now = Date.now(); if (lastTap.id === k.tapId && now - lastTap.at < 450) dancerSheet(k.tapId); lastTap = { id: k.tapId, at: now }; }
      if (k.kind === 'prop' && e && e.detail === 2) propSheet(selProp);
      draw(); return;
    }
    timeline(); draw(); save();
  };
  svg.addEventListener('pointerup', endStage); svg.addEventListener('pointercancel', endStage);
  svg.addEventListener('dblclick', (e) => { const b = e.target.closest('.bend'); if (b) { const f = F()[fi]; snap(); f.paths[b.dataset.route].splice(+b.dataset.i, 1); draw(); save(); } });
  svg.addEventListener('contextmenu', (e) => { e.preventDefault(); const d = e.target.closest('.dancer'); if (d) { sel = new Set([d.dataset.id]); draw(); dancerSheet(d.dataset.id); } const p = e.target.closest('.prop'); if (p) propSheet(p.dataset.prop); });
  // long press on a dancer opens her card on touch screens
  let lp = null; svg.addEventListener('touchstart', (e) => { const d = e.target.closest('.dancer'); if (!d) return; lp = setTimeout(() => { drag = null; dancerSheet(d.dataset.id); }, 650); }, { passive: true });
  ['touchend', 'touchmove'].forEach((ev) => svg.addEventListener(ev, () => clearTimeout(lp), { passive: true }));

  // the route of one dancer into this formation: straight, a curve, an arc, or free points
  function pathMenu(id, e) {
    const f = F()[fi], a = F()[fi - 1] && F()[fi - 1].pos[id], b = f.pos[id]; if (!a || !b) return;
    sel = new Set([id]); draw();
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
    const set = (pts) => { snap(); f.paths = f.paths || {}; if (pts) f.paths[id] = pts; else delete f.paths[id]; draw(); save(); };
    const anchor = { getBoundingClientRect: () => ({ left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY, width: 0, height: 0 }) };
    menu(anchor, [
      ['ישר', () => set(null)],
      ['עקומה (נקודת אחיזה אחת)', () => { set([[mid[0] + nx * len * 0.3, mid[1] + ny * len * 0.3]]); toast('גררו את הנקודה הלבנה כדי לעקם.'); }],
      ['קשת', () => { const r = len * 0.42; set([[a[0] + (b[0] - a[0]) * 0.25 + nx * r * 0.8, a[1] + (b[1] - a[1]) * 0.25 + ny * r * 0.8], [mid[0] + nx * r, mid[1] + ny * r], [a[0] + (b[0] - a[0]) * 0.75 + nx * r * 0.8, a[1] + (b[1] - a[1]) * 0.75 + ny * r * 0.8]]); }],
      ['קשת לצד השני', () => { const r = -len * 0.42; set([[a[0] + (b[0] - a[0]) * 0.25 + nx * r * 0.8, a[1] + (b[1] - a[1]) * 0.25 + ny * r * 0.8], [mid[0] + nx * r, mid[1] + ny * r], [a[0] + (b[0] - a[0]) * 0.75 + nx * r * 0.8, a[1] + (b[1] - a[1]) * 0.75 + ny * r * 0.8]]); }],
      ['מסלול עם כמה נקודות', () => { set([[a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3], [a[0] + ((b[0] - a[0]) * 2) / 3, a[1] + ((b[1] - a[1]) * 2) / 3]]); toast('גררו כל נקודה. העיגולים הקטנים בין הנקודות מוסיפים עוד נקודה, ולחיצה כפולה מוחקת נקודה.'); }],
    ]);
  }

  // the bar that appears when dancers are selected
  function colorRow() {
    const row = $('.chg-colors'); if (!row) return; const f = F()[fi];
    const used = [...new Set(ch.dancers.filter((d) => f.pos[d.id]).map((d) => d.color))];
    row.hidden = used.length < 2 || !editable();
    row.innerHTML = used.map((c) => `<button type="button" style="background:${c}" data-col="${c}" aria-label="לבחור את כל הרקדניות בצבע הזה"></button>`).join('');
    row.querySelectorAll('[data-col]').forEach((b) => b.addEventListener('click', () => { sel = new Set(ch.dancers.filter((d) => d.color === b.dataset.col && f.pos[d.id]).map((d) => d.id)); draw(); }));
  }
  function selBar() {
    colorRow();
    const bar = $('.chg-selbar'); const n = sel.size;
    bar.hidden = !n || !editable(); if (bar.hidden) return;
    $('.chg-seln').textContent = n === 1 ? ch.dancers.find((d) => sel.has(d.id))?.name || '' : `${n} נבחרו`;
  }
  $('#chg-sel-card').addEventListener('click', () => { if (sel.size === 1) dancerSheet([...sel][0]); else colorPick(); });
  $('#chg-sel-align').addEventListener('click', (e) => menu(e.currentTarget, [
    ['יישור לשורה', () => align('row')], ['יישור לטור', () => align('col')], ['ריווח שווה לרוחב', () => align('dx')], ['ריווח שווה לעומק', () => align('dy')],
    ['היפוך ימין ושמאל', () => align('flip')], ['סיבוב 15° ימינה', () => align('rotR')], ['סיבוב 15° שמאלה', () => align('rotL')], ['לבחור את כל אותו צבע', () => byColor()],
  ]));
  $('#chg-sel-off').addEventListener('click', () => { snap(); const f = F()[fi]; sel.forEach((id) => delete f.pos[id]); sel.clear(); timeline(); draw(); save(); toast('הוצאו מהמערך הזה. הן נשארות בשאר המערכים.'); });
  $('#chg-sel-none').addEventListener('click', () => { sel.clear(); draw(); });
  function align(k) {
    const f = F()[fi], ids = [...sel].filter((id) => f.pos[id]); if (!ids.length) return; snap();
    const xs = ids.map((id) => f.pos[id][0]), ys = ids.map((id) => f.pos[id][1]), avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
    if (k === 'row') ids.forEach((id) => (f.pos[id][1] = avg(ys)));
    if (k === 'col') ids.forEach((id) => (f.pos[id][0] = avg(xs)));
    if (k === 'dx' || k === 'dy') { const a = k === 'dx' ? 0 : 1, s = ids.slice().sort((p, q) => f.pos[p][a] - f.pos[q][a]), lo = f.pos[s[0]][a], hi = f.pos[s[s.length - 1]][a]; s.forEach((id, i) => (f.pos[id][a] = lo + ((hi - lo) * i) / Math.max(1, s.length - 1))); }
    if (k === 'flip') { const mid = (Math.min(...xs) + Math.max(...xs)) / 2; ids.forEach((id) => (f.pos[id][0] = 2 * mid - f.pos[id][0])); }
    if (k === 'rotR' || k === 'rotL') { const a = ((k === 'rotR' ? -1 : 1) * Math.PI) / 12, cx = avg(xs), cy = avg(ys); ids.forEach((id) => { const X = f.pos[id][0] - cx, Y = f.pos[id][1] - cy; f.pos[id] = [cx + X * Math.cos(a) - Y * Math.sin(a), cy + X * Math.sin(a) + Y * Math.cos(a)]; }); }
    timeline(); draw(); save();
  }
  function byColor() { const c = ch.dancers.find((d) => sel.has(d.id))?.color; if (!c) return; sel = new Set(ch.dancers.filter((d) => d.color === c && F()[fi].pos[d.id]).map((d) => d.id)); draw(); }
  function colorPick() {
    const s = sheet('chg-color-sheet', `<h2>צבע ל־${sel.size} רקדניות</h2><div class="chg-swatches">${COLORS.map((c) => `<button type="button" style="background:${c}" data-c="${c}" aria-label="צבע ${c}"></button>`).join('')}</div><div class="chg-actions"><button type="button" class="chg-btn" data-x>סגירה</button></div>`);
    s.querySelector('[data-x]').addEventListener('click', () => s.close());
    s.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => { snap(); ch.dancers.forEach((d) => { if (sel.has(d.id)) d.color = b.dataset.c; }); s.close(); renderAll(); save(); }));
    s.showModal();
  }

  // ---------- dancers: the palette, adding, the dancer card ----------
  // ---------- the palette beside the stage: dancers and props, tap to add or drag onto the stage ----------
  const pal = $('.chg-palette');
  let palTab = 'dancers';
  function palette(tab) {
    if (tab) palTab = tab;
    const open = !pal.hidden, f = F()[fi];
    $('#chg-dancers').setAttribute('aria-pressed', open && palTab === 'dancers'); $('#chg-props').setAttribute('aria-pressed', open && palTab === 'props');
    if (!open) return;
    pal.querySelectorAll('[data-ptab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.ptab === palTab));
    const body = pal.querySelector('.chg-pal-body');
    if (palTab === 'dancers') {
      body.innerHTML = `<div class="chg-tiles">${ch.dancers.map((d) => `<button type="button" class="chg-tile${f.pos[d.id] ? ' on' : ''}" data-d="${d.id}" title="לחיצה: להעלות או לבחור. גרירה: למקם על הבמה. לחיצה כפולה: עריכה"><i style="background:${d.color}">${esc(d.num || '')}</i><span>${esc(d.name)}</span><small>${f.pos[d.id] ? 'על הבמה' : 'לא במערך'}</small></button>`).join('')}</div>
        <div class="chg-pal-actions"><button type="button" class="chg-btn chg-primary" data-new>+ רקדנית</button><button type="button" class="chg-btn" data-all>כולן למערך</button><button type="button" class="chg-btn" data-crew>שמירה כצוות</button></div>`;
      body.querySelectorAll('[data-d]').forEach((b) => { dragTile(b, { dancer: b.dataset.d }); b.addEventListener('dblclick', () => dancerSheet(b.dataset.d)); });
      body.querySelector('[data-all]').addEventListener('click', () => { snap(); ch.dancers.forEach((d) => { if (!f.pos[d.id]) f.pos[d.id] = freeSpot(f); }); renderAll(); palette(); save(); });
      body.querySelector('[data-new]').addEventListener('click', () => { snap(); const n = ch.dancers.length; const d = { id: 'd' + uid(), name: NAMES[n % NAMES.length], color: COLORS[n % COLORS.length], num: String(n + 1) }; ch.dancers.push(d); F().forEach((x) => { x.pos[d.id] = freeSpot(x); }); sel = new Set([d.id]); renderAll(); palette(); save(); dancerSheet(d.id); });
      body.querySelector('[data-crew]').addEventListener('click', () => { const name = prompt('שם הצוות:', ch.title); if (!name) return; const crews = db.crews(); crews.push({ name, dancers: ch.dancers.map((d) => ({ name: d.name, color: d.color })) }); db.setCrews(crews); toast('הצוות נשמר בספרייה.'); });
    } else {
      const shapes = [['square', 'ריבוע', '<rect x="8" y="8" width="24" height="24" rx="2"/>'], ['rounded', 'מעוגל', '<rect x="12" y="6" width="16" height="28" rx="6"/>'], ['circle', 'עיגול', '<circle cx="20" cy="20" r="13"/>'], ['wide', 'מלבן', '<rect x="5" y="13" width="30" height="14" rx="3"/>'], ['chair', 'כיסא', '<rect x="12" y="12" width="16" height="16" rx="2"/>'], ['podium', 'במה מוגבהת', '<rect x="7" y="10" width="26" height="20" rx="2"/>'], ['table', 'שולחן', '<rect x="5" y="14" width="30" height="12" rx="2"/>'], ['wall', 'קיר תפאורה', '<rect x="3" y="17" width="34" height="6" rx="1"/>']];
      body.innerHTML = `<div class="chg-tiles chg-shapes">${shapes.map(([k, n, svgp]) => `<button type="button" data-k="${k}" title="לחיצה: להוסיף. גרירה: למקם על הבמה"><svg viewBox="0 0 40 40">${svgp}</svg>${n}</button>`).join('')}</div>
        ${propsOut().length ? `<h3>מחוץ למערך הזה</h3><div class="chg-pal-actions">${propsOut().map((x) => `<button type="button" class="chg-btn" data-back="${x.id}">להחזיר: ${esc(x.label || 'פריט')}</button>`).join('')}</div>` : ''}
        <p class="chg-hint">פריט נכנס לכל המערכים. בכל מערך אפשר להזיז אותו, לשנות גודל וצבע, או להוציא אותו, והוא זז במעבר.</p>`;
      body.querySelectorAll('[data-k]').forEach((b) => dragTile(b, { prop: b.dataset.k }));
      body.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => { snap(); const id = b.dataset.back, src = F().map((x) => (x.props || {})[id]).find(Boolean); f.props = f.props || {}; f.props[id] = src ? clone(src) : { x: 0, y: ch.stage.d / 2, w: 1, h: 1, r: 0, color: COLORS[0] }; draw(); palette(); save(); }));
    }
  }
  pal.querySelectorAll('[data-ptab]').forEach((b) => b.addEventListener('click', () => palette(b.dataset.ptab)));
  pal.querySelector('[data-pclose]').addEventListener('click', () => { pal.hidden = true; palette(); });
  const togglePal = (tab) => { if (!pal.hidden && palTab === tab) pal.hidden = true; else pal.hidden = false; palette(tab); };
  $('#chg-dancers').addEventListener('click', () => togglePal('dancers'));
  $('#chg-props').addEventListener('click', () => togglePal('props'));
  // a tile: a tap adds it, a drag places it exactly where it is dropped on the stage
  function dragTile(tile, what) {
    tile.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const x0 = e.clientX, y0 = e.clientY; let ghost = null;
      const move = (ev) => {
        if (!ghost && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 6) {
          ghost = document.createElement('div'); ghost.className = 'chg-ghost';
          if (what.dancer) { const d = ch.dancers.find((x) => x.id === what.dancer); ghost.style.background = d.color; ghost.textContent = d.num || ''; } else ghost.classList.add('prop');
          document.body.appendChild(ghost);
        }
        if (ghost) { ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; }
      };
      const up = (ev) => {
        document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up);
        const r = svg.getBoundingClientRect(), onStage = ghost && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
        if (ghost) ghost.remove();
        if (ghost && !onStage) return;
        const at = onStage ? ptM(ev).map((v) => roundTo(v, (ch.stage.grid || 1) / 4)) : null;
        if (what.dancer) placeDancer(what.dancer, at); else addProp(what.prop, at);
      };
      document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
    });
  }
  function placeDancer(id, at) {
    const f = F()[fi];
    if (f.pos[id] && !at) { sel = new Set([id]); draw(); return; }
    if (!editable()) { t = startOf(fi); scrollToTime(t); }
    snap(); f.pos[id] = at || freeSpot(f); sel = new Set([id]); renderAll(); palette(); save();
  }
  function addProp(k, at) {
    snap(); const size = { square: [1, 1], rounded: [0.6, 1.2], circle: [1, 1], wide: [2, 0.7], chair: [0.5, 0.5], podium: [2, 1.5], table: [1.6, 0.8], wall: [4, 0.25] }[k];
    const pr = { id: 'p' + uid(), kind: k === 'rounded' || k === 'circle' ? k : 'rect', label: { chair: 'כיסא', podium: 'במה מוגבהת', table: 'שולחן', wall: 'קיר' }[k] || '' };
    ch.props.push(pr); const color = ['#ef4b3f', '#3a7bd5', '#8a6d5a', '#7ed957', '#b388ff'][(ch.props.length - 1) % 5];
    F().forEach((f) => { f.props = f.props || {}; f.props[pr.id] = { x: at ? at[0] : 0, y: at ? at[1] : roundTo(ch.stage.d * 0.75, 0.5), w: size[0], h: size[1], r: 0, color }; });
    selProp = pr.id; sel.clear(); draw(); palette(); save();
  }
  function freeSpot(f) { const y = roundTo(ch.stage.d / 2, 0.5), taken = Object.values(f.pos); for (let k = 0; k < 40; k++) { const x = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.75; if (!taken.some((p) => Math.hypot(p[0] - x, p[1] - y) < 0.6)) return [x, y]; } return [0, y]; }
  function dancerSheet(id) {
    const d = ch.dancers.find((x) => x.id === id); if (!d) return;
    const s = sheet('chg-dancer-sheet', `<h2><i class="chg-dot" style="background:${d.color}"></i>${esc(d.name)}</h2>
      <div class="chg-row"><label>שם <input name="name" maxlength="18" value="${esc(d.name)}"></label><label>מספר על העיגול <input name="num" maxlength="3" value="${esc(d.num || '')}"></label></div>
      <div class="chg-swatches">${COLORS.map((c) => `<button type="button" style="background:${c}" data-c="${c}" aria-pressed="${c === d.color}" aria-label="צבע"></button>`).join('')}</div>
      <div class="chg-actions"><button type="button" class="chg-btn chg-primary" data-ok>שמירה</button><button type="button" class="chg-btn" data-off>הוצאה מהמערך הזה</button><button type="button" class="chg-btn" data-del>מחיקה מהכוריאוגרפיה</button><button type="button" class="chg-btn" data-x>ביטול</button></div>`);
    let color = d.color;
    s.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => { color = b.dataset.c; s.querySelectorAll('[data-c]').forEach((x) => x.setAttribute('aria-pressed', x === b)); }));
    s.querySelector('[data-x]').addEventListener('click', () => s.close());
    s.querySelector('[data-ok]').addEventListener('click', () => { snap(); d.name = s.querySelector('[name="name"]').value.trim() || d.name; d.num = s.querySelector('[name="num"]').value.trim(); d.color = color; s.close(); renderAll(); save(); });
    s.querySelector('[data-off]').addEventListener('click', () => { snap(); delete F()[fi].pos[id]; sel.delete(id); s.close(); renderAll(); save(); });
    s.querySelector('[data-del]').addEventListener('click', () => { if (!confirm(`למחוק את ${d.name} מכל המערכים?`)) return; snap(); ch.dancers = ch.dancers.filter((x) => x.id !== id); F().forEach((f) => { delete f.pos[id]; if (f.paths) delete f.paths[id]; }); sel.delete(id); s.close(); renderAll(); save(); });
    s.showModal();
  }

  // ---------- props ----------
  function propsOut() { const f = F()[fi]; return ch.props.filter((p) => !(f.props || {})[p.id]); }
  function propSheet(id) {
    const p = ch.props.find((x) => x.id === id), q = F()[fi].props[id]; if (!p || !q) return;
    const s = sheet('chg-prop-sheet', `<h2>פריט תפאורה</h2><label>שם (לא חובה) <input name="label" maxlength="20" value="${esc(p.label || '')}"></label>
      <div class="chg-row"><label>רוחב (מ׳) <input name="w" type="number" step="0.05" min="0.2" value="${q.w}"></label><label>עומק (מ׳) <input name="h" type="number" step="0.05" min="0.2" value="${q.h}"></label><label>סיבוב <input name="r" type="number" step="15" value="${q.r || 0}"></label></div>
      <div class="chg-swatches">${COLORS.map((c) => `<button type="button" style="background:${c}" data-c="${c}" aria-pressed="${c === q.color}" aria-label="צבע"></button>`).join('')}</div>
      <div class="chg-actions"><button type="button" class="chg-btn chg-primary" data-ok>שמירה</button><button type="button" class="chg-btn" data-out>הוצאה מהמערך הזה</button><button type="button" class="chg-btn" data-del>מחיקה מכל המערכים</button><button type="button" class="chg-btn" data-x>ביטול</button></div>`);
    let color = q.color;
    s.querySelector('[data-out]').addEventListener('click', () => { snap(); delete F()[fi].props[id]; selProp = null; s.close(); draw(); save(); toast('הפריט יצא מהמערך הזה. במעבר הוא ייעלם בהדרגה.'); });
    s.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => { color = b.dataset.c; s.querySelectorAll('[data-c]').forEach((x) => x.setAttribute('aria-pressed', x === b)); }));
    s.querySelector('[data-x]').addEventListener('click', () => s.close());
    s.querySelector('[data-ok]').addEventListener('click', () => { snap(); p.label = s.querySelector('[name="label"]').value.trim(); q.w = Math.max(0.2, +s.querySelector('[name="w"]').value || q.w); q.h = Math.max(0.2, +s.querySelector('[name="h"]').value || q.h); q.r = +s.querySelector('[name="r"]').value || 0; q.color = color; s.close(); draw(); save(); });
    s.querySelector('[data-del]').addEventListener('click', () => { snap(); ch.props = ch.props.filter((x) => x.id !== id); F().forEach((f) => f.props && delete f.props[id]); selProp = null; s.close(); draw(); save(); });
    s.showModal();
  }

  // ---------- layers: what shows on the stage ----------
  // the stack button: every formation at a glance, tap one to jump to it
  $('#chg-layers').addEventListener('click', () => {
    const sh = sheet('chg-all-sheet', `<h2>כל המערכים</h2><div class="chg-allgrid">${F().map((f, i) => `<button type="button" data-i="${i}" class="${i === fi ? 'on' : ''}">${miniStage(ch, f.pos, { frame: true, r: 3.2 })}<span>${esc(f.name)}</span><small>${fmtT(startOf(i))}</small></button>`).join('')}</div>
      <fieldset><legend>תצוגה</legend><div class="chg-row">
        <label>מסלולים <select data-v="paths"><option value="always"${ch.showPaths === 'always' ? ' selected' : ''}>תמיד</option><option value="selected"${ch.showPaths === 'selected' ? ' selected' : ''}>כשבוחרים רקדנית</option><option value="never"${ch.showPaths === 'never' ? ' selected' : ''}>אף פעם</option></select></label>
        <label class="chg-check"><input type="checkbox" data-v="names" ${ch.names ? 'checked' : ''}> שמות</label>
        <label class="chg-check"><input type="checkbox" data-v="grid" ${ch.stage.gridLines !== false ? 'checked' : ''}> קווי רשת</label>
        <label class="chg-check"><input type="checkbox" data-v="numbers" ${ch.stage.numbers ? 'checked' : ''}> מספרים על הבמה</label>
        <label class="chg-check"><input type="checkbox" data-v="mirror" ${ch.stage.mirror ? 'checked' : ''}> מבט מראה</label>
      </div></fieldset><div class="chg-actions"><button type="button" class="chg-btn" data-x>סגירה</button></div>`);
    sh.querySelector('[data-x]').addEventListener('click', () => sh.close());
    sh.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => { stop(); fi = +b.dataset.i; t = startOf(fi); sel.clear(); sh.close(); renderAll(); scrollToTime(t); }));
    const v = (k) => sh.querySelector(`[data-v="${k}"]`);
    v('paths').addEventListener('change', () => { ch.showPaths = v('paths').value; draw(); save(); });
    v('names').addEventListener('change', () => { ch.names = v('names').checked; draw(); save(); });
    v('grid').addEventListener('change', () => { ch.stage.gridLines = v('grid').checked; draw(); save(); });
    v('numbers').addEventListener('change', () => { ch.stage.numbers = v('numbers').checked; draw(); save(); });
    v('mirror').addEventListener('change', () => { ch.stage.mirror = v('mirror').checked; renderAll(); save(); });
    sh.showModal();
  });

  // ---------- settings ----------
  $('#chg-settings').addEventListener('click', () => {
    const st = ch.stage;
    const s = sheet('chg-settings-sheet', `<h2>הגדרות</h2><label>שם הכוריאוגרפיה <input name="title" maxlength="60" value="${esc(ch.title)}"></label>
      <fieldset><legend>הבמה (מטרים)</legend><div class="chg-row"><label>רוחב <input name="w" type="number" step="0.5" min="3" max="40" value="${st.w}"></label><label>עומק <input name="d" type="number" step="0.5" min="2" max="30" value="${st.d}"></label><label>צדדים <input name="side" type="number" step="0.25" min="0" max="6" value="${st.side}"></label><label>אחורי הבמה <input name="back" type="number" step="0.25" min="0" max="6" value="${st.back}"></label></div>
      <div class="chg-row"><label>גודל משבצת ברשת <select name="grid">${[0.5, 1, 2].map((v) => `<option value="${v}"${st.grid === v ? ' selected' : ''}>${v} מ׳</option>`).join('')}</select></label><label class="chg-check"><input type="checkbox" name="snap" ${st.snap !== false ? 'checked' : ''}> הצמדה לרשת</label></div></fieldset>
      <fieldset><legend>זמן</legend><div class="chg-row"><label>תצוגת זמן <select name="unit"><option value="sec"${ch.unit !== 'counts' ? ' selected' : ''}>שניות</option><option value="counts"${ch.unit === 'counts' ? ' selected' : ''}>שמיניות וספירות</option></select></label><label>קצב (פעמות לדקה) <input name="bpm" type="number" min="40" max="240" step="0.1" value="${bpm()}"></label></div></fieldset>
      <div class="chg-row"><button type="button" class="chg-btn" data-tips>להראות שוב את הטיפים</button></div>
      <fieldset><legend>שליחה לרקדניות</legend><div class="chg-row"><button type="button" class="chg-btn" data-share>קישור לשיתוף</button><button type="button" class="chg-btn" data-video>סרטון</button><button type="button" class="chg-btn" data-pdf>חוברת להדפסה או PDF</button><button type="button" class="chg-btn" data-png>תמונה של המערך</button><button type="button" class="chg-btn" data-file>שמירה כקובץ</button></div></fieldset>
      <div class="chg-actions"><button type="button" class="chg-btn chg-primary" data-ok>שמירה</button><button type="button" class="chg-btn" data-x>ביטול</button></div>`);
    const v = (n) => s.querySelector(`[name="${n}"]`);
    s.querySelector('[data-x]').addEventListener('click', () => s.close());
    s.querySelector('[data-share]').addEventListener('click', share);
    s.querySelector('[data-tips]').addEventListener('click', () => { s.close(); tips(true); });
    s.querySelector('[data-pdf]').addEventListener('click', () => { s.close(); printBook(); });
    s.querySelector('[data-png]').addEventListener('click', () => { s.close(); exportPng(); });
    s.querySelector('[data-file]').addEventListener('click', () => { const blob = new Blob([JSON.stringify(Object.assign(clone(ch), { music: ch.music && ch.music.kind === 'youtube' ? ch.music : null }))], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${ch.title}.ofridance.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('הקובץ נשמר. אפשר להעלות אותו לגוגל דרייב או לשלוח, ולפתוח בכל מכשיר דרך "פתיחת קובץ" במסך הבית.'); });
    s.querySelector('[data-video]').addEventListener('click', () => { s.close(); recordVideo(); });
    s.querySelector('[data-ok]').addEventListener('click', () => {
      snap(); ch.title = v('title').value.trim() || ch.title; $('.chg-title').textContent = ch.title;
      Object.assign(st, { w: clamp(+v('w').value || 10, 3, 40), d: clamp(+v('d').value || 8, 2, 30), side: clamp(+v('side').value || 0, 0, 6), back: clamp(+v('back').value || 0, 0, 6), grid: +v('grid').value || 1, snap: v('snap').checked });
      ch.unit = v('unit').value; const b = clamp(+v('bpm').value || 100, 40, 240); if (ch.music) ch.music.bpm = b; else ch.bpm = b;
      s.close(); renderAll(); save();
    });
    s.showModal();
  });

  // ---------- music ----------
  $('#chg-music').addEventListener('click', () => {
    const m = ch.music;
    const s = sheet('chg-music-sheet', `<h2>מוזיקה</h2><p class="chg-hint">${m ? `${esc(m.name || 'שיר')} · ${bpm()} פעמות לדקה` : 'בלי שיר, הזמן רץ בשניות והקליק סופר לפי הקצב.'}</p>
      <div class="chg-row"><label class="chg-btn chg-primary">העלאת שיר<input type="file" accept="audio/*" data-file hidden></label><button type="button" class="chg-btn" data-yt>קישור מיוטיוב</button><button type="button" class="chg-btn" data-demo>שיר לדוגמה</button>${m ? '<button type="button" class="chg-btn" data-clear>הסרת השיר</button>' : ''}</div>
      ${m && m.peaks ? `<div class="chg-trim"><canvas aria-label="גל הקול של השיר: לחיצה או גרירה קובעת מאיפה הקטע מתחיל"></canvas><div class="chg-trim-l"><span data-a></span><span data-b></span></div></div>` : ''}
      ${m ? `<label>תחילת הקטע בשיר (שניות) <input name="start" type="number" step="0.01" min="0" value="${(m.start || 0).toFixed(2)}"></label>` : ''}
      <div class="chg-row"><label>קצב <input name="bpm" type="number" min="40" max="240" step="0.1" value="${bpm()}"></label><button type="button" class="chg-btn" data-tap>הקישו בקצב</button></div>
      <p class="chg-hint" data-st role="status"></p><div class="chg-actions"><button type="button" class="chg-btn" data-x>סגירה</button></div>`);
    const st = (x) => (s.querySelector('[data-st]').textContent = x), taps = tapper();
    s.querySelector('[data-x]').addEventListener('click', () => s.close());
    const useBlob = async (blob, name) => {
      st('קוראים את השיר…');
      try { const res = await analyze(await blob.arrayBuffer(), st); if (player) player.dispose(); player = filePlayer(blob); await player.ready; snap(); ch.music = { kind: 'file', name, bpm: res.bpm, offset: res.offset, duration: res.duration, peaks: res.peaks, start: 0 }; save(); timeline(); st(`נטען. קצב ${res.bpm}. גל הקול מופיע מתחת לציר הזמן.`); }
      catch (e) { st('לא הצלחנו לקרוא את הקובץ. נסו MP3.'); }
    };
    s.querySelector('[data-file]').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) useBlob(f, f.name); });
    s.querySelector('[data-demo]').addEventListener('click', async () => { try { const r = await fetch('assets/audio/demo-beat-96.mp3'); useBlob(await r.blob(), 'ביט לדוגמה, 96'); } catch (e) { st('לא הצלחנו לטעון.'); } });
    s.querySelector('[data-yt]').addEventListener('click', () => { const u = prompt('הדביקו קישור ליוטיוב:'); const id = u && youtubeId(u); if (id) loadYT(id, false, st); else if (u) st('זה לא נראה כמו קישור ליוטיוב.'); });
    const cl = s.querySelector('[data-clear]'); if (cl) cl.addEventListener('click', () => { snap(); ch.music = null; if (player) { player.dispose(); player = null; } $('.chg-yt').hidden = true; save(); timeline(); s.close(); });
    const sn = s.querySelector('[name="start"]'); if (sn) sn.addEventListener('change', () => { ch.music.start = Math.max(0, +sn.value || 0); save(); timeline(); drawTrim(); });
    const tc = s.querySelector('.chg-trim canvas');
    const ts = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${(sec % 60).toFixed(2).padStart(5, '0')}`;
    function drawTrim() {
      if (!tc) return; const m2 = ch.music, w = tc.clientWidth || 400, hh = 70, dpr = Math.min(2, devicePixelRatio || 1); tc.width = w * dpr; tc.height = hh * dpr;
      const g = tc.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, hh);
      const dur = m2.duration || 1, a = (m2.start || 0) / dur * w, b = Math.min(w, ((m2.start || 0) + total()) / dur * w);
      g.fillStyle = 'rgba(239,75,63,0.35)'; g.fillRect(a, 0, b - a, hh);
      for (let x = 0; x < w; x += 2) { const v = (m2.peaks[Math.floor((x / w) * m2.peaks.length)] || 0) * hh * 0.45; g.fillStyle = x >= a && x <= b ? '#ffffff' : '#8b8e9e'; g.fillRect(x, hh / 2 - v, 1.4, v * 2 || 1); }
      g.fillStyle = '#ef4b3f'; g.fillRect(a - 1.5, 0, 3, hh); g.fillRect(b - 1.5, 0, 3, hh);
      s.querySelector('[data-a]').textContent = ts(m2.start || 0); s.querySelector('[data-b]').textContent = ts((m2.start || 0) + total());
    }
    if (tc) {
      let dragging = false; const setFrom = (e) => { const r = tc.getBoundingClientRect(); ch.music.start = +clamp(((e.clientX - r.left) / r.width) * (ch.music.duration || 1), 0, Math.max(0, (ch.music.duration || 0) - 1)).toFixed(2); sn.value = ch.music.start.toFixed(2); drawTrim(); };
      tc.addEventListener('pointerdown', (e) => { dragging = true; tc.setPointerCapture(e.pointerId); setFrom(e); });
      tc.addEventListener('pointermove', (e) => { if (dragging) setFrom(e); });
      tc.addEventListener('pointerup', () => { dragging = false; save(); timeline(); });
      requestAnimationFrame(drawTrim);
    }
    s.querySelector('[name="bpm"]').addEventListener('change', (e) => { const b = clamp(+e.target.value || 100, 40, 240); if (ch.music) ch.music.bpm = b; else ch.bpm = b; save(); pill(); });
    s.querySelector('[data-tap]').addEventListener('click', () => { const v = taps.tap(); if (v) { if (ch.music) ch.music.bpm = v; else ch.bpm = v; s.querySelector('[name="bpm"]').value = v; save(); st(`קצב: ${v}`); } else st(`עוד ${4 - taps.count} הקשות…`); });
    s.showModal();
  });
  async function loadYT(id, existing, st = toast) {
    const host = $('.chg-yt'); host.hidden = false;
    try { if (player) player.dispose(); player = await youtubePlayer(host, id, { onProblem: (m) => toast(m), onState: (x) => { if (x === 2 && playing) stop(); } }); if (!existing) { snap(); ch.music = { kind: 'youtube', ytId: id, name: player.title || 'סרטון', bpm: bpm(), offset: 0, start: 0, duration: player.duration }; save(); st('יוטיוב לא מאפשר לשמוע את הקצב: הקישו אותו כאן.'); } }
    catch (e) { host.hidden = true; st(e && e.code && e.code !== 'timeout' ? youtubeProblem(e.code) : 'לא הצלחנו לטעון את יוטיוב.'); }
  }

  // ---------- play ----------
  $('#chg-play').addEventListener('click', () => (playing ? stop() : play()));
  let actx = null, lastBeat = -1;
  function tick(acc) { try { actx = actx || new AudioContext(); const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = acc ? 1320 : 880; g.gain.setValueAtTime(0.0001, actx.currentTime); g.gain.exponentialRampToValueAtTime(acc ? 0.18 : 0.09, actx.currentTime + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.07); o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.08); } catch (e) {} }
  function play() {
    if (!ch) return; if (t >= total() - 0.02) t = 0;
    playing = true; sel.clear(); $('#chg-play').innerHTML = icon('pause', 'עצירה'); app.dataset.playing = '1';
    if (player && ch.music) { player.seek((ch.music.start || 0) + t); Promise.resolve(player.play()).catch(() => { toast('הדפדפן חסם את הנגינה. לחצו שוב.'); stop(); }); }
    let prev = performance.now(); lastBeat = -1;
    const loop = (now) => {
      if (!playing) return;
      if (player && ch.music) t = player.time - (ch.music.start || 0); else t += (now - prev) / 1000;
      prev = now;
      if (t >= total()) { t = total(); stop(); return; }
      if (!ch.music) { const b = Math.floor((t * bpm()) / 60); if (b !== lastBeat) { lastBeat = b; tick(b % 8 === 0); } }
      const w = where(t); if (w.i !== fi && !w.inTrans) { fi = w.i; timeline(); }
      scrollToTime(t); pill(); draw(); raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); placeTools();
  }
  function stop() { if (!playing) return; playing = false; cancelAnimationFrame(raf); if (player) player.pause(); $('#chg-play').innerHTML = icon('play', 'נגן'); app.dataset.playing = '0'; const w = where(t); if (!w.inTrans) fi = w.i; renderAll(); scrollToTime(t); }

  // ---------- 3D and full screen ----------
  $('#chg-3d').addEventListener('click', async () => {
    const b = $('#chg-3d');
    if (mode3d) { mode3d.dispose(); mode3d = null; b.setAttribute('aria-pressed', 'false'); app.classList.remove('is3d'); return; }
    try { const m = await import('./fx-3d.js'); mode3d = m.mount($('.chg-3d')); app.classList.add('is3d'); b.setAttribute('aria-pressed', 'true'); draw(); toast('גוררים כדי להסתובב. "מבט קהל" מראה בדיוק מה הקהל רואה.'); }
    catch (e) { toast('לא הצלחנו לטעון את התלת-ממד. בדקו את החיבור לאינטרנט.'); }
  });
  $('#chg-full').addEventListener('click', () => { const el = app; if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(() => app.classList.toggle('full')); else app.classList.toggle('full'); });

  // ---------- tips on the first visit (and again from the settings) ----------
  const TIPS = [
    ['גוררים רקדנית כדי להזיז אותה', 'קווי עזר אדומים מופיעים כשהיא מתיישרת עם רקדנית אחרת. גוררים מסגרת על חלק ריק כדי לבחור כמה יחד.'],
    ['+ בציר הזמן מוסיף מערך', 'בוחרים מערך, ואז גוררים את הקצוות האדומים כדי לקבוע כמה זמן הוא נמשך וכמה זמן המעבר.'],
    ['לחיצה על קו המסלול', 'בוחרים ישר, עקומה, קשת או נקודות, וגוררים את הנקודות הלבנות כדי לעקוף רקדניות אחרות.'],
    ['נגן, מוזיקה ותלת-ממד', '▶ מנגן את כל המעברים. ♫ מוסיף שיר. הקובייה מציגה את הבמה בתלת-ממד.'],
  ];
  function tips(force) {
    let seen = false; try { seen = localStorage.getItem('chg-tips') === '1'; } catch (e) {}
    if (seen && !force) return;
    let k = 0; const box = $('.chg-tip');
    const show = () => { box.hidden = false; box.innerHTML = `<b>${TIPS[k][0]}</b><p>${TIPS[k][1]}</p><div><span>${k + 1} מתוך ${TIPS.length}</span><button type="button" class="chg-btn" data-skip>דילוג</button><button type="button" class="chg-btn chg-primary" data-next>${k < TIPS.length - 1 ? 'הבא' : 'הבנתי'}</button></div>`; box.querySelector('[data-next]').onclick = () => { k++; if (k >= TIPS.length) done(); else show(); }; box.querySelector('[data-skip]').onclick = done; };
    const done = () => { box.hidden = true; try { localStorage.setItem('chg-tips', '1'); } catch (e) {} };
    show();
  }

  // ---------- keyboard ----------
  document.addEventListener('keydown', (e) => {
    if (!ch || app.dataset.screen !== 'editor' || e.target.closest('input, textarea, select, dialog')) return;
    const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); restore(undo, redo); return; }
    if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); restore(redo, undo); return; }
    if (mod && k === 'a') { e.preventDefault(); sel = new Set(Object.keys(F()[fi].pos)); draw(); return; }
    if (e.code === 'Space') { e.preventDefault(); playing ? stop() : play(); return; }
    if (!mod && k === 'n') { e.preventDefault(); addFormation(); return; }
    if (mod && k === 'd' && !sel.size) { e.preventDefault(); duplicate(); return; }
    if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); stop(); fi = clamp(fi + (e.key === 'ArrowRight' ? 1 : -1), 0, F().length - 1); t = startOf(fi); sel.clear(); renderAll(); scrollToTime(t); return; }
    if (e.key === 'Escape') { sel.clear(); selProp = null; draw(); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selProp) { e.preventDefault(); snap(); ch.props = ch.props.filter((x) => x.id !== selProp); F().forEach((f) => f.props && delete f.props[selProp]); selProp = null; draw(); save(); return; }
    const a = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (a && sel.size && editable()) { e.preventDefault(); snap(); const f = F()[fi], s2 = (ch.stage.grid / 4) * (e.shiftKey ? 4 : 1), m = ch.stage.mirror ? -1 : 1; sel.forEach((id) => { if (f.pos[id]) { f.pos[id][0] += a[0] * s2 * m; f.pos[id][1] += a[1] * s2 * m; } }); timeline(); draw(); save(); }
  });

  // ---------- share, image, booklet ----------
  async function share() {
    const data = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(Object.assign(clone(ch), { music: ch.music && ch.music.kind === 'youtube' ? ch.music : null })))));
    const url = location.href.split('#')[0] + '#c=' + encodeURIComponent(data);
    try { await navigator.clipboard.writeText(url); toast('הקישור הועתק. מי שתפתח אותו תקבל עותק משלה.'); } catch (e) { prompt('העתיקו את הקישור:', url); }
  }
  function exportPng() {
    const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); renderStage(tmp, ch, { pos: F()[fi].pos, props: ch.props, propPos: F()[fi].props, names: ch.names });
    const vb = tmp.viewBox.baseVal; tmp.setAttribute('width', vb.width * 2); tmp.setAttribute('height', vb.height * 2); tmp.setAttribute('style', 'font-family: IBM Plex Sans Hebrew, Arial, sans-serif');
    const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = vb.width * 2; c.height = vb.height * 2; c.getContext('2d').drawImage(img, 0, 0); c.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${ch.title} - ${F()[fi].name}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(tmp));
  }
  function printBook() {
    const sh = document.querySelector('.chg-print'); let s0 = 0;
    sh.innerHTML = `<section class="pp-cover"><h1>${esc(ch.title)}</h1><p>${F().length} מערכים · ${ch.dancers.length} רקדניות · במה ${ch.stage.w}×${ch.stage.d} מ׳</p><ul>${ch.dancers.map((d) => `<li><i style="background:${d.color}"></i>${esc(d.num || '')} ${esc(d.name)}</li>`).join('')}</ul></section>`;
    F().forEach((f, i) => {
      const fig = document.createElement('figure'); fig.className = 'pp-f'; const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); fig.appendChild(sv);
      renderStage(sv, ch, { pos: f.pos, props: ch.props, propPos: f.props, names: true, print: true, ghost: i ? F()[i - 1].pos : null, paths: f.paths, showPaths: 'always' });
      const cap = document.createElement('figcaption'); cap.innerHTML = `<b>${i + 1}. ${esc(f.name)}</b> · ${fmtT(s0)} עד ${fmtT(s0 + f.dur)}${f.note ? ` · ${esc(f.note)}` : ''}`; fig.appendChild(cap); sh.appendChild(fig); s0 += f.dur + f.trans;
    });
    window.print();
  }

  // ---------- video: the whole piece plays once and is recorded, with the song when it is a file ----------
  async function recordVideo() {
    if (!window.MediaRecorder) { toast('הדפדפן הזה לא יודע להקליט סרטון. נסו כרום.'); return; }
    stop(); const W = 1280, Hh = Math.round((W * svg.viewBox.baseVal.height) / svg.viewBox.baseVal.width) + 90;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; const g = cv.getContext('2d');
    const stream = cv.captureStream(30); let audioEl = null;
    if (player && ch.music && ch.music.kind === 'file' && player.el) { try { const ac = new AudioContext(), src = ac.createMediaElementSource(player.el), dest = ac.createMediaStreamDestination(); src.connect(dest); src.connect(ac.destination); dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr)); audioEl = player.el; } catch (e) {} }
    const mime = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 4e6 } : {}), parts = [];
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    rec.onstop = () => { const blob = new Blob(parts, { type: rec.mimeType || 'video/webm' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${ch.title}.${(rec.mimeType || '').includes('mp4') ? 'mp4' : 'webm'}`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 8000); toast('הסרטון נשמר. אפשר לשלוח אותו בווטסאפ.'); app.classList.remove('recording'); };
    const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const frame = (tt) => new Promise((res) => {
      const r = poseAt(tt); renderStage(tmp, ch, { pos: r.pos, alpha: r.alpha, props: ch.props, propPos: r.props, names: ch.names });
      tmp.setAttribute('width', W); tmp.setAttribute('height', Hh - 90); tmp.setAttribute('style', 'font-family: IBM Plex Sans Hebrew, Arial, sans-serif');
      const img = new Image(); img.onload = () => { g.fillStyle = '#1c1c1e'; g.fillRect(0, 0, W, Hh); g.drawImage(img, 0, 0, W, Hh - 90); g.fillStyle = '#fff'; g.font = '600 30px "IBM Plex Sans Hebrew", Arial'; g.textAlign = 'right'; g.fillText(`${ch.title} · ${F()[r.w.i].name}`, W - 30, Hh - 35); g.textAlign = 'left'; g.fillStyle = '#ef4b3f'; g.fillText(fmtT(tt), 30, Hh - 35); res(); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(tmp));
    });
    app.classList.add('recording'); toast('מקליטים את הסרטון בזמן אמת. אל תסגרו את הדף.');
    await frame(0); rec.start(250);
    if (audioEl) { player.seek(ch.music.start || 0); player.play(); }
    const t0 = performance.now(), T = total();
    await new Promise((done) => { const step = async () => { const tt = audioEl ? audioEl.currentTime - (ch.music.start || 0) : (performance.now() - t0) / 1000; if (tt >= T + 0.4) { done(); return; } await frame(Math.min(tt, T)); requestAnimationFrame(step); }; step(); });
    if (audioEl) player.pause(); rec.stop();
  }
  // open a choreography file someone sent
  $('#chg-open-file').addEventListener('change', async (e) => { const file = e.target.files[0]; if (!file) return; try { const c = JSON.parse(await file.text()); if (!c.formations || !c.dancers) throw new Error('bad'); c.id = uid(); db.save(c); open(c.id); } catch (err) { toast('זה לא נראה כמו קובץ כוריאוגרפיה של OFRIDANCE.'); } e.target.value = ''; });

  // ---------- little parts ----------
  function sheet(cls, html) { let d = document.querySelector('dialog.' + cls); if (!d) { d = document.createElement('dialog'); d.className = 'chg-sheet ' + cls; document.body.appendChild(d); } d.innerHTML = html; return d; }
  function menu(anchor, items) {
    closeMenu(); const m = document.createElement('div'); m.className = 'chg-menu'; m.setAttribute('role', 'menu');
    items.forEach(([label, fn]) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.textContent = label; b.addEventListener('click', () => { closeMenu(); fn(); }); m.appendChild(b); });
    document.body.appendChild(m); const r = anchor.getBoundingClientRect(), mr = m.getBoundingClientRect();
    m.style.left = clamp(r.left + r.width / 2 - mr.width / 2, 8, innerWidth - mr.width - 8) + 'px';
    m.style.top = (r.bottom + mr.height + 8 > innerHeight ? Math.max(8, r.top - mr.height - 6) : r.bottom + 6) + 'px';
    m.querySelector('button')?.focus(); setTimeout(() => document.addEventListener('pointerdown', outside), 0);
  }
  const outside = (e) => { if (!e.target.closest('.chg-menu')) closeMenu(); };
  function closeMenu() { document.querySelectorAll('.chg-menu').forEach((m) => m.remove()); document.removeEventListener('pointerdown', outside); }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  function toast(msg) { const o = $('.chg-toast'); o.textContent = msg; o.classList.add('on'); clearTimeout(o._t); o._t = setTimeout(() => o.classList.remove('on'), 3400); }
  addEventListener('resize', () => { if (ch) { scrollToTime(t); placeTools(); } });

  // ---------- start ----------
  const h = location.hash.match(/c=([^&]+)/);
  if (h) { try { const c = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(decodeURIComponent(h[1])), (x) => x.charCodeAt(0)))); c.id = uid(); c.title += ' (שותף איתי)'; db.save(c); history.replaceState(null, '', location.pathname); open(c.id); return; } catch (e) {} }
  home();
}
