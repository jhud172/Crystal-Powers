"""Generate original Crystal Powers print cards and a real, undecorated QR code.

Uses bundled ReportLab, Pillow and pypdfium2. No website files are modified.
"""
import argparse
import base64
import html
import json
from pathlib import Path

from PIL import Image
import pypdfium2 as pdfium
from pypdf import PdfReader
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output/pdf"
MM = 72 / 25.4
DARK, WHITE, PAPER, MUTED = "#0B1018", "#F5F3EE", "#F3F1EB", "#535B65"


class Artwork:
    def __init__(self, pdf, bleed):
        self.pdf, self.bleed = pdf, bleed
        self.w, self.h = (91, 61) if bleed else (85, 55)
        self.offset = 3 if bleed else 0
        self.svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}mm" height="{self.h}mm" viewBox="0 0 {self.w} {self.h}">']

    def rect(self, x, y, w, h, colour):
        self.pdf.setFillColor(HexColor(colour))
        self.pdf.rect(x * MM, (self.h-y-h) * MM, w*MM, h*MM, fill=1, stroke=0)
        self.svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{colour}"/>')

    def text(self, x, y, value, size, colour=DARK, bold=False, tracking=0, centre=False):
        font = "StudioBold" if bold else "Studio"
        width = (pdfmetrics.stringWidth(value, font, size) + max(0, len(value)-1)*tracking) / MM
        if centre:
            x -= width / 2
        text = self.pdf.beginText(x*MM, (self.h-y)*MM)
        text.setFont(font, size)
        text.setCharSpace(tracking)
        text.setFillColor(HexColor(colour))
        text.textOut(value)
        self.pdf.drawText(text)
        self.svg.append(f'<text x="{x}" y="{y}" font-family="Segoe UI,Arial,sans-serif" font-size="{size/MM}" font-weight="{700 if bold else 400}" letter-spacing="{tracking/MM}" fill="{colour}">{html.escape(value)}</text>')

    def line(self, coords, colour, width=.2):
        self.pdf.setStrokeColor(HexColor(colour)); self.pdf.setLineWidth(width*MM)
        path = self.pdf.beginPath()
        path.moveTo(coords[0][0]*MM, (self.h-coords[0][1])*MM)
        for x,y in coords[1:]: path.lineTo(x*MM, (self.h-y)*MM)
        self.pdf.drawPath(path)
        self.svg.append(f'<polyline points="{" ".join(f"{x},{y}" for x,y in coords)}" stroke="{colour}" stroke-width="{width}" fill="none"/>')

    def image(self, file, x, y, w, h):
        self.pdf.drawImage(ImageReader(str(file)), x*MM, (self.h-y-h)*MM, w*MM, h*MM)
        data=base64.b64encode(file.read_bytes()).decode()
        self.svg.append(f'<image x="{x}" y="{y}" width="{w}" height="{h}" href="data:image/png;base64,{data}" preserveAspectRatio="none"/>')

    def shade(self, x, y, w, h, opacity):
        self.pdf.saveState()
        self.pdf.setFillColor(HexColor(DARK))
        self.pdf.setFillAlpha(opacity)
        self.pdf.rect(x*MM,(self.h-y-h)*MM,w*MM,h*MM,fill=1,stroke=0)
        self.pdf.restoreState()
        self.svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{DARK}" opacity="{opacity}"/>')

    def mark(self, x, y, size=5, colour=DARK):
        points=[(.5,0),(1,.25),(1,.75),(.5,1),(0,.75),(0,.25),(.5,0)]
        self.line([(x+a*size,y+b*size) for a,b in points],colour,.18)
        for points in [[(.5,0),(.72,.34),(.5,1),(.28,.34),(.5,0)],[(0,.25),(.28,.34),(.72,.34),(1,.25)],[(0,.75),(.5,.55),(1,.75)]]:
            self.line([(x+a*size,y+b*size) for a,b in points],colour,.12)

    def qr(self, x, y, size, matrix):
        count=len(matrix)+8
        unit=size/count
        self.rect(x,y,size,size,"#FFFFFF")
        for row, values in enumerate(matrix):
            for col, dark in enumerate(values):
                if dark: self.rect(x+(col+4)*unit,y+(row+4)*unit,unit,unit,"#000000")

    def finish(self, filename):
        self.svg.append('</svg>')
        if filename: (OUT/filename).write_text('\n'.join(self.svg),encoding='utf-8')


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--url',default='https://crystal-production.onrender.com/')
    parser.add_argument('--name',default='James')
    parser.add_argument('--email',default='')
    parser.add_argument('--phone',default='')
    args=parser.parse_args()
    if not args.url.startswith('https://'): raise ValueError('Use the public HTTPS homepage, never a localhost address.')
    OUT.mkdir(parents=True,exist_ok=True)
    pdfmetrics.registerFont(TTFont('Studio','C:/Windows/Fonts/segoeui.ttf'))
    pdfmetrics.registerFont(TTFont('StudioBold','C:/Windows/Fonts/segoeuib.ttf'))
    qr=QrCodeWidget(args.url,barLevel='Q')
    qr.qr.make()
    matrix=qr.qr.modules
    count=len(matrix)+8
    qr_image=Image.new('RGB',(count*24,count*24),'white')
    pixels=qr_image.load()
    for y,row in enumerate(matrix):
        for x,value in enumerate(row):
            if value:
                for dy in range(24):
                    for dx in range(24): pixels[(x+4)*24+dx,(y+4)*24+dy]=(0,0,0)
    qr_image.save(OUT/'crystal-powers-home-qr.png')
    svg=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {count} {count}" shape-rendering="crispEdges"><title>Crystal Powers homepage QR code</title><rect width="{count}" height="{count}" fill="white"/><g fill="black">']
    svg += [f'<rect x="{x+4}" y="{y+4}" width="1" height="1"/>' for y,row in enumerate(matrix) for x,v in enumerate(row) if v]
    (OUT/'crystal-powers-home-qr.svg').write_text(''.join(svg)+'</g></svg>',encoding='utf-8')

    for bleed,filename in [(True,'crystal-powers-business-card-print.pdf'),(False,'crystal-powers-business-card-proof.pdf')]:
        w,h=(91,61) if bleed else (85,55)
        pdf=canvas.Canvas(str(OUT/filename),pagesize=(w*MM,h*MM),pageCompression=1)
        pdf.setTitle('Crystal Powers | Business card | Front and back')
        pdf.setAuthor('Crystal Powers')
        if bleed:
            pdf.setTrimBox((3*MM,3*MM,88*MM,58*MM))
            pdf.setBleedBox((0,0,91*MM,61*MM))
        front=Artwork(pdf,bleed); o=front.offset
        front.rect(0,0,w,h,DARK)
        # Full-bleed placement of the original artwork; no raster text or QR.
        front.image(ROOT/'frontend/public/renders/crystal-dark.png',o-3,o-3,97.6,61)
        front.shade(0,0,w,o+46,.3)
        front.text(o+5,o+8,'INDEPENDENT DIGITAL STUDIO',5.4,WHITE,tracking=.85)
        front.text(o+4.5,o+20,'Crystal',26,WHITE)
        front.text(o+4.5,o+30,'Powers.',26,WHITE)
        front.rect(0,o+46,w,h-(o+46),DARK)
        front.text(o+5,o+51.5,'WEBSITES  /  APPS  /  BESPOKE SYSTEMS',6.1,WHITE,tracking=.25)
        front.mark(o+75.5,o+48.3,3.8,WHITE)
        front.finish(None if bleed else 'crystal-powers-business-card-front.svg')
        pdf.showPage()
        if bleed:
            pdf.setTrimBox((3*MM,3*MM,88*MM,58*MM)); pdf.setBleedBox((0,0,91*MM,61*MM))
        back=Artwork(pdf,bleed); o=back.offset
        back.rect(0,0,w,h,PAPER)
        back.mark(o+5,o+5,4.5)
        back.text(o+12,o+8.3,'CRYSTAL POWERS',6.8,DARK,True,tracking=.65)
        back.text(o+5,o+22,args.name,19,DARK)
        back.text(o+5,o+28,'FOUNDER & CEO',6.2,MUTED,tracking=.65)
        back.text(o+5,o+37,"Let's build your",8.7,DARK)
        back.text(o+5,o+41.5,'next idea.',8.7,DARK)
        back.line([(o+54,o+17),(o+54,o+46)],'#CBCBC5',.18)
        back.qr(o+59,o+17,23,matrix)
        back.text(o+70.5,o+44,'EXPLORE THE STUDIO',5.5,MUTED,tracking=.25,centre=True)
        contacts=[value for value in [args.email,args.phone] if value]
        domain=args.url.removeprefix('https://').rstrip('/')
        for i,value in enumerate(contacts): back.text(o+5,o+46+i*3.2,value,6.0,DARK)
        back.text(o+5,o+51.5,domain,5.8,MUTED)
        pdf.linkURL(args.url,((o+59)*MM,(h-o-40)*MM,(o+82)*MM,(h-o-17)*MM),relative=0)
        back.finish(None if bleed else 'crystal-powers-business-card-back.svg')
        pdf.showPage(); pdf.save()

    document=pdfium.PdfDocument(str(OUT/'crystal-powers-business-card-proof.pdf'))
    for i,side in enumerate(['front','back']):
        image=document[i].render(scale=600/72).to_pil()
        image.save(OUT/f'crystal-powers-business-card-{side}.png',dpi=(600,600))
    print_document=PdfReader(OUT/'crystal-powers-business-card-print.pdf')
    assert len(print_document.pages)==2
    for page in print_document.pages:
        assert abs(float(page.mediabox.width)/MM-91)<.01
        assert abs(float(page.trimbox.width)/MM-85)<.01
        assert abs(float(page.trimbox.height)/MM-55)<.01
    (OUT/'business-card-specification.json').write_text(json.dumps({'homepage':args.url,'name':args.name,'email':args.email,'phone':args.phone,'trimMm':[85,55],'bleedMm':3,'printPages':['front','back'],'qrErrorCorrection':'Q','qrMatrixModules':len(matrix),'qrQuietZoneModules':4,'qrSizeMm':23,'previewDpi':600,'colourSpace':'RGB; printer to convert using their stock/profile','fonts':'Embedded Segoe UI / Segoe UI Bold; SVG text remains editable'},indent=2)+'\n')
    print('BUSINESS_CARD_PDF_GEOMETRY_PASS; QR generated with Q correction and four-module quiet zone.')


if __name__=='__main__': main()
