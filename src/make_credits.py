import pathlib, json, html, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
names = {'martha-graham-dance-company-repeteert':'graham-rehearsal','martha-graham-every-soul':'graham-every-soul','martha-graham-letter-world':'graham-letter','merce-cunningham':'cunningham','isadora-duncan-dancing':'duncan-dancing','isadora-duncan-1878':'duncan-portrait','the-dancers-of-the-batsheva':'batsheva'}
used = set(re.findall(r'assets/(?:img|arch)/([\w-]+)\.webp', ' '.join(p.read_text(encoding='utf-8') for p in (ROOT/'src'/'pages').glob('*.html'))))
arch = []
for c in json.load(open(ROOT/'assets'/'credits.json', encoding='utf-8')):
    key = next((v for k, v in names.items() if k in c['file']), None)
    if key and key in used:
        arch.append(f'<figure><img src="assets/thumbs/{key}.webp" alt="" loading="lazy"><figcaption><bdi lang="en">“{html.escape(c["title"])}”</bdi>, <bdi lang="en">{html.escape(c["creator"] or "")}</bdi>, {html.escape(c["license"])}, דרך <a class="link" href="{html.escape(c["page"])}" rel="noopener">{html.escape(c["via"] or "המקור")}</a>.</figcaption></figure>')
uns = []
for line in (ROOT/'assets'/'credits.txt').read_text(encoding='utf-8').strip().split('\n'):
    name, pid, who = line.split('|')
    if name in used:
        uns.append(f'<figure><img src="assets/thumbs/{name}.webp" alt="" loading="lazy"><figcaption><bdi lang="en">{html.escape(who)}</bdi>, <a class="link" href="https://unsplash.com/photos/{pid}" rel="noopener">Unsplash</a></figcaption></figure>')
page = f'''<!--title: קרדיטים · OFRIDANCE-->
<!--desc: רשימת הצלמים והמקורות של התמונות, התנועות המוקלטות והרקדנית בתלת-ממד באתר OFRIDANCE.-->

<main id="main">
  <section class="page-hero" aria-labelledby="t">
    <h1 id="t" class="monument" data-rise>קרדיטים</h1>
    <div class="under"><p class="lead" data-rise style="--i:1">התמונות באתר מגיעות מצלמים שמשתפים את עבודתם בחינם, ומארכיונים פתוחים. תודה לכולם.</p></div>
  </section>
  <section class="chapter wrap" aria-labelledby="a-h">
    <header><h2 id="a-h">צילומי ארכיון</h2></header>
    <div class="body"><p>צילומים היסטוריים מספריית הקונגרס האמריקאית, מהארכיון הלאומי של הולנד ומוויקישיתוף, ברישיונות שמאפשרים שימוש חופשי.</p><div class="credit-grid" data-stagger style="margin-top:1.5rem">{''.join(arch)}</div></div>
  </section>
  <section class="chapter wrap" aria-labelledby="u-h">
    <header><h2 id="u-h">צילומים עכשוויים</h2></header>
    <div class="body"><p>כל הצילומים העכשוויים מגיעים מ-Unsplash, ברישיון שמאפשר שימוש חופשי, גם מסחרי. הרקדניות והרקדנים בתמונות אינם תלמידי OFRIDANCE, והתמונות מוצגות כהשראה לעולמות הריקוד.</p><div class="credit-grid" data-stagger style="margin-top:1.5rem">{''.join(uns)}</div></div>
  </section>
  <section id="motion" class="chapter wrap" aria-labelledby="m-h">
    <header><h2 id="m-h">התנועות והרקדנית</h2></header>
    <div class="body">
      <p>התנועות של סגנונות הרחוב, הג׳אז והבלט־ג׳אז הן מתוך מאגר <bdi lang="en" dir="ltr">AIST++</bdi> של <bdi lang="en">Google LLC</bdi>, שנבנה על מאגר הריקוד <bdi lang="en" dir="ltr">AIST Dance Video Database</bdi> של המכון הלאומי היפני למדע ולטכנולוגיה תעשייתית (<bdi lang="en">AIST</bdi>), ברישיון <bdi lang="en" dir="ltr">CC BY 4.0</bdi>. התנועות הומרו לפורמט קומפקטי והועברו לגוף של הרקדנית.</p>
      <p>משפטי המחול המודרני הם מתוך מאגר לכידת התנועה של מעבדת הגרפיקה באוניברסיטת קרנגי מלון (<bdi lang="en" dir="ltr">mocap.cs.cmu.edu</bdi>), שנוצר במימון הקרן הלאומית האמריקאית למדע (<bdi lang="en" dir="ltr">NSF EIA-0196217</bdi>).</p>
      <p>הדמות של הרקדנית היא <bdi lang="en">Michelle</bdi> משירות <bdi lang="en">Mixamo</bdi> של <bdi lang="en">Adobe</bdi>, כפי שהיא מופיעה בדוגמאות של <bdi lang="en">three.js</bdi>. תלבושת המודרני היא צביעה מחדש של התלבושת המקורית.</p>
    </div>
  </section>
  <section class="chapter wrap" aria-labelledby="f-h">
    <header><h2 id="f-h">גופנים וקוד</h2></header>
    <div class="body"><p>הגופנים <bdi lang="en">Hanken Grotesk</bdi> ו-<bdi lang="en">IBM Plex Sans Hebrew</bdi> ברישיון <bdi lang="en">SIL Open Font License</bdi>. התלת-ממד בנוי עם <bdi lang="en">three.js</bdi>, וזיהוי התנועה במראה עם <bdi lang="en">Google MediaPipe</bdi>.</p></div>
  </section>
</main>
'''
(ROOT/'src'/'pages'/'credits.html').write_text(page, encoding='utf-8'); print(len(arch), len(uns), sorted(used - set(n for n in names.values())) [:0])
