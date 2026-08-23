#!/usr/bin/env python3
"""Typesets plain-reference.md as a printable PDF manual."""

import re, subprocess, sys, html as htmlmod
from datetime import date

SRC = "plain-reference.md"
MID = "reference.html"
OUT = "/mnt/user-data/outputs/plain-reference.pdf"

KEYWORDS = ["set","change","to","show","if","else","end","for","each","in","repeat","times",
            "while","make","give","is","not","and","or","true","false","nothing",
            "more","less","than","at","most","least","stop"]
BUILTINS = ["count","add","remove","first","last","reverse","has","sum","sort_up","sort_down",
            "join","split","upper","lower","trim","round","random","text","number","keys","numbers","reverse","sort_up","sort_down","read","write","get","ask"]

version = "0.2.0"
try:
    core = open("plain-core.js").read()
    m = re.search(r'const PLAIN_VERSION\s*=\s*"([^"]+)"', core)
    if m: version = m.group(1)
except FileNotFoundError:
    pass


def highlight(code):
    """Colours Plain source: comments, text, keywords, built-ins, numbers."""
    out, i = [], 0
    tokens = []
    for mo in re.finditer(r'(#[^\n]*)|("(?:[^"\\\n]|\\.)*")|(\b[A-Za-z_][A-Za-z0-9_]*\b)|(\b\d+(?:\.\d+)?\b)', code):
        tokens.append(mo)
    for mo in tokens:
        out.append(htmlmod.escape(code[i:mo.start()]))
        txt = mo.group(0)
        if mo.group(1):
            cls = "com"
        elif mo.group(2):
            cls = "str"
        elif mo.group(3):
            cls = "kw" if txt in KEYWORDS else ("bi" if txt in BUILTINS else None)
        else:
            cls = "num"
        out.append(f'<span class="{cls}">{htmlmod.escape(txt)}</span>' if cls else htmlmod.escape(txt))
        i = mo.end()
    out.append(htmlmod.escape(code[i:]))
    return "".join(out)


def finish(src, dest, version, sections):
    """Stamps page numbers and adds bookmarks the renderer could not."""
    import io
    from pypdf import PdfReader, PdfWriter
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.colors import HexColor

    reader = PdfReader(src)
    total = len(reader.pages)
    writer = PdfWriter()

    # locate headings before the pages are altered by the footer overlay
    def squash(t): return re.sub(r"\s+", "", t).lower()
    pages_text = [squash(pg.extract_text() or "") for pg in reader.pages]

    for i, page in enumerate(reader.pages):
        if i > 0:                                   # no number on the title page
            buf = io.BytesIO()
            c = canvas.Canvas(buf, pagesize=A4)
            c.setFont("Courier", 7)
            c.setFillColor(HexColor("#8E7FC9"))
            c.drawString(51, 30, f"Plain  v{version}")
            c.drawRightString(A4[0] - 51, 30, f"{i + 1} / {total}")
            c.setStrokeColor(HexColor("#d8d2e8"))
            c.setLineWidth(0.4)
            c.line(51, 40, A4[0] - 51, 40)
            c.save()
            buf.seek(0)
            page.merge_page(PdfReader(buf).pages[0])
        writer.add_page(page)

    # bookmarks: find the page each section heading lands on
    added = 0
    writer.add_outline_item("Cover", 0)
    if total > 1: writer.add_outline_item("Contents", 1)
    for heading in sections:
        title = strip_tags(heading).strip()
        needle = squash(title)[:36]
        for n in range(2, total):
            if needle and needle in pages_text[n]:
                writer.add_outline_item(title, n)
                added += 1
                break

    writer.add_metadata({
        "/Title": f"Plain — Language Reference v{version}",
        "/Subject": "Complete reference for the Plain programming language",
        "/Creator": "Plain",
    })
    with open(dest, "wb") as f:
        writer.write(f)
    print(f"  {added} of {len(sections)} sections bookmarked")


