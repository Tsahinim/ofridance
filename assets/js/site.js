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
