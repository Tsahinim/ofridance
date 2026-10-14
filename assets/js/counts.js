// OFRIDANCE — eight-count builder: place moves on counts, hear the beat, watch the 3D dancer perform the phrase.
import { createDancer, MOVES, MOVE_BY_ID } from './dancer3d.js';

const app = document.getElementById('counts-app');
if (app) init(app);

function init(app) {
  const $ = (q) => app.querySelector(q);
  const STORE = 'ofridance-counts-v1';
  const SAMPLES = {
    hiphop: { style: 'hiphop', bpm: 96, eights: 2, items: [{ id: 'bounce', start: 0, len: 2 }, { id: 'rock', start: 2, len: 2 }, { id: 'step', start: 4, len: 4 }, { id: 'runningman', start: 8, len: 2 }, { id: 'chestpop', start: 10, len: 1 }, { id: 'chestpop', start: 11, len: 1 }, { id: 'point', start: 12, len: 2 }, { id: 'freeze', start: 14, len: 2 }] },
    modern: { style: 'modern', bpm: 78, eights: 2, items: [{ id: 'breath', start: 0, len: 4 }, { id: 'contraction', start: 4, len: 4 }, { id: 'swing', start: 8, len: 4 }, { id: 'reach', start: 12, len: 2 }, { id: 'turn', start: 14, len: 2 }] },
  };
  let state;
  try { state = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { state = null; }
  const h = location.hash.match(/p=([^&]+)/);
  if (h) { try { state = JSON.parse(decodeURIComponent(atob(h[1]))); } catch (e) {} }
  if (!state || !Array.isArray(state.items)) state = JSON.parse(JSON.stringify(SAMPLES.hiphop));
  let eight = 0, selSlot = 0, tab = state.style || 'hiphop', counting = false;
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} };

  const dancer = createDancer($('.viewport'), { background: '#141414' });
  dancer.setLoop(false);

  // ---- audio ----
  let ac = null;
  const ctx = () => (ac = ac || new (window.AudioContext || window.webkitAudioContext)());
  function noise(t, dur, gain, hp) {
    const a = ctx(); const len = Math.floor(a.sampleRate * dur); const b = a.createBuffer(1, len, a.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const s = a.createBufferSource(); s.buffer = b; const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; const g = a.createGain(); g.gain.value = gain;
    s.connect(f).connect(g).connect(a.destination); s.start(t);
  }
  function kick(t) { const a = ctx(); const o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.32); o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.34); }
  function tone(t, f, dur, gain) { const a = ctx(); const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05); }
  const CHORDS = [[220, 277.2, 329.6], [196, 246.9, 293.7], [174.6, 220, 261.6], [196, 246.9, 329.6]];
  function beat(c) {
    if (!$('#beat').checked) return;
    try {
      const a = ctx(); const t = a.currentTime + 0.01, half = 30 / state.bpm; const n = c % 8;
      if (state.style === 'hiphop') {
        if (n % 2 === 0) kick(t); else noise(t, 0.18, 0.5, 1400);
        noise(t + half, 0.05, 0.18, 7000); noise(t, 0.04, 0.12, 7000);
        if (n === 6) kick(t + half);
      } else {
        if (n % 4 === 0) CHORDS[Math.floor(c / 4) % 4].forEach((f) => tone(t, f, (60 / state.bpm) * 3.8, 0.05));
        tone(t, n === 0 ? 880 : 660, 0.12, n === 0 ? 0.05 : 0.025);
      }
    } catch (e) { /* audio optional */ }
  }
  const HE = ['אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה'];
  function speak(n) { if (!$('#voice').checked || !('speechSynthesis' in window)) return; const u = new SpeechSynthesisUtterance(HE[n]); u.lang = 'he-IL'; u.rate = 1.5; speechSynthesis.cancel(); speechSynthesis.speak(u); }

  // ---- rendering ----
  function itemAt(c) { return state.items.find((it) => c >= it.start && c < it.start + it.len); }
  function renderTabs() {
    const box = $('.eight-tabs'); box.innerHTML = '';
    for (let i = 0; i < state.eights; i++) { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = `שמינייה ${i + 1}`; b.setAttribute('aria-pressed', i === eight); b.addEventListener('click', () => { eight = i; selSlot = i * 8; renderSlots(); renderTabs(); }); box.appendChild(b); }
    if (state.eights < 4) { const add = document.createElement('button'); add.type = 'button'; add.className = 'chip'; add.textContent = 'הוספת שמינייה'; add.addEventListener('click', () => { state.eights++; eight = state.eights - 1; selSlot = eight * 8; renderAll(); save(); }); box.appendChild(add); }
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
      b.innerHTML = `<span class="n">${k + 1}</span><span class="mv">${mv ? (it.start === c ? mv.name : '·') : 'ריק'}</span>`;
      b.setAttribute('aria-label', `ספירה ${k + 1}${mv ? ': ' + mv.name : ', ריקה'}`);
      b.addEventListener('click', () => { selSlot = c; renderSlots(); if (it) { dancer.pause(); dancer.setSequence(seqFor()); dancer.seek(it.start + 0.001); showMove(mv); } });
      g.appendChild(b);
    }
  }
  function renderMoves() {
    $('.moves .tabs').querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', b.dataset.tab === tab));
    const list = $('.move-list'); list.innerHTML = '';
    MOVES.filter((m) => m.style === tab).forEach((m) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'move-card';
      b.innerHTML = `<b>${m.name} <bdi class="en" style="font-weight:400;color:#9a9a9a">${m.en}</bdi></b><span><span class="len">${m.len} ${m.len === 1 ? 'ספירה' : 'ספירות'}</span> · ${m.tip}</span>`;
      b.addEventListener('click', () => place(m));
      list.appendChild(b);
    });
  }
  function place(m) {
    const max = state.eights * 8; let start = selSlot;
    if (start + m.len > max) start = Math.max(0, max - m.len);
    state.items = state.items.filter((it) => it.start + it.len <= start || it.start >= start + m.len);
    state.items.push({ id: m.id, start, len: m.len });
    state.items.sort((a, b) => a.start - b.start);
    selSlot = Math.min(max - 1, start + m.len); eight = Math.floor(selSlot / 8);
    renderAll(); save(); showMove(m);
    dancer.pause(); dancer.setSequence(seqFor()); dancer.seek(start + 0.001); dancer.setLoop(false);
  }
  function showMove(m) { if (!m) return; $('.now-move').textContent = m.name; }
  function seqFor() { return state.items.map((it) => ({ id: it.id, start: it.start, len: it.len })); }
  function renderAll() { renderTabs(); renderSlots(); renderMoves(); $('#bpm').value = state.bpm; $('#bpm-out').textContent = state.bpm; $('#style').value = state.style; }

  // ---- transport ----
  const play = $('#play');
  function stopAll() { counting = false; dancer.pause(); play.textContent = 'נגן עם ספירה'; play.setAttribute('aria-pressed', 'false'); $('.big-count').textContent = '·'; renderSlots(); }
  play.addEventListener('click', () => {
    if (dancer.playing || counting) return stopAll();
    if (!state.items.length) { flash('בחרו ספירה ריקה ואז תנועה מהרשימה.'); return; }
    dancer.setSequence(seqFor()); dancer.setBpm(state.bpm); dancer.seek(0);
    play.textContent = 'עצירה'; play.setAttribute('aria-pressed', 'true');
    // count-in: five, six, seven, eight
    const beatMs = 60000 / state.bpm; let k = 0; counting = $('#countin').checked;
    const go = () => { counting = false; dancer.play(); };
    if (!counting) return go();
    const step = () => {
      if (!counting) return;
      if (k === 4) return go();
      $('.big-count').textContent = 5 + k; $('.now-move').textContent = 'מוכנות…'; beat(4 + k); speak(4 + k); k++;
      setTimeout(step, beatMs);
    };
    step();
  });
  dancer.onCount((c) => {
    const n = c % 8; $('.big-count').textContent = n + 1; beat(c); speak(n);
    const it = itemAt(c); $('.now-move').textContent = it ? MOVE_BY_ID[it.id].name : '';
    eight = Math.floor(c / 8); renderTabs(); renderSlots(c);
  });
  dancer.onEnd(() => stopAll());
  $('#bpm').addEventListener('input', (e) => { state.bpm = +e.target.value; $('#bpm-out').textContent = state.bpm; dancer.setBpm(state.bpm); save(); });
  $('#style').addEventListener('change', (e) => { state.style = e.target.value; tab = state.style; renderMoves(); save(); });
  $('#mirror').addEventListener('change', (e) => dancer.setMirror(e.target.checked));
  app.querySelectorAll('.moves .tabs .chip').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; renderMoves(); }));
  $('#clear').addEventListener('click', () => { stopAll(); state.items = []; state.eights = 1; eight = 0; selSlot = 0; renderAll(); save(); dancer.setSequence([]); });
  $('#remove').addEventListener('click', () => { const it = itemAt(selSlot); if (!it) return; state.items = state.items.filter((x) => x !== it); renderAll(); save(); dancer.setSequence(seqFor()); });
  $('#sample-hh').addEventListener('click', () => { stopAll(); state = JSON.parse(JSON.stringify(SAMPLES.hiphop)); eight = 0; selSlot = 0; tab = 'hiphop'; renderAll(); save(); dancer.setSequence(seqFor()); dancer.seek(0); });
  $('#sample-md').addEventListener('click', () => { stopAll(); state = JSON.parse(JSON.stringify(SAMPLES.modern)); eight = 0; selSlot = 0; tab = 'modern'; renderAll(); save(); dancer.setSequence(seqFor()); dancer.seek(0); });
  $('#share').addEventListener('click', async () => {
    const url = location.href.split('#')[0] + '#p=' + btoa(encodeURIComponent(JSON.stringify(state)));
    try { await navigator.clipboard.writeText(url); flash('הקישור הועתק. הוא פותח בדיוק את המשפט הזה.'); } catch (e) { prompt('העתיקו את הקישור:', url); }
  });
  function flash(msg) { const o = document.querySelector('.flash'); if (!o) return; o.textContent = msg; o.classList.add('on'); clearTimeout(o._t); o._t = setTimeout(() => o.classList.remove('on'), 3200); }

  renderAll();
  dancer.setBpm(state.bpm);
  dancer.setSequence(seqFor());
}