# markdown -> html fragment
frag = subprocess.run(
    ["pandoc", SRC, "-f", "gfm", "-t", "html", "--no-highlight"],
    capture_output=True, text=True, check=True).stdout

# colour the Plain code blocks
def colour_block(mo):
    return '<pre class="plain"><code>' + highlight(htmlmod.unescape(mo.group(1))) + "</code></pre>"

frag = re.sub(r'<pre class="plain"><code>(.*?)</code></pre>', colour_block, frag, flags=re.S)
frag = re.sub(r'<pre><code class="language-plain">(.*?)</code></pre>', colour_block, frag, flags=re.S)
frag = re.sub(r'<pre><code>(.*?)</code></pre>',
              lambda m: '<pre class="out"><code>' + m.group(1) + "</code></pre>", frag, flags=re.S)

# contents from the section headings
sections = re.findall(r'<h2[^>]*>(.*?)</h2>', frag, flags=re.S)
def strip_tags(s): return re.sub(r"<[^>]+>", "", s)
contents = "\n".join(
    f'<li><span class="c-num">{strip_tags(s).split(".")[0].strip()}</span>'
    f'<span class="c-name">{strip_tags(s).split(".", 1)[1].strip()}</span></li>'
    for s in sections if "." in strip_tags(s))

CSS = """
@page { size: A4; margin: 20mm 18mm 18mm 18mm; }

body { font-family: "Bitstream Charter", "Charter", Georgia, serif;
       font-size: 10.5pt; line-height: 1.5; color: #241E33; margin: 0; }

/* ---- title page ---- */
.title-page { height: 250mm; position: relative; page-break-after: always; }
.tp-eyebrow { font-family: "DejaVu Sans Mono", monospace; font-size: 8pt;
              letter-spacing: .18em; text-transform: uppercase; color: #8E7FC9; margin: 0 0 6mm; }
.tp-name { font-family: "DejaVu Sans", sans-serif; font-weight: bold; font-size: 72pt;
           letter-spacing: -.03em; color: #4A3796; margin: 0; line-height: .9; }
.tp-rule { border: 0; border-top: 2pt solid #4A3796; margin: 6mm 0; }
.tp-stand { font-size: 13pt; line-height: 1.45; max-width: 105mm; margin: 0 0 4mm; }
.tp-stand em { color: #4A3796; }
.tp-meta { position: absolute; bottom: 0; font-family: "DejaVu Sans Mono", monospace;
           font-size: 8.5pt; color: #6b6480; line-height: 1.7; }
.tp-meta b { color: #4A3796; font-weight: normal; }

/* ---- contents ---- */
.contents { page-break-after: always; }
.contents h2 { font-family: "DejaVu Sans", sans-serif; font-size: 15pt; color: #4A3796;
               border-bottom: 1pt solid #cfc7e4; padding-bottom: 2mm; margin: 0 0 5mm; }
.contents ol { list-style: none; padding: 0; margin: 0; }
.contents li { padding: 1.6mm 0; border-bottom: .5pt dotted #d8d2e8; }
.c-num { font-family: "DejaVu Sans Mono", monospace; font-size: 9pt; color: #8E7FC9;
         display: inline-block; width: 10mm; }
.c-name { font-size: 11pt; }

/* ---- headings ---- */
h1 { display: none; }
h2 { font-family: "DejaVu Sans", sans-serif; font-size: 15pt; font-weight: bold;
     color: #4A3796; letter-spacing: -.01em; margin: 9mm 0 3mm;
     padding-bottom: 2mm; border-bottom: 1pt solid #cfc7e4;
     page-break-after: avoid; page-break-inside: avoid; }
h3 { font-family: "DejaVu Sans Mono", monospace; font-size: 8.5pt; font-weight: bold;
     letter-spacing: .14em; text-transform: uppercase; color: #8E7FC9;
     margin: 6mm 0 2mm; page-break-after: avoid; }

p { margin: 0 0 3mm; }
strong { color: #241E33; }
em { font-style: italic; }
a { color: #4A3796; text-decoration: none; }
hr { border: 0; border-top: .5pt solid #d8d2e8; margin: 7mm 0; }

/* ---- inline and block code ---- */
code { font-family: "DejaVu Sans Mono", monospace; font-size: 8.6pt;
       color: #4A3796; background: #F0EDF7; padding: .3mm 1mm; border-radius: 1pt; }
pre { page-break-inside: avoid; margin: 3mm 0 4mm; }
pre code { background: none; padding: 0; color: #241E33; font-size: 8.6pt; line-height: 1.45; }
pre.plain { background: #F6F4FA; border-left: 2.5pt solid #4A3796; padding: 3mm 4mm; }
pre.out { background: #fff; border: .5pt solid #d8d2e8; padding: 3mm 4mm; color: #4a4459; }
pre.out code { color: #4a4459; }

.kw  { color: #4A3796; font-weight: bold; }
.bi  { color: #1D6F58; }
.str { color: #9A5B1E; }
.num { color: #8E1F32; }
.com { color: #8b85a0; font-style: italic; }

/* ---- error demonstrations ---- */
blockquote { margin: 3mm 0 4mm; padding: 2.5mm 4mm; background: #FFF7F8;
             border-left: 2.5pt solid #B3283F; page-break-inside: avoid; }
blockquote p { margin: 0; font-size: 10pt; color: #5c2430; }
blockquote code { background: #f7e9ec; color: #8E1F32; }

/* ---- tables ---- */
table { border-collapse: collapse; width: 100%; margin: 3mm 0 5mm;
        font-size: 9.5pt; page-break-inside: avoid; }
th { text-align: left; font-family: "DejaVu Sans Mono", monospace; font-size: 7.6pt;
     letter-spacing: .12em; text-transform: uppercase; color: #4A3796; font-weight: normal;
     border-bottom: 1pt solid #4A3796; padding: 1.8mm 3mm 1.8mm 0; }
td { padding: 1.8mm 3mm 1.8mm 0; border-bottom: .5pt solid #e4dff0; vertical-align: top; }
td:first-child { white-space: nowrap; }

ul, ol { margin: 0 0 3mm; padding-left: 6mm; }
li { margin: 0 0 1.2mm; }
"""

page = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>{CSS}</style></head><body>

<div class="title-page">
  <p class="tp-eyebrow">Language reference · version {version}</p>
  <h1 class="tp-name" style="display:block">Plain</h1>
  <hr class="tp-rule">
  <p class="tp-stand">Twenty-nine words, one way to write each thing, and a mistake tells you
  <em>what to do about it</em> instead of what went wrong inside the machine.</p>
  <p class="tp-stand" style="font-size:10.5pt;color:#4a4459">This document is complete. Every word
  the language has, and every action built into it, is described here — there is no second half kept
  somewhere else.</p>
  <div class="tp-meta">
    <b>29</b> words &nbsp;·&nbsp; <b>24</b> built-in actions &nbsp;·&nbsp; browser or terminal<br>
    Generated {date.today().strftime('%-d %B %Y')}
  </div>
</div>

<div class="contents">
  <h2>Contents</h2>
  <ol>{contents}</ol>
</div>

{frag}
</body></html>"""

open(MID, "w").write(page)

subprocess.run([
    "wkhtmltopdf",
    "--enable-local-file-access",
    "--outline", "--outline-depth", "2",
    "--print-media-type",
    "--margin-top", "20mm", "--margin-bottom", "18mm",
    "--margin-left", "18mm", "--margin-right", "18mm",
    "--quiet",
    MID, "raw.pdf"
], check=True)

# This wkhtmltopdf build ignores footers and outlines, so add them afterwards.
finish("raw.pdf", OUT, version, sections)

print(f"Wrote {OUT}")
