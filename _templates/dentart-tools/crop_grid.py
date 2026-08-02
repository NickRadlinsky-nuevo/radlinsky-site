# -*- coding: utf-8 -*-
"""Ріже рівномірну фото-стрічку/сітку зі сторінки на окремі jpg у images/.

usage: python3 crop_grid.py <page.png> <x0,y0,x1,y1 у частках> <rows> <cols> <out_prefix> <start_n> [--cap 1050]
Зберігає images/<out_prefix>-<NNN>.jpg послідовно рядок за рядком.
"""
import sys
from PIL import Image

IMG = "/Users/mykolaradlinskyy/projects/radlinsky-site/images"

page = Image.open(sys.argv[1])
x0f, y0f, x1f, y1f = [float(v) for v in sys.argv[2].split(",")]
rows, cols = int(sys.argv[3]), int(sys.argv[4])
prefix = sys.argv[5]
start = int(sys.argv[6])
cap = 1050
if "--cap" in sys.argv:
    cap = int(sys.argv[sys.argv.index("--cap") + 1])

W, H = page.size
x0, y0, x1, y1 = int(x0f * W), int(y0f * H), int(x1f * W), int(y1f * H)
cw, ch = (x1 - x0) / cols, (y1 - y0) / rows

n = start
for r in range(rows):
    for c in range(cols):
        box = (int(x0 + c * cw), int(y0 + r * ch), int(x0 + (c + 1) * cw), int(y0 + (r + 1) * ch))
        cell = page.crop(box).convert("RGB")
        w, h = cell.size
        s = cap / max(w, h)
        if s < 1:
            cell = cell.resize((round(w * s), round(h * s)), Image.LANCZOS)
        out = f"{IMG}/{prefix}-{n:03d}.jpg"
        cell.save(out, "JPEG", quality=86, progressive=True, optimize=True)
        print(out, cell.size)
        n += 1
