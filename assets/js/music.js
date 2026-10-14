// OFRIDANCE — music for the stage: song files (analysed in the browser) and YouTube links.
// A song file never leaves the device: it is decoded here and kept in this browser's IndexedDB.

// ---------- analysis ----------
// Finds the tempo, the first "one" (the start of an eight-count), a waveform and an energy curve.
export async function analyze(arrayBuffer, onProgress = () => {}) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ac = new AC();
  const buf = await ac.decodeAudioData(arrayBuffer.slice(0));
  ac.close && ac.close();
  onProgress('מנתחים את השיר…');
  const sr = buf.sampleRate, n = buf.length, ch = buf.numberOfChannels;
  const a = buf.getChannelData(0), b = ch > 1 ? buf.getChannelData(1) : null;
  const HOP = 256, frames = Math.floor(n / HOP);
  const full = new Float32Array(frames), low = new Float32Array(frames);
  // one-pole low-pass (~150 Hz) to hear the kick drum and the bass
  const k = 1 - Math.exp((-2 * Math.PI * 150) / sr);
  let lp = 0;
  for (let f = 0; f < frames; f++) {
    let e = 0, el = 0;
    for (let i = f * HOP, end = i + HOP; i < end; i++) {
      const x = b ? (a[i] + b[i]) * 0.5 : a[i];
      lp += k * (x - lp);
      e += x * x; el += lp * lp;
    }
    full[f] = Math.sqrt(e / HOP); low[f] = Math.sqrt(el / HOP);
  }
  const fps = sr / HOP;
  // onset envelope: rise in smoothed log energy, kick-weighted
  const onset = (e, c) => {
    const L = new Float32Array(frames); for (let f = 0; f < frames; f++) L[f] = Math.log1p(c * e[f]);
    const S = new Float32Array(frames); for (let f = 0; f < frames; f++) S[f] = ((L[f - 1] ?? L[f]) + L[f] + (L[f + 1] ?? L[f])) / 3;
    const d = new Float32Array(frames); for (let f = 1; f < frames; f++) d[f] = Math.max(0, S[f] - S[f - 1]); return d;
  };
  const oL = onset(low, 100), oF = onset(full, 50);
  const env = new Float32Array(frames); for (let f = 0; f < frames; f++) env[f] = 0.6 * oL[f] + 0.4 * oF[f];
  // subtract a centred moving mean (0.25 s) and normalise
  const W = Math.max(1, Math.round(fps * 0.25)), half = Math.floor(W / 2); const cs = new Float64Array(frames + 1);
  for (let f = 0; f < frames; f++) cs[f + 1] = cs[f] + env[f];
  const sm = new Float32Array(frames); let sq = 0;
  for (let f = 0; f < frames; f++) { const lo = Math.max(0, f - half), hi = Math.min(frames, f - half + W); const m = (cs[hi] - cs[lo]) / Math.max(1, hi - lo); sm[f] = Math.max(0, env[f] - m); sq += sm[f] * sm[f]; }
  const sd = Math.sqrt(sq / frames) || 1; for (let f = 0; f < frames; f++) sm[f] /= sd;

  // coarse tempo: autocorrelation with its harmonics, preferring the usual dance range
  const minBpm = 70, maxBpm = 180;
  const lagMin = Math.floor((60 * fps) / maxBpm), lagMax = Math.ceil((60 * fps) / minBpm);
  const acf = (lag) => { if (lag >= frames) return 0; let s = 0; for (let f = lag; f < frames; f++) s += sm[f] * sm[f - lag]; return s / (frames - lag); };
  let best = { s: -1, lag: lagMin };
  for (let lag = lagMin; lag <= lagMax; lag++) {
    const bpm0 = (60 * fps) / lag; const w = Math.exp(-0.5 * Math.pow(Math.log2(bpm0 / 112) / 0.7, 2));
    const s = (acf(lag) + 0.5 * acf(2 * lag) + 0.25 * acf(4 * lag)) * w;
    if (s > best.s) best = { s, lag };
  }
  // half-time check: a song felt at 70 is usually counted at 140 when the faster pulse is also strong
  {
    const half = best.lag / 2, fast = (60 * fps) / half;
    if (fast <= 160) {
      const raw = acf(best.lag) + 0.5 * acf(2 * best.lag);
      const lo = Math.floor(half), hi = Math.ceil(half), fr2 = half - lo;
      const rawFast = (acf(lo) * (1 - fr2) + acf(hi) * fr2) + 0.5 * acf(Math.round(2 * half));
      if (rawFast >= 0.45 * raw) best = { s: best.s, lag: half };
    }
  }
  onProgress('מדייקים את הקצב…');
  // refine period and phase with a comb over the whole song (keeps long songs from drifting)
  const comb = (P, phi) => { let s = 0; for (let x = phi; x < frames; x += P) { const i = Math.round(x); s += sm[i] + 0.5 * (sm[i - 1] || 0) + 0.5 * (sm[i + 1] || 0); } return s; };
  let bestP = best.lag, bestPhi = 0, bestS = -1;
  for (let P = best.lag - 1.5; P <= best.lag + 1.5; P += 0.02) {
    for (let phi = 0; phi < P; phi += 1) { const s = comb(P, phi); if (s > bestS) { bestS = s; bestP = P; bestPhi = phi; } }
  }
  for (let phi = bestPhi - 1; phi <= bestPhi + 1; phi += 0.1) { const s = comb(bestP, phi); if (s > bestS) { bestS = s; bestPhi = phi; } }
  let bpm = (60 * fps) / bestP;
  if (Math.abs(bpm - Math.round(bpm)) < 0.25) bpm = Math.round(bpm);
  const beat = 60 / bpm;
  let phase = bestPhi / fps; // seconds of some beat
  // first audible beat
  const loud = [...full].sort((x, y) => x - y)[Math.floor(frames * 0.6)] || 0.01;
  let first = phase % beat;
  while (first < buf.duration) { const f = Math.round(first * fps); if (full[f] > loud * 0.25 || (full[f + 2] || 0) > loud * 0.25) break; first += beat; }
  // choose which of the eight beats is "one": strong onsets on it, and section changes that start on it
  const energyAt = (t0, t1) => { const f0 = Math.max(0, Math.round(t0 * fps)), f1 = Math.min(frames, Math.round(t1 * fps)); let s = 0; for (let f = f0; f < f1; f++) s += full[f]; return f1 > f0 ? s / (f1 - f0) : 0; };
  const onsetAt = (t) => { const f = Math.round(t * fps); let m = 0; for (let j = f - 2; j <= f + 2; j++) m = Math.max(m, sm[j] || 0); return m; };
  const A = [], B = [];
  for (let p = 0; p < 8; p++) {
    const start = first + p * beat; let ch = 0, on = 0, n = 0;
    for (let t = start; t + 8 * beat < buf.duration; t += 8 * beat) { if (t - 2 * beat >= 0) { const after = energyAt(t, t + 2 * beat), before = energyAt(t - 2 * beat, t); ch += Math.abs(Math.log((after + 1e-4) / (before + 1e-4))); } on += onsetAt(t); n++; }
    A.push(n ? on / n : 0); B.push(ch);
  }
  const mA = Math.max(...A) || 1, mB = Math.max(...B) || 1;
  let bestOne = first, bestScore = -1;
  for (let p = 0; p < 8; p++) { const sc = A[p] / mA + 2 * (B[p] / mB); if (sc > bestScore) { bestScore = sc; bestOne = first + p * beat; } }
  if (bestOne - 8 * beat >= first - 0.01) bestOne -= 8 * beat * Math.floor((bestOne - first) / (8 * beat));
  // waveform peaks and a 10-per-second energy curve for drawing and for the skeleton
  const P = 900, peaks = new Array(P).fill(0);
  for (let f = 0; f < frames; f++) { const i = Math.min(P - 1, Math.floor((f / frames) * P)); if (full[f] > peaks[i]) peaks[i] = full[f]; }
  const pmax = Math.max(...peaks) || 1;
  const step = Math.max(1, Math.round(fps / 10)), energy = [];
  for (let f = 0; f < frames; f += step) { let s = 0, c = 0; for (let j = f; j < Math.min(frames, f + step); j++) { s += full[j]; c++; } energy.push(+(s / c).toFixed(5)); }
  return { duration: buf.duration, bpm: +bpm.toFixed(2), offset: +bestOne.toFixed(3), peaks: peaks.map((p) => +(p / pmax).toFixed(3)), energy, energyRate: fps / step };
}

