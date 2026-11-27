"""Render each Oh My Posh theme to a self-contained SVG for the Prompt gallery.

For every <id>.omp.json in <themes_dir>:
  1. `oh-my-posh config export image` with the website's sample data (--data-only: nothing is read
     from this PC), into a temp SVG. Only everyday segments keep their data (KEEP), so the image
     looks like a normal folder/repo instead of every language and cloud lit at once.
  2. Drop the fake window chrome (title bar, buttons, shadow) and crop the viewBox to the prompt.
  3. Embed a WOFF2 subset of Hack Nerd Font with exactly the glyphs the SVG uses, so icons render
     even where no Nerd Font is installed (an <img> SVG cannot see the page's fonts).

usage: python -I make_prompt_images.py <omp.exe> <themes_dir> <hack_regular.ttf> <hack_bold.ttf> <out_dir>
"""
import base64
import html
import io
import json
import re
import subprocess
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

omp, themes_dir, hack_regular, hack_bold, out_dir = sys.argv[1:6]
themes_dir, out_dir = Path(themes_dir), Path(out_dir)
tmp_dir = themes_dir / "out"
tmp_dir.mkdir(exist_ok=True)
out_dir.mkdir(parents=True, exist_ok=True)

FONT = "PSHack"
BG = "#16171e"
PAD = 10  # px around the prompt
LINE_ASCENT, LINE_DESCENT = 15, 4  # text box around the baseline at 16px
# Wide enough that no prompt wraps; right-aligned blocks just end up far to the right.
TERMINAL_WIDTH = 320
CHROME = re.compile(r'^<[^>]*class="omp-window(-shadow|-header|-divider|-control)?"[^>]*>(?:[^<]*</text>)?\s*$', re.M)
WINDOW = re.compile(r'<path class="omp-window-content"[^>]*/>')
WATERMARK = re.compile(r'^<text\b[^>]*>ohmyposh\.dev</text>\s*$', re.M)  # footer added by `export image`
RECT = re.compile(r'<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"')
TEXT_POS = re.compile(r'<text\b[^>]*\bx="([\d.]+)" y="([\d.]+)" textLength="([\d.]+)"[^>]*>(.*?)</text>', re.S)
TEXT = re.compile(r"<text\b([^>]*)>(.*?)</text>", re.S)

# With --data-only, a segment missing from the data is not drawn.
KEEP = {"path", "git", "session", "os", "status", "executiontime", "time", "shell", "root", "text", "exit"}
data = json.loads((themes_dir / "segment_data.json").read_text(encoding="utf-8"))
data["segments"] = {k: v for k, v in data["segments"].items() if k in KEEP}
data_file = tmp_dir / "segment_data.json"


def git_branch_icon(theme: Path) -> str:
    """The theme's own git branch_icon (oh-my-posh default:  + space)."""
    for block in json.loads(theme.read_text(encoding="utf-8")).get("blocks", []):
        for seg in block.get("segments", []):
            if seg.get("type") == "git":
                return (seg.get("options") or seg.get("properties") or {}).get("branch_icon", " ")
    return ""


def woff2_subset(ttf_path: str, text: str) -> str:
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.hinting = False
    font = TTFont(ttf_path)
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    buf = io.BytesIO()
    font.flavor = "woff2"
    font.save(buf)
    return base64.b64encode(buf.getvalue()).decode("ascii")


for theme in sorted(themes_dir.glob("*.omp.json")):
    tid = theme.name.removesuffix(".omp.json")
    raw_svg = tmp_dir / f"{tid}.svg"
    # The sample HEAD has a hard-coded branch icon; real HEAD = the theme's branch_icon + branch,
    # otherwise themes with their own icon show two glyphs crushed together.
    if "git" in data["segments"]:
        data["segments"]["git"]["data"]["HEAD"] = git_branch_icon(theme) + "main"
    data_file.write_text(json.dumps(data), encoding="utf-8")
    proc = subprocess.run(
        [omp, "config", "export", "image", f"--config={theme}", f"--output={raw_svg}",
         f"--data={data_file}", "--data-only", f"--font-family={FONT}",
         f"--background-color={BG}", f"--terminal-width={TERMINAL_WIDTH}"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    if proc.returncode != 0 or not raw_svg.exists():
        print(f"FAIL {tid}: {proc.stderr.strip()[:300]}")
        continue

    svg = raw_svg.read_text(encoding="utf-8")
    svg = CHROME.sub("", svg)
    svg = WATERMARK.sub("", svg)

    # Crop tightly around the prompt (same padding on every side), on a flat background, so every
    # card can be drawn at the same scale.
    xs, ys, xe, ye = [], [], [], []
    for x, y, rw, rh in RECT.findall(svg):
        xs.append(float(x)); ys.append(float(y)); xe.append(float(x) + float(rw)); ye.append(float(y) + float(rh))
    for x, y, tl, content in TEXT_POS.findall(svg):
        if not html.unescape(content).strip():
            continue
        xs.append(float(x)); ys.append(float(y) - LINE_ASCENT); xe.append(float(x) + float(tl)); ye.append(float(y) + LINE_DESCENT)
    x0, y0 = min(xs) - PAD, min(ys) - PAD
    w, h = max(xe) + PAD - x0, max(ye) + PAD - y0
    svg = WINDOW.sub(f'<rect x="{x0:.2f}" y="{y0:.2f}" width="{w:.2f}" height="{h:.2f}" fill="{BG}"/>', svg, count=1)
    svg = re.sub(
        r'width="[\d.]+" height="[\d.]+" viewBox="[^"]*"',
        f'width="{w:.2f}" height="{h:.2f}" viewBox="{x0:.2f} {y0:.2f} {w:.2f} {h:.2f}"',
        svg,
        count=1,
    )

    # Glyphs actually used, split by weight.
    regular_chars, bold_chars = set(), set()
    for attrs, content in TEXT.findall(svg):
        chars = set(html.unescape(content))
        (bold_chars if 'font-weight="bold"' in attrs or "font-weight:bold" in attrs else regular_chars).update(chars)
    faces = []
    if regular_chars:
        faces.append(f"@font-face{{font-family:'{FONT}';font-weight:400;src:url(data:font/woff2;base64,{woff2_subset(hack_regular, ''.join(regular_chars))}) format('woff2')}}")
    if bold_chars:
        faces.append(f"@font-face{{font-family:'{FONT}';font-weight:700;src:url(data:font/woff2;base64,{woff2_subset(hack_bold, ''.join(bold_chars))}) format('woff2')}}")
    style = f"<defs><style>{''.join(faces)}</style></defs>"
    svg = re.sub(r"(<svg\b[^>]*>)", lambda mm: mm.group(1) + "\n" + style, svg, count=1)

    target = out_dir / f"{tid}.svg"
    target.write_text(svg, encoding="utf-8")
    print(f"{tid}: {target.stat().st_size // 1024} KB, {len(regular_chars | bold_chars)} glyphs")
