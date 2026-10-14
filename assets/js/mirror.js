// OFRIDANCE — the mirror: camera + on-device pose detection (MediaPipe), pose challenges and drawing in the air.
// Nothing is uploaded: frames are read in this browser tab only. The model file is downloaded once from Google's CDN.

const LM = { nose: 0, lSh: 11, rSh: 12, lEl: 13, rEl: 14, lWr: 15, rWr: 16, lHip: 23, rHip: 24, lKn: 25, rKn: 26, lAn: 27, rAn: 28 };
const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 31], [28, 32]];
// target angles (degrees), from the dancer's own left/right
const POSES = {
  t: { name: 'טי', hint: 'זרועות ישרות לצדדים, בגובה הכתפיים.', a: { lSh: 90, rSh: 90, lEl: 175, rEl: 175, lKn: 175, rKn: 175 } },
  v: { name: 'וי', hint: 'שתי הזרועות ישרות באלכסון למעלה.', a: { lSh: 145, rSh: 145, lEl: 175, rEl: 175, lKn: 175, rKn: 175 } },
  up: { name: 'למעלה', hint: 'הזרועות מעל הראש, מעוגלות קצת.', a: { lSh: 168, rSh: 168, lEl: 150, rEl: 150, lKn: 175, rKn: 175 } },
  plie: { name: 'פליה', hint: 'ברכיים כפופות לצדדים, זרועות פתוחות.', a: { lSh: 80, rSh: 80, lEl: 165, rEl: 165, lKn: 125, rKn: 125 } },
  hit: { name: 'היט', hint: 'יד ימין ישרה למעלה, יד שמאל כפופה מול החזה.', a: { rSh: 170, rEl: 175, lSh: 40, lEl: 55, lKn: 165, rKn: 165 } },
  point: { name: 'פוינט', hint: 'יד ימין מצביעה באלכסון לצד, יד שמאל על המותן.', a: { rSh: 110, rEl: 175, lSh: 30, lEl: 80, lKn: 165, rKn: 165 } },
};
function angle(a, b, c) { // angle at b
  const v1 = [a.x - b.x, a.y - b.y], v2 = [c.x - b.x, c.y - b.y];
  const d = Math.hypot(...v1) * Math.hypot(...v2); if (!d) return 0;
  return Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / d))) * 180 / Math.PI;
}
function measure(p) {
  return {
    lSh: angle(p[LM.lHip], p[LM.lSh], p[LM.lEl]), rSh: angle(p[LM.rHip], p[LM.rSh], p[LM.rEl]),
    lEl: angle(p[LM.lSh], p[LM.lEl], p[LM.lWr]), rEl: angle(p[LM.rSh], p[LM.rEl], p[LM.rWr]),
    lKn: angle(p[LM.lHip], p[LM.lKn], p[LM.lAn]), rKn: angle(p[LM.rHip], p[LM.rKn], p[LM.rAn]),
  };
}
function score(m, target) { const ks = Object.keys(target.a); const err = ks.reduce((s, k) => s + Math.abs((m[k] || 0) - target.a[k]), 0) / ks.length; return Math.max(0, Math.round(100 - err * 1.25)); }

function drawTarget(svg, key) {
  // a small stick figure of the target, drawn from the angles (front view, mirrored like the camera)
  const a = POSES[key].a; const s = (deg) => deg * Math.PI / 180;
  const sh = { l: [38, 40], r: [62, 40] }, hip = { l: [44, 78], r: [56, 78] };
  const arm = (side, shA, elA) => { const dir = side === 'l' ? -1 : 1; const [x, y] = sh[side]; const t = s(shA); const e = [x + dir * Math.sin(t) * 18, y + Math.cos(t) * 18]; const bend = 180 - (elA ?? 175); const t2 = t + s(bend); const w = [e[0] + dir * Math.sin(t2) * 16, e[1] + Math.cos(t2) * 16]; return `M${x} ${y} L${e[0].toFixed(1)} ${e[1].toFixed(1)} L${w[0].toFixed(1)} ${w[1].toFixed(1)}`; };
  const leg = (side, knA) => { const dir = side === 'l' ? -1 : 1; const [x, y] = hip[side]; const bend = 180 - (knA ?? 175); const k = [x + dir * Math.sin(s(bend / 2)) * 20, y + Math.cos(s(bend / 2)) * 20]; const f = [k[0] - dir * Math.sin(s(bend / 2)) * 4, k[1] + 20]; return `M${x} ${y} L${k[0].toFixed(1)} ${k[1].toFixed(1)} L${f[0].toFixed(1)} ${f[1].toFixed(1)}`; };
  svg.innerHTML = `<g fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="50" cy="24" r="8" fill="#fff" stroke="none"/>
    <path d="M38 40 L62 40 L56 78 L44 78 Z" fill="#fff" stroke="none" opacity=".9"/>
    <path d="${arm('l', a.lSh ?? 20, a.lEl)}" stroke="#d92b21"/><path d="${arm('r', a.rSh ?? 20, a.rEl)}"/>
    <path d="${leg('l', a.lKn)}"/><path d="${leg('r', a.rKn)}"/></g>`;
}

