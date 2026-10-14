import sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
W=int(sys.argv[1]) if len(sys.argv)>1 else 600
f=instantiateVariableFont(TTFont('HankenGrotesk.ttf'),{'wght':W})
gs=f.getGlyphSet(); cmap=f.getBestCmap(); hm=f['hmtx']
CAP=697; TRACK=-14
word="OFRIDANCE"
x=0; paths=[]
def glyph(ch,x):
    g=cmap[ord(ch)]; pen=SVGPathPen(gs)
    tp=TransformPen(pen,(1,0,0,-1,x,CAP))  # flip y, cap top at y=0
    gs[g].draw(tp); return pen.getCommands(), hm[g][0]
# stem width of I for figure stroke
stem = 112 if W>=600 else 96
fig=None
for ch in word:
    if ch=='I':
        w=580  # figure box
        fx=x+10
        # figure in SVG coords: y=0 cap top, y=CAP baseline. A leaping dancer: head, arched torso, kicked leg, raised arm
        s=stem
        fig=f'''<g transform="translate({fx},0)" fill="none" stroke="currentColor" stroke-width="{s:.0f}" stroke-linecap="round" stroke-linejoin="round">
<circle cx="356" cy="-92" r="{s*0.62:.0f}" fill="currentColor" stroke="none"/>
<path d="M372 {s/2+20:.0f} C 366 240, 356 420, 346 {CAP-s/2:.0f}"/>
<path d="M362 310 C 280 300, 150 240, {s/2+4:.0f} 130"/>
<path d="M382 112 C 446 84, 500 10, {580-s/2:.0f} -140"/>
</g>'''
        x+=w+TRACK
        continue
    d,adv=glyph(ch,x); paths.append(d); x+=adv+TRACK
total=x-TRACK
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -230 {total+20:.0f} {CAP+250}" role="img" aria-label="OFRIDANCE"><title>OFRIDANCE</title>
<path fill="currentColor" d="{' '.join(paths)}"/>
{fig}
</svg>'''
open(f'../ofridance-wordmark.svg','w').write(svg); print(total)
mark=fig.replace(f'translate({fx},0)','translate(0,0)')
open('../ofridance-mark.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -230 640 960" role="img" aria-label="OFRIDANCE"><title>OFRIDANCE</title>{mark}</svg>')
open('../favicon.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-200 -330 960 1120"><rect x="-200" y="-330" width="960" height="1120" fill="#d92b21"/><g color="#ffffff">{mark}</g></svg>')
