// OFRIDANCE — the dancer: a library of real recorded moves, played on a 3D dancer.
import { createRealDancer, createViewer } from './realdancer.js';
import { MOVES, MOVE_BY_ID, STYLES, LEVELS } from './moves.js';

const LEGACY = { bounce: 'gMH-08', rock: 'gLH-09', breath: 'cmu-03', groove: 'gMH-04' };
const STEPS = {
  1: ['צפו פעם אחת במהירות מלאה, רק כדי להרגיש את התנועה.', 'עברו לחצי מהירות וסמנו "מראה". רקדו יחד עם הרקדנית, קודם רק רגליים.', 'הוסיפו ידיים, ואז חזרו למהירות מלאה. ספרו בקול עד שמונה.'],
  2: ['צפו בה מהצד ומאחור: איפה המשקל? מה מתחיל את התנועה?', 'רבע מהירות, במראה. פרקו לשתי ספירות בכל פעם.', 'חצי מהירות עד שזה זורם, ורק אז מלא. צלמו את עצמכן והשוו.'],
  3: ['צפו כמה פעמים בלי לרקוד. חפשו את הרגע הכי קשה.', 'עצרו על הרגע הזה עם פס הזמן, ותרגלו אותו לבד ברבע מהירות.', 'חברו אותו חזרה לרצף, בחצי מהירות ואז מלא. מנוחה בין חזרות, והקשיבו לגוף.'],
};
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const app = document.getElementById('rd-app');
if (app) init(app);

