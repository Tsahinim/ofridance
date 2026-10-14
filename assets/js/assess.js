// OFRIDANCE — self-assessment for advanced dancers: rate each criterion, see the shape, get the next drills.
// Reads its criteria from the JSON in <script type="application/json" class="assess-data">. Saved in this browser only.
document.querySelectorAll('[data-assess]').forEach((root) => {
  const data = JSON.parse(root.querySelector('.assess-data').textContent);
  const KEY = 'ofridance-assess-' + root.dataset.assess;
  let vals = {}; try { vals = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  data.criteria.forEach((c) => { if (!vals[c.id]) vals[c.id] = 3; });
  const list = root.querySelector('.assess-list'), svg = root.querySelector('.assess-shape'), out = root.querySelector('.assess-next');
  const NS = 'http://www.w3.org/2000/svg';
  data.criteria.forEach((c) => {
    const row = document.createElement('label'); row.className = 'assess-row';
    row.innerHTML = `<span class="an">${c.name}<small>${c.hint}</small></span><input type="range" min="1" max="5" step="1" value="${vals[c.id]}" aria-label="${c.name}"><output>${vals[c.id]}</output>`;
    const input = row.querySelector('input'), o = row.querySelector('output');
    input.addEventListener('input', () => { vals[c.id] = +input.value; o.textContent = input.value; save(); draw(); });
    list.appendChild(row);
  });
  function save() { try { localStorage.setItem(KEY, JSON.stringify(vals)); } catch (e) {} }
  function draw() {
    const n = data.criteria.length, cx = 160, cy = 160, R = 120;
    const pt = (i, r) => { const a = -Math.PI / 2 - (i / n) * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
    svg.innerHTML = '';
    for (let k = 1; k <= 5; k++) { const poly = document.createElementNS(NS, 'polygon'); poly.setAttribute('points', data.criteria.map((_, i) => pt(i, (R * k) / 5).join(',')).join(' ')); poly.setAttribute('fill', k % 2 ? 'var(--surface)' : 'none'); poly.setAttribute('stroke', 'currentColor'); poly.setAttribute('stroke-opacity', '0.15'); svg.appendChild(poly); }
    const shape = document.createElementNS(NS, 'polygon');
    shape.setAttribute('points', data.criteria.map((c, i) => pt(i, (R * vals[c.id]) / 5).join(',')).join(' '));
    shape.setAttribute('fill', '#d92b21'); shape.setAttribute('fill-opacity', '0.55'); shape.setAttribute('stroke', '#d92b21'); shape.setAttribute('stroke-width', '3');
    svg.appendChild(shape);
    data.criteria.forEach((c, i) => { const [x, y] = pt(i, R + 22); const t = document.createElementNS(NS, 'text'); t.setAttribute('x', x); t.setAttribute('y', y); t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'middle'); t.setAttribute('font-size', '13'); t.setAttribute('fill', 'currentColor'); t.textContent = c.name; svg.appendChild(t); });
    const weakest = [...data.criteria].sort((a, b) => vals[a.id] - vals[b.id]).slice(0, 2);
    out.innerHTML = `<h3>מה לתרגל עכשיו</h3>` + weakest.map((c) => `<div class="assess-tip"><b>${c.name} · ${vals[c.id]} מתוך 5</b><p>${c.drill}</p></div>`).join('');
  }
  draw();
});
