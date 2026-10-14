// OFRIDANCE — eight-count builder: place real recorded moves on the counts and watch the dancer perform the phrase on the beat.
// Every move is a motion-capture recording (moves.js). Street and jazz recordings carry their own tempo, so they are
// played faster or slower to land on the phrase's counts; modern phrases play at their natural speed.
import { createRealDancer, createViewer } from './realdancer.js';
import { MOVES, MOVE_BY_ID, STYLES, LEVELS } from './moves.js';

const pulse = (el) => { if (!el) return; el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); };
const app = document.getElementById('counts-app');
if (app) init(app);

async function init(app) {
  const $ = (q) => app.querySelector(q);
  const STORE = 'ofridance-counts-v2';
  const SAMPLES = {
    hiphop: { style: 'hiphop', bpm: 96, eights: 4, items: [{ id: 'gMH-07', start: 0, len: 8 }, { id: 'gMH-09', start: 8, len: 8 }, { id: 'gLO-03', start: 16, len: 4 }, { id: 'gPO-04', start: 20, len: 4 }, { id: 'gLH-01', start: 24, len: 8 }] },
    modern: { style: 'modern', bpm: 78, eights: 4, items: [{ id: 'gJS-03', start: 0, len: 8 }, { id: 'gJS-05', start: 8, len: 8 }, { id: 'gJS-10', start: 16, len: 8 }, { id: 'cmu49-09', start: 24, len: 8 }] },
  };
  const valid = (s) => s && Array.isArray(s.items) && s.items.every((it) => MOVE_BY_ID[it.id]);
  let state;
  try { state = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { state = null; }
  const h = location.hash.match(/p=([^&]+)/);
  if (h) { try { state = JSON.parse(decodeURIComponent(atob(h[1]))); } catch (e) { /* a broken link opens the sample */ } }
  if (!valid(state)) state = JSON.parse(JSON.stringify(SAMPLES.hiphop));
  let eight = 0, selSlot = 0, tab = state.style || 'hiphop', len = 8, level = 0;
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* private mode */ } };
  const side = (id) => STYLES[MOVE_BY_ID[id].style].side;

  // ---- audio: a click track in the style of the phrase ----
  let ac = null;
  const ctx = () => (ac = ac || new (window.AudioContext || window.webkitAudioContext)());
  function noise(t, dur, gain, hp) {
    const a = ctx(); const n = Math.floor(a.sampleRate * dur); const b = a.createBuffer(1, n, a.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const s = a.createBufferSource(); s.buffer = b; const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; const g = a.createGain(); g.gain.value = gain;
    s.connect(f).connect(g).connect(a.destination); s.start(t);
  }
  function kick(t) { const a = ctx(); const o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.32); o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.34); }
  function tone(t, f, dur, gain) { const a = ctx(); const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05); }
  const CHORDS = [[220, 277.2, 329.6], [196, 246.9, 293.7], [174.6, 220, 261.6], [196, 246.9, 329.6]];
  function beat(c) {
    if (!$('#beat').checked) return;
    try {
      const a = ctx(); const t = a.currentTime + 0.01, half = 30 / state.bpm; const n = ((c % 8) + 8) % 8;
      if (state.style === 'hiphop') {
        if (n % 2 === 0) kick(t); else noise(t, 0.18, 0.5, 1400);
        noise(t + half, 0.05, 0.18, 7000); noise(t, 0.04, 0.12, 7000);
        if (n === 6) kick(t + half);
      } else {
        if (n % 4 === 0) CHORDS[Math.floor(Math.max(0, c) / 4) % 4].forEach((f) => tone(t, f, (60 / state.bpm) * 3.8, 0.05));
        tone(t, n === 0 ? 880 : 660, 0.12, n === 0 ? 0.05 : 0.025);
      }
    } catch (e) { /* sound is optional */ }
  }
  const HE = ['אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה'];
  function speak(n) { if (!$('#voice').checked || !('speechSynthesis' in window)) return; const u = new SpeechSynthesisUtterance(HE[n]); u.lang = 'he-IL'; u.rate = 1.5; speechSynthesis.cancel(); speechSynthesis.speak(u); }

  // ---- the dancer ----
  const view = $('.viewport');
  const viewer = createViewer(view, { background: '#141414' });
  const loading = document.createElement('div'); loading.className = 'counts-loading'; loading.textContent = 'הרקדנית נכנסת לסטודיו…'; view.appendChild(loading);
  let dancer;
  try { dancer = await createRealDancer({ outfit: state.style === 'modern' ? 'modern' : 'hiphop' }); }
  catch (e) { loading.textContent = 'לא הצלחנו לטעון את הרקדנית. בדקו את החיבור ונסו לרענן.'; return; }
  viewer.scene.add(dancer.root);
  const clips = new Map();
  // load and measure every move in the phrase once, so switching between them during playback is instant
  async function prepare() {
    const outfit = state.style === 'modern' ? 'modern' : 'hiphop';
    if (dancer.outfit !== outfit) await dancer.setOutfit(outfit);
    const ids = [...new Set(state.items.map((it) => it.id))];
    for (const id of ids) { const c = await dancer.setClip(id); clips.set(id, c); }
    let top = 1.9, r = 0.8;
    for (const id of ids) { const f = clips.get(id).fit; top = Math.max(top, f.top); r = Math.max(r, f.r); }
    viewer.fitTo({ top, r: Math.min(r, 1.1) });
  }
  // where in the recording a count of the phrase falls
  function clipTime(it, local) {
    const c = clips.get(it.id); if (!c) return 0;
    const t = c.bpm ? (local * 60) / c.bpm : (local * 60) / state.bpm;
    return Math.min(t, c.duration - 1 / c.fps);
  }

  // ---- rendering the grid and the move list ----
  function itemAt(c) { return state.items.find((it) => c >= it.start && c < it.start + it.len); }
  function renderTabs() {
    const box = $('.eight-tabs'); box.innerHTML = '';
    for (let i = 0; i < state.eights; i++) { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = `שמינייה ${i + 1}`; b.setAttribute('aria-pressed', i === eight); b.addEventListener('click', () => { eight = i; selSlot = i * 8; renderSlots(); renderTabs(); }); box.appendChild(b); }
    if (state.eights < 8) { const add = document.createElement('button'); add.type = 'button'; add.className = 'chip'; add.textContent = 'הוספת שמינייה'; add.addEventListener('click', () => { state.eights++; eight = state.eights - 1; selSlot = eight * 8; renderAll(); save(); }); box.appendChild(add); }
  }
  function renderSlots(now = -1) {
    const g = $('.eight-grid'); g.innerHTML = '';
    for (let k = 0; k < 8; k++) {
      const c = eight * 8 + k; const it = itemAt(c);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'slot';
      if (it) b.classList.add(it.start === c ? 'filled' : 'cont');
      if (c === now) b.classList.add('now');
      b.setAttribute('aria-pressed', c === selSlot);
      const mv = it ? MOVE_BY_ID[it.id] : null;
      b.innerHTML = `<span class="n">${k + 1}</span><span class="mv">${mv ? (it.start === c ? mv.he : '·') : 'ריק'}</span>`;
      b.setAttribute('aria-label', `ספירה ${k + 1}${mv ? ': ' + mv.he : ', ריקה'}`);
      b.addEventListener('click', () => { selSlot = c; renderSlots(); if (it && !playing) { showAt(c); showMove(mv); } });
      g.appendChild(b);
    }
  }
  function renderMoves() {
    $('.moves .tabs').querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.tab === tab));
    $('.moves .tabs').querySelectorAll('[data-lv]').forEach((b) => b.setAttribute('aria-pressed', +b.dataset.lv === level));
    const list = $('.move-list'); list.innerHTML = '';
    let group = '';
    MOVES.filter((m) => !m.routine && STYLES[m.style].side === tab && (!level || m.lv === level)).forEach((m) => {
      if (m.style !== group) { group = m.style; const hd = document.createElement('p'); hd.className = 'move-group'; hd.textContent = STYLES[m.style].he; list.appendChild(hd); }
      const b = document.createElement('button'); b.type = 'button'; b.className = 'move-card';
      b.innerHTML = `<span class="mv-text"><b>${m.he}</b><span><span class="rd-lv" data-lv="${m.lv}"><i></i><i></i><i></i></span> ${LEVELS[m.lv]}</span></span>`;
      b.addEventListener('click', () => place(m));
      list.appendChild(b);
    });
  }
  async function place(m) {
    stop();
    const max = state.eights * 8; let start = selSlot;
    if (start + len > max) start = Math.max(0, max - len);
    const n = Math.min(len, max - start);
    state.items = state.items.filter((it) => it.start + it.len <= start || it.start >= start + n);
    state.items.push({ id: m.id, start, len: n });
    state.items.sort((a, b) => a.start - b.start);
    if (side(m.id) !== state.style && state.items.every((it) => side(it.id) === side(m.id))) state.style = side(m.id);
    selSlot = Math.min(max - 1, start + n); eight = Math.floor(selSlot / 8);
    renderAll(); save(); showMove(m);
    await ready(); showAt(start);
  }
  function showMove(m) { if (m) $('.now-move').textContent = m.he; }
  function renderAll() {
    renderTabs(); renderSlots(); renderMoves();
    $('#bpm').value = state.bpm; $('#bpm-out').textContent = state.bpm; $('#style').value = state.style;
  }

  // ---- playback ----
  let prep = null;
  function ready() { prep = prepare(); return prep; }
  let playing = false, t0 = 0, lastCount = -99, cur = null, snap = null, snapAt = 0, base = { x: 0, z: 0 }, raf = 0;
  const FADE = 0.22; // seconds of blending between two moves
  // pose the dancer at a (fractional) count of the phrase; returns the item being danced
  function poseAt(count, dt) {
    const it = itemAt(Math.floor(count));
    if (!it) return null;
    if (it !== cur) {
      // carry the body on from where the previous move ended, so the phrase travels as one dance
      const prevHip = cur ? dancer.hips() : null;
      if (cur) snap = dancer.snapshot();
      snapAt = performance.now();
      cur = it; dancer.useClip(clips.get(it.id));
      dancer.root.position.set(0, 0, 0); dancer.pose(clipTime(it, 0));
      const startHip = dancer.hips();
      if (prevHip) { dancer.root.position.x = prevHip.x - startHip.x; dancer.root.position.z = prevHip.z - startHip.z; }
    }
    dancer.pose(clipTime(it, count - it.start));
    const w = snap ? Math.min(1, (performance.now() - snapAt) / 1000 / FADE) : 1;
    if (w < 1) dancer.blend(snap, w); else snap = null;
    return it;
  }
  // while stopped, the dancer loops the chosen move on the phrase's tempo
  let previewIt = null, p0 = 0, lastLoop = -1;
  function showAt(count) {
    if (!clips.size) return;
    const it = itemAt(Math.floor(count)) || state.items[0]; if (!it) return;
    previewIt = it; p0 = performance.now(); lastLoop = -1; cur = null; snap = null; dancer.root.position.set(0, 0, 0);
    poseAt(it.start + 0.001); const hp = dancer.hips(); viewer.snap(hp.x, hp.z);
  }
  function idle(now) {
    if (!playing && previewIt && clips.has(previewIt.id)) {
      const beats = (now - p0) / (60000 / state.bpm), loop = Math.floor(beats / previewIt.len);
      if (loop !== lastLoop) { if (lastLoop >= 0) { snap = dancer.snapshot(); snapAt = now; } lastLoop = loop; }
      const it = previewIt; cur = it; dancer.useClip(clips.get(it.id)); dancer.root.position.set(0, 0, 0);
      dancer.pose(clipTime(it, beats - loop * it.len), false);
      const w = snap ? Math.min(1, (now - snapAt) / 1000 / FADE) : 1; if (w < 1) dancer.blend(snap, w); else snap = null;
      const hp = dancer.hips(); viewer.follow(hp.x, hp.z, 1 / 60);
    }
    if (!playing) viewer.render();
    requestAnimationFrame(idle);
  }
  requestAnimationFrame(idle);
  const play = $('#play');
  function stop() {
    const was = playing;
    playing = false; cancelAnimationFrame(raf); play.textContent = 'נגן עם ספירה'; play.setAttribute('aria-pressed', 'false');
    $('.big-count').textContent = '·'; renderSlots();
    if (was) showAt(selSlot);
  }
  function frame(now) {
    if (!playing) return;
    const beatMs = 60000 / state.bpm;
    const count = (now - t0) / beatMs;   // negative during the count-in
    const ci = Math.floor(count);
    if (ci !== lastCount) {
      lastCount = ci;
      if (count < 0) { const n = 8 + ci; $('.big-count').textContent = n + 1; pulse($('.big-count')); $('.now-move').textContent = 'מוכנות…'; beat(n); speak(n); }
      else if (ci >= state.eights * 8) { stop(); return; }
      else {
        const n = ci % 8; $('.big-count').textContent = n + 1; pulse($('.big-count')); beat(ci); speak(n);
        const it = itemAt(ci); $('.now-move').textContent = it ? MOVE_BY_ID[it.id].he : '';
        if (Math.floor(ci / 8) !== eight) { eight = Math.floor(ci / 8); renderTabs(); }
        renderSlots(ci);
      }
    }
    if (count >= 0) poseAt(count);
    const hp = dancer.hips(); viewer.follow(hp.x, hp.z, 1 / 60); viewer.render();
    raf = requestAnimationFrame(frame);
  }
  play.addEventListener('click', async () => {
    if (playing) return stop();
    if (!state.items.length) { flash('בחרו ספירה ריקה ואז תנועה מהרשימה.'); return; }
    play.textContent = 'עצירה'; play.setAttribute('aria-pressed', 'true');
    await prep;
    try { ctx().resume(); } catch (e) { /* no sound */ }
    playing = true; cur = null; snap = null; lastCount = -99; dancer.root.position.set(0, 0, 0);
    const lead = $('#countin').checked ? 4 : 0;   // "five, six, seven, eight" before the first count
    t0 = performance.now() + lead * (60000 / state.bpm);
    poseAt(0.001); const hp = dancer.hips(); viewer.snap(hp.x, hp.z);
    raf = requestAnimationFrame(frame);
  });

  $('#bpm').addEventListener('input', (e) => { state.bpm = +e.target.value; $('#bpm-out').textContent = state.bpm; save(); });
  $('#style').addEventListener('change', async (e) => { stop(); state.style = e.target.value; tab = state.style; renderMoves(); save(); await ready(); showAt(selSlot); });
  $('#mirror').addEventListener('change', (e) => view.classList.toggle('mirrored', e.target.checked));
  $('#len').addEventListener('change', (e) => { len = +e.target.value; });
  app.querySelectorAll('.moves .tabs [data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; renderMoves(); }));
  app.querySelectorAll('.moves .tabs [data-lv]').forEach((b) => b.addEventListener('click', () => { level = +b.dataset.lv; renderMoves(); }));
  $('#clear').addEventListener('click', () => { stop(); state.items = []; state.eights = 1; eight = 0; selSlot = 0; renderAll(); save(); });
  $('#remove').addEventListener('click', () => { const it = itemAt(selSlot); if (!it) return; stop(); state.items = state.items.filter((x) => x !== it); renderAll(); save(); });
  const loadSample = async (k) => { stop(); state = JSON.parse(JSON.stringify(SAMPLES[k])); eight = 0; selSlot = 0; tab = k; renderAll(); save(); await ready(); showAt(0); };
  $('#sample-hh').addEventListener('click', () => loadSample('hiphop'));
  $('#sample-md').addEventListener('click', () => loadSample('modern'));
  $('#share').addEventListener('click', async () => {
    const url = location.href.split('#')[0] + '#p=' + btoa(encodeURIComponent(JSON.stringify(state)));
    try { await navigator.clipboard.writeText(url); flash('הקישור הועתק. הוא פותח בדיוק את המשפט הזה.'); } catch (e) { prompt('העתיקו את הקישור:', url); }
  });
  function flash(msg) { const o = document.querySelector('.flash'); if (!o) return; o.textContent = msg; o.classList.add('on'); clearTimeout(o._t); o._t = setTimeout(() => o.classList.remove('on'), 3200); }

  renderAll();
  await ready();
  loading.remove();
  showAt(0); showMove(MOVE_BY_ID[state.items[0]?.id]);
  window.countsReady = true;
}
