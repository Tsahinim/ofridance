// OFRIDANCE — guided viewing: watch a choreography with a notebook that stamps every observation with its moment in the video.
import { youtubePlayer, youtubeId, youtubeProblem } from './music.js';


const CATS = [
  ['מערך', 'formation'], ['מעבר', 'transition'], ['רמות', 'levels'], ['יוניסון', 'unison'], ['קנון', 'canon'],
  ['היט', 'hit'], ['טקסטורה', 'texture'], ['מוזיקליות', 'music'], ['רגש וסיפור', 'story'], ['רעיון לגנוב', 'steal'],
];
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function init(app) {
  const $ = (q) => app.querySelector(q);
  let player = null, vid = null, notes = [], title = '';
  const key = () => 'ofridance-watch-' + vid;
  const save = () => { try { localStorage.setItem(key(), JSON.stringify({ title, notes })); } catch (e) {} };
  const status = (t) => { $('.watch-status').textContent = t; };

  // quick-note chips: one tap stamps the current moment
  const chips = $('.note-chips');
  CATS.forEach(([name]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = name; b.addEventListener('click', () => addNote(name)); chips.appendChild(b); });

  function addNote(cat) {
    if (!player) { status('בחרו קודם סרטון מהספרייה או הדביקו קישור.'); return; }
    const t = player.time; notes.push({ t, cat, text: '' }); notes.sort((a, b) => a.t - b.t); save(); render();
    const row = [...app.querySelectorAll('.note-row')].find((r) => +r.dataset.t === t); if (row) row.querySelector('input').focus({ preventScroll: true });
  }
  function render() {
    const list = $('.note-list'); list.innerHTML = '';
    $('.note-count').textContent = notes.length ? `${notes.length} הערות` : 'עוד אין הערות';
    notes.forEach((n, i) => {
      const li = document.createElement('li'); li.className = 'note-row'; li.dataset.t = n.t;
      li.innerHTML = `<button type="button" class="nt" aria-label="לקפוץ לרגע ${fmt(n.t)}">${fmt(n.t)}</button><span class="nc">${esc(n.cat)}</span><input type="text" value="${esc(n.text)}" placeholder="מה ראיתן? (לא חובה)" aria-label="הערה ברגע ${fmt(n.t)}"><button type="button" class="nx" aria-label="מחיקת ההערה">מחיקה</button>`;
      li.querySelector('.nt').addEventListener('click', () => { player.seek(Math.max(0, n.t - 2)); player.play(); });
      li.querySelector('input').addEventListener('input', (e) => { n.text = e.target.value; save(); });
      li.querySelector('.nx').addEventListener('click', () => { notes.splice(i, 1); save(); render(); });
      list.appendChild(li);
    });
  }
  async function load(id, name) {
    if (player) { player.dispose(); player = null; }
    vid = id; title = name || ''; status('טוענים את הסרטון…');
    try { notes = (JSON.parse(localStorage.getItem(key()) || 'null') || {}).notes || []; } catch (e) { notes = []; }
    render();
    try {
      player = await youtubePlayer($('.watch-player'), id, { onProblem: (msg) => status(msg) });
      title = title || player.title; status(`עכשיו בצפייה: ${title}. בכל פעם שאתן רואות משהו, לחצו על אחד הכפתורים מתחת לסרטון.`);
      $('.watch-title').textContent = title; save();
    } catch (e) { status(e && e.code && e.code !== 'timeout' ? youtubeProblem(e.code) : 'לא הצלחנו לטעון את יוטיוב. בדקו את החיבור לאינטרנט.'); }
  }
  $('#watch-load').addEventListener('click', () => { const id = youtubeId($('#watch-url').value); if (!id) { status('זה לא נראה כמו קישור ליוטיוב.'); return; } load(id, ''); });
  document.querySelectorAll('[data-watch]').forEach((b) => b.addEventListener('click', () => {
    load(b.dataset.watch, b.dataset.title);
    app.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }));
  $('#watch-copy').addEventListener('click', async () => {
    if (!notes.length) { status('אין עדיין הערות להעתיק.'); return; }
    const text = `${title}\nhttps://youtu.be/${vid}\n\n` + notes.map((n) => `${fmt(n.t)}  ${n.cat}${n.text ? ': ' + n.text : ''}`).join('\n');
    try { await navigator.clipboard.writeText(text); status('ההערות הועתקו. אפשר להדביק אותן בווטסאפ למורה או לקבוצה.'); } catch (e) { prompt('העתיקו:', text); }
  });
  // the five viewings: tick them off as you go
  app.querySelectorAll('.pass input').forEach((c, i) => c.addEventListener('change', () => { try { const k = 'ofridance-passes-' + vid; const s = JSON.parse(localStorage.getItem(k) || '{}'); s[i] = c.checked; localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} }));
  render();
}

const watchApp = document.getElementById('watch-app');
if (watchApp) init(watchApp);
