// OFRIDANCE — shared page script: menu, reveals, marquee loop.
(() => {
  // mobile menu
  const bar = document.querySelector('.topbar');
  const toggle = document.querySelector('.menu-toggle');
  if (bar && toggle) {
    toggle.addEventListener('click', () => {
      const open = bar.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
      toggle.textContent = open ? 'סגירה' : 'תפריט';
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }

  // tabs that open a short list: click or Enter opens, a second click, Escape or a click elsewhere closes
  const groups = [...document.querySelectorAll('.topbar .tab-group')];
  const shut = (except) => groups.forEach((g) => { if (g !== except) { g.classList.remove('open'); g.querySelector('.tab').setAttribute('aria-expanded', 'false'); } });
  groups.forEach((g) => {
    const b = g.querySelector('.tab');
    b.addEventListener('click', () => { const open = !g.classList.contains('open'); shut(g); g.classList.toggle('open', open); b.setAttribute('aria-expanded', open); });
    g.addEventListener('keydown', (e) => { if (e.key === 'Escape' && g.classList.contains('open')) { shut(); b.focus(); } });
    // in the menu bar, leaving the list with the keyboard closes it
    g.addEventListener('focusout', (e) => { if (!bar.classList.contains('open') && !g.contains(e.relatedTarget)) shut(); });
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.tab-group')) shut(); });
  // the page-level links (the open menu, a hash on the same page) close the mobile panel
  bar?.querySelectorAll('nav a').forEach((a) => a.addEventListener('click', () => {
    if (bar.classList.contains('open')) { bar.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.textContent = 'תפריט'; document.body.style.overflow = ''; }
    shut();
  }));

  // accessibility menu: larger text, high contrast, marked links, a plain font, no motion, a strong focus ring.
  // The choice is remembered on this device and applied before the page paints (see the head script).
  const A11Y_KEY = 'ofri-a11y';
  const read = () => { try { return JSON.parse(localStorage.getItem(A11Y_KEY) || '{}'); } catch (e) { return {}; } };
  let prefs = read();
  const root = document.documentElement;
  const apply = () => {
    [...root.classList].filter((c) => c.startsWith('a11y-')).forEach((c) => root.classList.remove(c));
    for (const [k, v] of Object.entries(prefs)) if (v) root.classList.add('a11y-' + k + (v === true ? '' : '-' + v));
    try { localStorage.setItem(A11Y_KEY, JSON.stringify(prefs)); } catch (e) { /* private mode: the choice lasts for this page */ }
    panel?.querySelectorAll('[data-a11y]').forEach((b) => {
      const k = b.dataset.a11y; b.setAttribute('aria-pressed', k === 'text' ? String(!!prefs.text) : String(!!prefs[k]));
      if (k === 'text') b.textContent = prefs.text ? `הגדלת טקסט (${prefs.text} מתוך 3)` : 'הגדלת טקסט';
    });
  };
  const btn = document.createElement('button');
  btn.className = 'a11y-btn'; btn.type = 'button'; btn.setAttribute('aria-label', 'תפריט נגישות'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'a11y-panel');
  btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="12" cy="4" r="2"/><path d="M4 7.5c2.6.8 5.3 1.2 8 1.2s5.4-.4 8-1.2l.5 1.9c-2.1.7-4.3 1.1-6.5 1.3V14l2.3 7.4-1.9.6L12 15.6 9.6 22l-1.9-.6L10 14v-3.3c-2.2-.2-4.4-.6-6.5-1.3z"/></svg>';
  const panel = document.createElement('div');
  panel.className = 'a11y-panel'; panel.id = 'a11y-panel'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'נגישות');
  panel.innerHTML = `<h2>נגישות</h2><div class="row">
    <button type="button" data-a11y="text">הגדלת טקסט</button>
    <button type="button" data-a11y="contrast">ניגודיות גבוהה</button>
    <button type="button" data-a11y="links">הדגשת קישורים</button>
    <button type="button" data-a11y="font">גופן קריא</button>
    <button type="button" data-a11y="motion">עצירת אנימציות</button>
    <button type="button" data-a11y="focus">סימון מיקוד</button></div>
    <div class="foot"><button type="button" data-reset>איפוס</button><a href="accessibility.html">הצהרת נגישות</a></div>`;
  document.body.append(btn, panel);
  btn.addEventListener('click', () => { const open = panel.hidden; panel.hidden = !open; btn.setAttribute('aria-expanded', open); if (open) panel.querySelector('button').focus(); });
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-reset')) prefs = {};
    else if (b.dataset.a11y === 'text') prefs.text = ((prefs.text || 0) + 1) % 4 || 0;
    else prefs[b.dataset.a11y] = !prefs[b.dataset.a11y];
    apply();
  });
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.focus(); } });
  document.addEventListener('click', (e) => { if (!panel.hidden && !panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
  apply();

  // stagger index for groups: children of [data-stagger] get --i
  document.querySelectorAll('[data-stagger]').forEach((g) => {
    [...g.children].forEach((c, i) => { c.style.setProperty('--i', i % 8); if (!c.hasAttribute('data-reveal')) c.setAttribute('data-reveal', ''); });
  });

  // reveal once on entering the viewport; never leaves content hidden
  const targets = document.querySelectorAll('[data-reveal]');
  if (targets.length) {
    if (!('IntersectionObserver' in window)) targets.forEach((el) => el.classList.add('is-in'));
    else {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
      targets.forEach((el) => io.observe(el));
      addEventListener('load', () => setTimeout(() => targets.forEach((el) => {
        const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in');
      }), 2500));
    }
  }

  // marquee: duplicate content once for a seamless loop
  document.querySelectorAll('.marquee .track').forEach((t) => { t.innerHTML += t.innerHTML; });
})();