async function init(app) {
  const $ = (q) => app.querySelector(q);
  const page = app.closest('.rd-studio');
  const viewEl = $('.rd-view'), countEl = $('.big-count'), loading = $('.rd-loading');
  let side = 'hiphop', level = 0, current = null, playing = true, speed = 1, t = 0, showCount = true, lastBeat = -1;

  // ----- list
  function renderList() {
    const nav = $('.rd-list'); nav.innerHTML = '';
    for (const [g, st] of Object.entries(STYLES)) {
      if (st.side !== side) continue;
      const items = MOVES.filter((m) => m.style === g && (!level || m.lv === level)).sort((a, b) => (a.routine - b.routine) || (a.lv - b.lv));
      if (!items.length) continue;
      const h = document.createElement('h2'); h.className = 'rd-group'; h.textContent = st.he; nav.appendChild(h);
      const ul = document.createElement('ul');
      for (const m of items) {
        const li = document.createElement('li');
        li.innerHTML = `<button type="button" data-id="${m.id}" aria-current="${current === m.id}"><span class="rd-lv" data-lv="${m.lv}" aria-label="${LEVELS[m.lv]}"><i></i><i></i><i></i></span><span class="rd-n">${m.he}</span>${m.routine ? '<span class="rd-tag">קטע מלא</span>' : ''}</button>`;
        li.firstChild.addEventListener('click', () => { select(m.id); if (matchMedia('(max-width: 62em)').matches) viewEl.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
        ul.appendChild(li);
      }
      nav.appendChild(ul);
    }
  }
  page.querySelectorAll('[data-side]').forEach((b) => b.addEventListener('click', () => {
    if (side === b.dataset.side) return;
    side = b.dataset.side; page.querySelectorAll('[data-side]').forEach((x) => x.setAttribute('aria-selected', x === b));
    const first = MOVES.find((m) => STYLES[m.style].side === side && (!level || m.lv === level));
    renderList(); if (first) select(first.id);
  }));
  page.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => {
    level = +b.dataset.level; page.querySelectorAll('[data-level]').forEach((x) => x.setAttribute('aria-pressed', x === b)); renderList();
  }));

  // ----- 3D
  const viewer = createViewer(viewEl);
  let dancer;
  try { dancer = await createRealDancer({ outfit: 'hiphop' }); }
  catch (e) { loading.textContent = 'לא הצלחנו לטעון את הרקדנית. בדקו את החיבור לאינטרנט ונסו לרענן.'; return; }
  viewer.scene.add(dancer.root);

  async function select(id) {
    const m = MOVE_BY_ID[id]; if (!m) return;
    current = id; history.replaceState(null, '', '#' + id);
    const st = STYLES[m.style];
    if (st.side !== side) { side = st.side; page.querySelectorAll('[data-side]').forEach((x) => x.setAttribute('aria-selected', x.dataset.side === side)); }
    renderList();
    loading.hidden = false; loading.textContent = 'טוענים את התנועה…';
    const outfit = side === 'modern' ? 'modern' : 'hiphop';
    try {
      if (dancer.outfit !== outfit) await dancer.setOutfit(outfit);
      const c = await dancer.setClip(id);
      if (current !== id) return;
      t = 0; lastBeat = -1; viewer.fitTo(c.fit); dancer.pose(0); const h = dancer.hips(); viewer.snap(h.x, h.z);
      loading.hidden = true;
    } catch (e) { loading.textContent = 'לא הצלחנו לטעון את התנועה הזו. נסו שוב.'; return; }
    // info
    const info = app.querySelector('.rd-info');
    info.querySelector('.rd-name').textContent = m.he;
    info.querySelector('.rd-level').innerHTML = `<span class="rd-lv" data-lv="${m.lv}"><i></i><i></i><i></i></span> ${st.he} · ${LEVELS[m.lv]}${dancer.clip.bpm ? ` · <bdi>${dancer.clip.bpm}</bdi> פעימות לדקה` : ''}`;
    info.querySelector('.rd-desc').textContent = m.d;
    info.querySelector('.rd-steps').innerHTML = STEPS[m.lv].map((s) => `<li>${s}</li>`).join('');
    const sameStyle = MOVES.filter((x) => x.style === m.style);
    const next = sameStyle[sameStyle.indexOf(m) + 1] || sameStyle.find((x) => x.routine && x.id !== id);
    const nx = info.querySelector('.rd-next');
    nx.innerHTML = next ? `הבאה בסגנון: <button type="button" class="link">${next.he}</button>` : '';
    if (next) nx.querySelector('button').addEventListener('click', () => select(next.id));
  }

  // ----- transport
  const playBtn = $('#rd-play');
  playBtn.addEventListener('click', () => { playing = !playing; playBtn.textContent = playing ? 'עצירה' : 'ניגון'; });
  app.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => { speed = +b.dataset.speed; app.querySelectorAll('[data-speed]').forEach((x) => x.setAttribute('aria-pressed', x === b)); }));
  app.querySelectorAll('[data-yaw]').forEach((b) => b.addEventListener('click', () => { viewer.setYaw(+b.dataset.yaw); app.querySelectorAll('[data-yaw]').forEach((x) => x.setAttribute('aria-pressed', x === b)); }));
  viewer.canvas.addEventListener('pointerdown', () => app.querySelectorAll('[data-yaw]').forEach((x) => x.setAttribute('aria-pressed', 'false')));
  $('#rd-mirror').addEventListener('change', (e) => viewEl.classList.toggle('mirrored', e.target.checked));
  $('#rd-count').addEventListener('change', (e) => { showCount = e.target.checked; countEl.textContent = showCount ? countEl.textContent : ''; });
  const scrub = $('#rd-time'), scrubOut = $('#rd-time-out');
  scrub.addEventListener('input', () => { if (!dancer.clip) return; t = scrub.value / 1000 * dancer.clip.duration; playing = false; playBtn.textContent = 'ניגון'; });
  document.addEventListener('keydown', (e) => { if (e.code === 'Space' && !/INPUT|BUTTON|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); playBtn.click(); } });

  let prev = performance.now(), visible = true;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(viewEl);
  function frame(now) {
    const dt = Math.min(0.1, (now - prev) / 1000); prev = now;
    const c = dancer.clip;
    if (c && visible) {
      if (playing) t = (t + dt * speed) % c.duration;
      dancer.pose(t);
      const h = dancer.hips(); viewer.follow(h.x, h.z, dt);
      viewer.render();
      scrub.value = Math.round(t / c.duration * 1000); scrubOut.textContent = fmt(t);
      if (showCount && c.bpm) {
        const beat = Math.floor(t * c.bpm / 60);
        if (beat !== lastBeat) { lastBeat = beat; countEl.textContent = (beat % 8) + 1; countEl.classList.remove('pulse'); void countEl.offsetWidth; countEl.classList.add('pulse'); }
      } else if (!c.bpm) countEl.textContent = '';
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  const hash = decodeURIComponent(location.hash.slice(1));
  const startId = MOVE_BY_ID[hash] ? hash : LEGACY[hash] || 'gMH-07';
  renderList(); select(startId);
  // the site menu links straight to a move; follow it when the page is already open
  addEventListener('hashchange', () => { const h = decodeURIComponent(location.hash.slice(1)); const id = MOVE_BY_ID[h] ? h : LEGACY[h]; if (id && id !== current) select(id); });
}
