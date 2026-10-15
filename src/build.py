# Assembles every page in src/pages into the site root with the shared head, top bar and footer.
import re, pathlib, time
VER = str(int(time.time()))
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'
SITE = 'https://tsahinim.github.io/ofridance/'
mark = (ROOT / 'brand' / 'ofridance-wordmark.svg').read_text(encoding='utf-8')
mark = re.sub(r'<title>.*?</title>', '', mark).replace('<svg ', '<svg aria-hidden="true" focusable="false" ', 1)

# the top menu: plain tabs, and tabs that open a short list. Each list starts with the tab's own page.
MENU = [
    ('index.html', 'ראשי', None),
    ('hiphop.html', 'היפ הופ', [('hiphop.html', 'היפ הופ: הסגנון והיסודות'), ('hiphop-pro.html', 'היפ הופ למתקדמות'),
                                ('dancer.html#gMH-07', 'תנועות היפ הופ עם הרקדנית'), ('watch.html#hh', 'סרטונים להיפ הופ')]),
    ('modern.html', 'מודרני', [('modern.html', 'מחול מודרני: הסגנון והיסודות'), ('modern-pro.html', 'מודרני למתקדמות'),
                               ('dancer.html#cmu49-18', 'תנועות מודרני עם הרקדנית'), ('watch.html#md', 'סרטונים למודרני')]),
    ('what.html', 'ללמוד', [('what.html', 'מהי כוריאוגרפיה'), ('create.html', 'איך יוצרים קטע'), ('path.html', 'מסלול <bdi dir="ltr">12+</bdi>'),
                            ('pro.html', 'למתקדמות'), ('watch.html', 'לצפות כמו כוריאוגרפית'), ('glossary.html', 'מילון המונחים'),
                            ('create.html#safety', 'חימום ובטיחות')]),
    ('dancer.html', 'הרקדנית', None),
    ('formation.html', 'עימוד', None),
    ('studio.html', 'כלים', [('studio.html', 'הסטודיו: כל הכלים'), ('formation.html', 'עימוד'), ('dancer.html', 'הרקדנית'),
                            ('counts.html', 'בונה השמיניות'), ('mirror.html', 'המראה'), ('stage.html', 'מדריך העימוד')]),
    ('about.html', 'אודות', [('about.html', 'על OFRIDANCE'), ('credits.html', 'קרדיטים')]),
]

HEAD = '''<!doctype html>
<html lang="he" dir="rtl"{theme}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="{tc}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:locale" content="he_IL">
<meta property="og:site_name" content="OFRIDANCE">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{site}assets/img/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="assets/img/touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&family=IBM+Plex+Sans+Hebrew:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/site.css">
{extra_head}<script>document.documentElement.classList.add('js')</script>
</head>
<body{body_class}>
<a class="skip" href="#main">דילוג לתוכן</a>
'''


def topbar(page):
    def cur(h):
        return ' aria-current="page"' if h == page else ''
    items = []
    for i, (href, label, sub) in enumerate(MENU):
        if not sub:
            items.append(f'<a class="tab" href="{href}"{cur(href)}>{label}</a>')
            continue
        here = page in [h for h, _ in sub if '#' not in h]
        links = ''.join(f'<a href="{h}"{cur(h) if "#" not in h else ""}>{t}</a>' for h, t in sub)
        items.append(f'<div class="tab-group{" here" if here else ""}">'
                     f'<button class="tab" type="button" aria-expanded="false" aria-controls="m{i}">{label}<span class="caret" aria-hidden="true"></span></button>'
                     f'<div class="submenu" id="m{i}">{links}</div></div>')
    nav = '\n    '.join(items)
    return (f'<header class="topbar">\n  <a class="mark" href="index.html" aria-label="OFRIDANCE, לדף הבית">{mark}</a>\n'
            f'  <nav aria-label="ניווט ראשי">\n    {nav}\n  </nav>\n'
            '  <a class="button" href="studio.html">הסטודיו</a>\n'
            '  <button class="menu-toggle" type="button" aria-expanded="false">תפריט</button>\n</header>\n')