async function init(app) {
  const $ = (q) => app.querySelector(q);
  const video = $('video'), canvas = $('canvas'), g = canvas.getContext('2d');
  let landmarker = null, stream = null, running = false, mode = 'skeleton', target = 't', trails = [], best = 0, game = null;
  const status = (t) => { $('.status').textContent = t; };

  app.querySelectorAll('.pose-list .chip').forEach((b) => b.addEventListener('click', () => { target = b.dataset.pose; app.querySelectorAll('.pose-list .chip').forEach((c) => c.setAttribute('aria-pressed', c === b)); drawTarget($('.target'), target); $('.pose-hint').textContent = POSES[target].hint; best = 0; }));
  app.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode; trails = []; app.querySelectorAll('[data-mode]').forEach((c) => c.setAttribute('aria-pressed', c === b)); $('.target').style.display = mode === 'pose' ? '' : 'none'; $('.score').style.display = mode === 'pose' ? '' : 'none'; }));
  drawTarget($('.target'), target); $('.pose-hint').textContent = POSES[target].hint;

  $('#cam').addEventListener('click', async () => {
    if (running) return stop();
    status('טוען את זיהוי התנועה…');
    try {
      if (!landmarker) {
        const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14');
        const files = await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
        landmarker = await vision.PoseLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task', delegate: 'GPU' },
          runningMode: 'VIDEO', numPoses: 1,
        });
      }
      status('מבקש גישה למצלמה…');
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } }, audio: false });
      video.srcObject = stream; await video.play();
      running = true; $('.placeholder').hidden = true; $('#cam').textContent = 'כיבוי המצלמה'; status('המצלמה פועלת. עמדו כך שכל הגוף ייכנס לתמונה.');
      loop();
    } catch (e) {
      status(e && e.name === 'NotAllowedError' ? 'לא ניתנה גישה למצלמה. אפשר לאשר אותה בהגדרות הדפדפן ולנסות שוב.' : 'לא הצלחנו להפעיל את המצלמה או לטעון את זיהוי התנועה. בדקו חיבור לאינטרנט ושיש מצלמה.');
    }
  });
  function stop() { running = false; if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; video.srcObject = null; $('.placeholder').hidden = false; $('#cam').textContent = 'הפעלת המצלמה'; status('המצלמה כבויה.'); g.clearRect(0, 0, canvas.width, canvas.height); }

  $('#game').addEventListener('click', () => {
    if (!running) { status('הפעילו קודם את המצלמה.'); return; }
    mode = 'pose'; app.querySelector('[data-mode="pose"]').click();
    const beat = 60000 / 100; let k = 5; best = 0; game = { phase: 'count' };
    const tick = () => {
      if (k <= 8) { $('.score b').textContent = k; $('.score span').textContent = 'מוכנות…'; k++; setTimeout(tick, beat); }
      else { game.phase = 'hold'; $('.score span').textContent = 'קפאו!'; setTimeout(() => { game = null; $('.score span').textContent = `התוצאה: ${best}`; $('.score b').textContent = best; }, 1500); }
    };
    tick();
  });

  let lastT = -1;
  function loop() {
    if (!running) return;
    if (video.readyState >= 2) {
      if (canvas.width !== video.videoWidth) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; }
      const now = performance.now();
      if (now !== lastT) {
        lastT = now;
        const res = landmarker.detectForVideo(video, now);
        g.clearRect(0, 0, canvas.width, canvas.height);
        const p = res.landmarks && res.landmarks[0];
        if (p) {
          const W = canvas.width, H = canvas.height; const pt = (i) => [p[i].x * W, p[i].y * H];
          if (mode === 'trails') {
            for (const i of [15, 16, 27, 28]) trails.push({ x: p[i].x * W, y: p[i].y * H, i, life: 1 });
            trails = trails.filter((t) => (t.life -= 0.012) > 0);
            for (const t of trails) { g.fillStyle = t.i < 20 ? `rgba(217,43,33,${t.life})` : `rgba(255,255,255,${t.life * 0.8})`; g.beginPath(); g.arc(t.x, t.y, 10 * t.life + 2, 0, Math.PI * 2); g.fill(); }
          }
          g.lineCap = 'round'; g.lineWidth = Math.max(4, W / 160); g.strokeStyle = '#d92b21';
          for (const [a, b] of BONES) { if (p[a].visibility < 0.4 || p[b].visibility < 0.4) continue; const [x1, y1] = pt(a), [x2, y2] = pt(b); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
          g.fillStyle = '#ffffff';
          for (const i of [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) { if (p[i].visibility < 0.4) continue; const [x, y] = pt(i); g.beginPath(); g.arc(x, y, Math.max(5, W / 110), 0, Math.PI * 2); g.fill(); }
          if (mode === 'pose') {
            const sc = score(measure(p), POSES[target]);
            if (!game) { $('.score b').textContent = sc; $('.score span').textContent = sc > 85 ? 'מדויק!' : sc > 65 ? 'כמעט' : 'עוד קצת'; }
            if (game && game.phase === 'hold') best = Math.max(best, sc);
          }
        }
      }
    }
    requestAnimationFrame(loop);
  }
}

const mirrorApp = document.getElementById('mirror-app');
if (mirrorApp) init(mirrorApp);