// ---------- tap tempo ----------
export function tapper() {
  let taps = [];
  return {
    tap(t = performance.now() / 1000) { if (taps.length && t - taps[taps.length - 1] > 2.2) taps = []; taps.push(t); if (taps.length > 12) taps.shift(); if (taps.length < 4) return null; const iv = []; for (let i = 1; i < taps.length; i++) iv.push(taps[i] - taps[i - 1]); iv.sort((x, y) => x - y); return +(60 / iv[Math.floor(iv.length / 2)]).toFixed(1); },
    get count() { return taps.length; },
  };
}

// ---------- the song structure: one formation per section ----------
const LABELS = { low: 'רגע שקט', mid: 'בנייה', high: 'שיא' };
export function sections(music, fromOffset) {
  const beat = 60 / music.bpm, eightS = 8 * beat;
  const n = Math.floor((music.duration - fromOffset) / eightS);
  if (!music.energy || n < 1) return [];
  const e = [];
  for (let i = 0; i < n; i++) {
    const a = Math.floor((fromOffset + i * eightS) * music.energyRate), b = Math.floor((fromOffset + (i + 1) * eightS) * music.energyRate);
    let s = 0; for (let j = a; j < b; j++) s += music.energy[j] || 0; e.push(s / Math.max(1, b - a));
  }
  const sorted = [...e].sort((x, y) => x - y); const lo = sorted[0], hi = sorted[sorted.length - 1] || 1;
  const norm = e.map((x) => (hi - lo > 1e-6 ? (x - lo) / (hi - lo) : 0.5));
  const q = (p) => [...norm].sort((x, y) => x - y)[Math.floor(p * (norm.length - 1))];
  const tLow = q(0.33), tHigh = q(0.66);
  const level = (x) => (x >= tHigh ? 'high' : x <= tLow ? 'low' : 'mid');
  const out = []; let cur = { start: 0, len: 1, lv: level(norm[0]), sum: norm[0] };
  for (let i = 1; i < n; i++) {
    const lv = level(norm[i]); const jump = Math.abs(norm[i] - norm[i - 1]) > 0.22;
    if ((lv !== cur.lv && (jump || cur.len >= 2)) || cur.len >= 8) { out.push(cur); cur = { start: i, len: 1, lv, sum: norm[i] }; }
    else { cur.len++; cur.sum += norm[i]; }
  }
  out.push(cur);
  // merge single eights into a neighbour
  for (let i = 0; i < out.length; i++) if (out[i].len === 1 && out.length > 1) { const j = i > 0 ? i - 1 : i + 1; out[j].len += 1; if (j > i) out[j].start = out[i].start; out.splice(i, 1); i--; }
  return out.map((s, i) => ({ ...s, label: LABELS[s.lv], index: i }));
}

