"""Subset the preview fonts to Latin + prompt symbols and write WOFF2.

usage: python -I subset_fonts.py <src_dir> <out_dir>
"""
import shutil
import sys
from pathlib import Path

from fontTools import subset

src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)

UNICODES = (
    "U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,"
    "U+2010-2027,U+2030-203A,U+20AC,U+2190-21FF,U+2387,U+25A0-25FF,U+2500-257F,U+2713-2717,U+276F,"
    "U+E0A0-E0D7"  # powerline glyphs
)

for name in ["meslo-regular.ttf", "meslo-bold.ttf", "hack-regular.ttf", "hack-bold.ttf",
             "hasklug-regular.otf", "hasklug-bold.otf"]:
    target = out / (Path(name).stem + ".woff2")
    subset.main([
        str(src / name),
        f"--unicodes={UNICODES}",
        "--flavor=woff2",
        "--layout-features=*",
        "--no-hinting",
        "--desubroutinize",
        f"--output-file={target}",
    ])
    print(f"{target.name}: {target.stat().st_size // 1024} KB")

for name in ["0xproto-regular.woff2", "0xproto-bold.woff2"]:
    shutil.copyfile(src / name, out / name)
    print(f"{name}: {(out / name).stat().st_size // 1024} KB (copied)")
for lic in src.glob("LICENSE-*"):
    shutil.copyfile(lic, out / lic.name)
