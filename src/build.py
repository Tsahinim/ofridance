# Assembles every page in src/pages into the site root with the shared head, top bar and footer.
import re, pathlib, time
VER = str(int(time.time()))
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'
mark = (ROOT / 'brand' / 'ofridance-wordmark.svg').read_text(encoding='utf-8')
mark = re.sub(r'<title>.*?</title>', '', mark).replace('<svg ', '<svg aria-hidden="true" focusable="false" ', 1)
NAV = [('what.html', 'what', 'מהי כוריאוגרפיה'), ('hiphop.html', 'hiphop', 'היפ הופ'), ('modern.html', 'modern', 'מודרני'),
       ('create.html', 'create', 'איך יוצרים'), ('formation.html', 'formation', 'עימוד'), ('dancer.html', 'dancer', 'הרקדנית'), ('watch.html', 'watch', 'לצפות'), ('path.html', 'path', 'מסלול <bdi dir="ltr">12+</bdi>'), ('pro.html', 'pro', 'למתקדמות'), ('glossary.html', 'glossary', 'מילון')]
HEAD = '''<!doctype html>
<html lang="he" dir="rtl"{theme}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="{tc}">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&family=IBM+Plex+Sans+Hebrew:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/site.css">
{extra_head}<script>document.documentElement.classList.add('js')</script>
</head>
<body{body_class}>
<a class="skip" href="#main">דילוג לתוכן</a>
'''
def topbar(active):
    links = '\n    '.join(f'<a href="{h}"{" aria-current=\"page\"" if k == active else ""}>{t}</a>' for h, k, t in NAV)
    return f'''<header class="topbar">
  <a class="mark" href="index.html" aria-label="OFRIDANCE, לדף הבית">{mark}</a>
  <nav aria-label="ניווט ראשי">
    {links}
  </nav>
  <a class="button" href="studio.html">הסטודיו</a>
  <button class="menu-toggle" type="button" aria-expanded="false">תפריט</button>
</header>
'''
FOOT = '''<footer class="site-footer">
  <div class="cols">
    <ul><li>ללמוד</li><li><a href="what.html">מהי כוריאוגרפיה</a></li><li><a href="hiphop.html">היפ הופ</a></li><li><a href="modern.html">מחול מודרני</a></li><li><a href="create.html">איך יוצרים קטע</a></li></ul>
    <ul><li>הסטודיו</li><li><a href="stage.html">הבמה הווירטואלית</a></li><li><a href="counts.html">בונה השמיניות</a></li><li><a href="dancer.html">הרקדנית בתלת-ממד</a></li><li><a href="mirror.html">המראה</a></li></ul>
    <ul><li>להתקדם</li><li><a href="path.html">מסלול <bdi dir="ltr">12+</bdi></a></li><li><a href="hiphop-pro.html">היפ הופ למתקדמות</a></li><li><a href="modern-pro.html">מודרני למתקדמות</a></li><li><a href="watch.html">צפייה מודרכת</a></li><li><a href="glossary.html">מילון המונחים</a></li><li><a href="create.html#safety">חימום ובטיחות</a></li><li><a href="path.html#parents">להורים</a></li></ul>
    <ul><li>על האתר</li><li><a href="credits.html">קרדיטים לתמונות</a></li><li><a href="mirror.html#privacy">פרטיות המצלמה</a></li><li><a href="index.html">לדף הבית</a></li></ul>
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
        html = HEAD.format(body_class=(' class="' + meta['body'] + '"') if meta.get('body') else '', title=meta.get('title', 'OFRIDANCE'), desc=meta.get('desc', ''), theme=' data-theme="dark"' if theme == 'dark' else '',
                           tc='#000000' if theme == 'dark' else '#ffffff', extra_head=meta.get('head', '').replace(chr(92) + 'n', chr(10)) +('\n' if meta.get('head') else ''))
        if meta.get('bar', 'yes') != 'no': html += topbar(meta.get('active', ''))
        body = body.replace('<div class="body">', '<div class="body" data-stagger>').replace('<div class="words">', '<div class="words" data-stagger>')
        html += body.strip() + '\n' + FOOT
        html += '<script src="assets/js/site.js" defer></script>\n' + meta.get('scripts', '').replace(chr(92) + 'n', chr(10)) +'\n</body>\n</html>\n'
        html = re.sub(r'(assets/(?:css|js)/[\w-]+\.(?:css|js))"', lambda m: m.group(1) + '?v=' + VER + '"', html)
        (ROOT / p.name).write_text(html, encoding='utf-8')
        print('built', p.name)
build()