FOOT = '''<footer class="site-footer">
  <div class="cols">
    <ul><li>ללמוד</li><li><a href="what.html">מהי כוריאוגרפיה</a></li><li><a href="create.html">איך יוצרים קטע</a></li><li><a href="path.html">מסלול <bdi dir="ltr">12+</bdi></a></li><li><a href="pro.html">למתקדמות</a></li><li><a href="watch.html">לצפות כמו כוריאוגרפית</a></li><li><a href="glossary.html">מילון המונחים</a></li><li><a href="create.html#safety">חימום ובטיחות</a></li><li><a href="path.html#parents">להורים</a></li></ul>
    <ul><li>הסגנונות</li><li><a href="hiphop.html">היפ הופ</a></li><li><a href="hiphop-pro.html">היפ הופ למתקדמות</a></li><li><a href="modern.html">מחול מודרני</a></li><li><a href="modern-pro.html">מודרני למתקדמות</a></li></ul>
    <ul><li>כלים</li><li><a href="studio.html">הסטודיו</a></li><li><a href="formation.html">עימוד</a></li><li><a href="dancer.html">הרקדנית</a></li><li><a href="counts.html">בונה השמיניות</a></li><li><a href="mirror.html">המראה</a></li><li><a href="stage.html">מדריך העימוד</a></li></ul>
    <ul><li>על האתר</li><li><a href="about.html">אודות</a></li><li><a href="credits.html">קרדיטים</a></li></ul>
  </div>
  <div></div>
  <div>
    <a class="big" href="index.html" aria-label="OFRIDANCE">{mark}</a>
    <p class="legal"><span>OFRIDANCE · כוריאוגרפיה בהיפ הופ ובמחול מודרני, מגיל 12</span><span>צילומים: Unsplash וארכיונים פתוחים, <a href="credits.html">רשימת קרדיטים</a></span></p>
  </div>
</footer>
'''.replace('{mark}', mark)


def build():
    for p in sorted((SRC / 'pages').glob('*.html')):
        raw = p.read_text(encoding='utf-8')
        meta = dict(re.findall(r'<!--(\w+):\s*(.*?)-->', raw.split('\n\n', 1)[0]))
        body = re.sub(r'^(<!--\w+:.*?-->\s*)+', '', raw).replace('{{MARK}}', mark)
        theme = meta.get('theme', 'light')
        url = SITE + ('' if p.name == 'index.html' else p.name)
        html = HEAD.format(url=url, site=SITE, body_class=(' class="' + meta['body'] + '"') if meta.get('body') else '', title=meta.get('title', 'OFRIDANCE'),
                           desc=meta.get('desc', ''), theme=' data-theme="dark"' if theme == 'dark' else '', tc='#000000' if theme == 'dark' else '#ffffff',
                           extra_head=meta.get('head', '').replace(chr(92) + 'n', chr(10)) + ('\n' if meta.get('head') else ''))
        if p.name == '404.html':
            # the missing-page answer can be served at any depth: anchor every link at the site root
            html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<base href="/ofridance/">', 1)
        if meta.get('bar', 'yes') != 'no':
            html += topbar(p.name)
        body = body.replace('<div class="body">', '<div class="body" data-stagger>').replace('<div class="words">', '<div class="words" data-stagger>')
        html += body.strip() + '\n' + (FOOT if meta.get('foot', 'yes') != 'no' else '')
        html += '<script src="assets/js/site.js" defer></script>\n' + meta.get('scripts', '').replace(chr(92) + 'n', chr(10)) + '\n</body>\n</html>\n'
        html = re.sub(r'(assets/(?:css|js)/[\w-]+\.(?:css|js))"', lambda m: m.group(1) + '?v=' + VER + '"', html)
        (ROOT / p.name).write_text(html, encoding='utf-8')
        print('built', p.name)
    # a map of the site for search engines
    pages = sorted(x.name for x in (SRC / 'pages').glob('*.html') if x.name != '404.html')
    today = time.strftime('%Y-%m-%d')
    urls = ''.join(f'  <url><loc>{SITE}{"" if n == "index.html" else n}</loc><lastmod>{today}</lastmod></url>\n' for n in pages)
    (ROOT / 'sitemap.xml').write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n', encoding='utf-8')
    (ROOT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {SITE}sitemap.xml\n', encoding='utf-8')


build()