// ---------- players ----------
export function filePlayer(blob) {
  const audio = new Audio(); audio.preload = 'auto'; audio.src = URL.createObjectURL(blob);
  return {
    kind: 'file', el: audio,
    ready: new Promise((res) => { audio.addEventListener('loadedmetadata', () => res(), { once: true }); audio.addEventListener('error', () => res(), { once: true }); }),
    get time() { return audio.currentTime; },
    get duration() { return audio.duration || 0; },
    get playing() { return !audio.paused; },
    play() { return audio.play(); },
    pause() { audio.pause(); },
    seek(s) { audio.currentTime = Math.max(0, s); },
    dispose() { audio.pause(); URL.revokeObjectURL(audio.src); },
  };
}

export function youtubeId(url) {
  const m = String(url).trim().match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : (/^[\w-]{11}$/.test(String(url).trim()) ? String(url).trim() : null);
}
let ytApi = null;
function loadYT() {
  if (ytApi) return ytApi;
  ytApi = new Promise((res, rej) => {
    if (window.YT && window.YT.Player) return res(window.YT);
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.onerror = () => rej(new Error('yt'));
    window.onYouTubeIframeAPIReady = () => res(window.YT);
    document.head.appendChild(s);
    setTimeout(() => rej(new Error('timeout')), 15000);
  });
  return ytApi;
}
const YT_PROBLEMS = {
  2: 'הקישור לא תקין. בדקו שהעתקתם את כל הכתובת של הסרטון.',
  5: 'יוטיוב לא הצליח לנגן את הסרטון בדפדפן הזה. נסו דפדפן אחר, או העלו את השיר כקובץ.',
  100: 'הסרטון לא נמצא, או שהוא פרטי.',
  101: 'אי אפשר לנגן את הסרטון הזה כאן. או שבעלי הסרטון חסמו ניגון באתרים אחרים, וזה קורה הרבה בקליפים רשמיים, או שהקישור לא נכון. נסו גרסה אחרת של אותו שיר ביוטיוב, למשל עם המילים "lyrics" או "audio", או העלו את השיר כקובץ.',
  autoplay: 'הדפדפן ביקש אישור לנגן. לחצו פעם אחת על הסרטון עצמו, ואחר כך על "נגן".',
};
YT_PROBLEMS[150] = YT_PROBLEMS[101]; YT_PROBLEMS[153] = YT_PROBLEMS[101];
export function youtubeProblem(code) { return YT_PROBLEMS[code] || 'יוטיוב החזיר שגיאה. נסו סרטון אחר, או העלו את השיר כקובץ.'; }
export async function youtubePlayer(host, id, { onProblem = () => {}, onState = () => {} } = {}) {
  const YT = await loadYT();
  host.innerHTML = '<div></div>';
  let player, state = -1, lastR = 0, lastPerf = 0, ready = false;
  await new Promise((res, rej) => {
    player = new YT.Player(host.firstChild, {
      videoId: id, width: '100%', height: '100%',
      playerVars: { playsinline: 1, rel: 0, modestbranding: 1, enablejsapi: 1, origin: location.origin },
      events: {
        onReady: () => { ready = true; res(); },
        onStateChange: (e) => { state = e.data; if (state === 1) { lastR = player.getCurrentTime() || 0; lastPerf = performance.now(); } onState(state); },
        onError: (e) => { if (!ready) rej(Object.assign(new Error('video'), { code: e.data })); else onProblem(youtubeProblem(e.data), e.data); },
      },
    });
    setTimeout(() => (ready ? res() : rej(Object.assign(new Error('timeout'), { code: 'timeout' }))), 15000);
  });
  return {
    kind: 'youtube',
    ready: Promise.resolve(),
    // getCurrentTime moves in steps; between steps we extrapolate so the dancers move smoothly
    get time() {
      let r = 0; try { r = player.getCurrentTime() || 0; } catch (e) { return 0; }
      if (state !== 1) { lastR = r; lastPerf = performance.now(); return r; }
      const now = performance.now();
      if (Math.abs(r - lastR) > 0.0005) { lastR = r; lastPerf = now; return r; }
      return lastR + Math.min(0.6, (now - lastPerf) / 1000) * (player.getPlaybackRate ? player.getPlaybackRate() || 1 : 1);
    },
    get duration() { try { return player.getDuration() || 0; } catch (e) { return 0; } },
    get playing() { return state === 1; },
    get title() { try { return player.getVideoData().title || ''; } catch (e) { return ''; } },
    play() {
      try { player.playVideo(); } catch (e) {}
      // some phones only start a video after a tap on the video itself
      setTimeout(() => { if (state !== 1 && state !== 3) onProblem(YT_PROBLEMS.autoplay, 'autoplay'); }, 2500);
    },
    pause() { try { player.pauseVideo(); } catch (e) {} },
    seek(s) { try { player.seekTo(Math.max(0, s), true); lastR = Math.max(0, s); lastPerf = performance.now(); } catch (e) {} },
    dispose() { try { player.destroy(); } catch (e) {} host.innerHTML = ''; },
  };
}

// ---------- keeping the song file in this browser ----------
function idb(mode, fn) {
  return new Promise((res, rej) => {
    const r = indexedDB.open('ofridance', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('songs');
    r.onerror = () => rej(r.error);
    r.onsuccess = () => { const tx = r.result.transaction('songs', mode); const q = fn(tx.objectStore('songs')); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); };
  });
}
export const songStore = {
  save: (blob) => idb('readwrite', (s) => s.put(blob, 'current')).catch(() => null),
  load: () => idb('readonly', (s) => s.get('current')).catch(() => null),
  clear: () => idb('readwrite', (s) => s.delete('current')).catch(() => null),
};
