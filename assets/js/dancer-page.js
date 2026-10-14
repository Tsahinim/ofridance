// OFRIDANCE — move explorer: pick a move, watch it from any angle, slow it down, mirror it.
import { createDancer, MOVES, MOVE_BY_ID } from './dancer3d.js';

const app = document.getElementById('dancer-app');
if (app) {
  const $ = (q) => app.querySelector(q);
  const dancer = createDancer($('.viewport'));
  let style = 'hiphop', current = null;
  dancer.setBpm(90); dancer.setLoop(true);

  function list() {
    app.querySelectorAll('.style-tabs .chip').forEach((b) => b.setAttribute('aria-pressed', b.dataset.style === style));
    const box = $('.move-list'); box.innerHTML = '';
    MOVES.filter((m) => m.style === style).forEach((m) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'move-card';
      b.setAttribute('aria-pressed', current && current.id === m.id);
      b.innerHTML = `<b>${m.name}</b><span><bdi class="en">${m.en}</bdi> · <span class="len">${m.len} ${m.len === 1 ? 'ספירה' : 'ספירות'}</span></span>`;
      b.addEventListener('click', () => pick(m));
      box.appendChild(b);
    });
  }
  function pick(m) {
    current = m;
    dancer.setSequence([{ id: m.id, start: 0, len: m.len }]); dancer.seek(0); dancer.play();
    $('#play').textContent = 'עצירה';
    $('.explain h3').innerHTML = `${m.name} <bdi class="en" style="font-weight:400;color:#9a9a9a;font-size:1rem">${m.en}</bdi>`;
    $('.explain .how').textContent = m.how;
    $('.explain .tip').textContent = 'טיפ: ' + m.tip;
    $('.explain .len').textContent = `${m.len} ${m.len === 1 ? 'ספירה' : 'ספירות'} · ${m.style === 'hiphop' ? 'היפ הופ' : 'מחול מודרני'}`;
    list();
    history.replaceState(null, '', '#' + m.id);
  }
  app.querySelectorAll('.style-tabs .chip').forEach((b) => b.addEventListener('click', () => { style = b.dataset.style; list(); }));
  $('#play').addEventListener('click', () => { if (dancer.playing) { dancer.pause(); $('#play').textContent = 'נגן'; } else { dancer.play(); $('#play').textContent = 'עצירה'; } });
  $('#speed').addEventListener('input', (e) => { dancer.setSpeed(+e.target.value); $('#speed-out').textContent = `×${(+e.target.value).toFixed(2).replace(/\.?0+$/, '')}`; });
  $('#mirror').addEventListener('change', (e) => dancer.setMirror(e.target.checked));
  app.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => dancer.view(b.dataset.view)));
  dancer.onCount((c) => { $('.big-count').textContent = (c % 8) + 1; });

  const start = MOVE_BY_ID[location.hash.slice(1)] || MOVES[0];
  style = start.style; list(); pick(start);
}
