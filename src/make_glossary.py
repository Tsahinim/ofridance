import pathlib, html
ROOT = pathlib.Path(__file__).resolve().parent
rows = [l.split('\t') for l in (ROOT/'data'/'glossary.tsv').read_text(encoding='utf-8').strip().split('\n')]
cats = ['היפ הופ', 'מודרני', 'יצירה', 'מוזיקה', 'במה']
terms = '\n'.join(f'''      <div class="term" data-cat="{html.escape(c)}"><dt>{html.escape(h)}<bdi class="en" lang="en">{html.escape(e)}</bdi></dt><dd>{html.escape(d)}</dd><span class="tag">{html.escape(c)}</span></div>''' for h, e, c, d in rows)
chips = '\n'.join(f'        <button class="chip" type="button" data-f="{c}" aria-pressed="false">{c}</button>' for c in cats)
page = f'''<!--title: מילון המונחים · OFRIDANCE-->
<!--desc: {len(rows)} מונחי כוריאוגרפיה, היפ הופ ומחול מודרני בעברית, עם השם באנגלית והסבר קצר. חיפוש וסינון לפי נושא.-->
<!--active: glossary-->

<main id="main">
  <section class="page-hero" aria-labelledby="t">
    <h1 id="t" class="monument" data-rise>מילון</h1>
    <div class="under">
      <p class="lead" data-rise style="--i:1">{len(rows)} מונחים שתשמעו בסטודיו, בחזרות ובתחרויות, בעברית ועם השם המקורי באנגלית.</p>
    </div>
  </section>

  <section aria-label="תמונות">
    <div class="band" data-stagger>
      <a href="hiphop.html"><img src="assets/img/hh-cypher.webp" width="1600" height="1067" alt="רקדנית במרכז סייפר" loading="lazy"><span class="panel-title">מילים של תנועה</span></a><a href="modern.html" aria-label="רקדנית בקשת לאחור"><img src="assets/img/md-arch.webp" width="1600" height="1600" alt="רקדנית בקשת לאחור" loading="lazy"></a><a href="path.html" aria-label="שיעור היפ הופ בסטודיו"><img src="assets/img/hh-class.webp" width="1600" height="1068" alt="שיעור היפ הופ בסטודיו" loading="lazy"></a><a href="modern.html#techniques" aria-label="רקדנית מחול עכשווי בזרועות פתוחות"><img src="assets/img/md-gray-3.webp" width="1600" height="1067" alt="רקדנית מחול עכשווי בזרועות פתוחות" loading="lazy"></a>
    </div>
    <p class="band-caption">מונח הוא תנועה שקיבלה שם. ככה מדברים עליה בחזרה.</p>
  </section>

  <section class="section wrap" aria-label="המונחים" style="padding-top:2.5rem">
    <div class="gloss-tools">
      <label class="sr-only" for="q">חיפוש מונח</label>
      <input id="q" type="search" placeholder="חיפוש: גרוב, קנון, Spiral…" autocomplete="off">
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        <button class="chip" type="button" data-f="" aria-pressed="true">הכול</button>
{chips}
      </div>
      <output class="small muted" id="n" style="margin-inline-start:auto"></output>
    </div>
    <dl class="terms" data-stagger>
{terms}
    </dl>
    <p class="none" hidden style="margin-top:2rem">לא מצאנו מונח כזה. נסו מילה אחרת, או בעברית במקום באנגלית.</p>
  </section>

  <a class="cta-band" href="what.html">
    <span class="what">מכירות את המילים? עכשיו לרעיונות שמאחוריהן.</span>
    <svg class="arrow" viewBox="0 0 48 48" aria-hidden="true"><path d="M38 38 L10 10 M10 34 V10 H34" fill="none" stroke="currentColor" stroke-width="3"/></svg>
    <span class="verb">להבין</span>
  </a>
</main>
<script>
(() => {{
  const q = document.getElementById('q'), n = document.getElementById('n'), none = document.querySelector('.none');
  const items = [...document.querySelectorAll('.term')]; let f = '';
  const norm = (s) => s.toLowerCase().replace(/[\u0591-\u05C7]/g, '');
  function run() {{
    const v = norm(q.value.trim()); let k = 0;
    items.forEach((t) => {{ const ok = (!f || t.dataset.cat === f) && (!v || norm(t.textContent).includes(v)); t.hidden = !ok; if (ok) k++; }});
    n.textContent = k + ' מונחים'; none.hidden = k > 0;
  }}
  document.querySelectorAll('.gloss-tools .chip').forEach((b) => b.addEventListener('click', () => {{ f = b.dataset.f; document.querySelectorAll('.gloss-tools .chip').forEach((c) => c.setAttribute('aria-pressed', c === b)); run(); }}));
  q.addEventListener('input', run); run();
}})();
</script>
'''
(ROOT/'pages'/'glossary.html').write_text(page, encoding='utf-8'); print(len(rows))
