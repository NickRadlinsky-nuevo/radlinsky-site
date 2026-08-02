# -*- coding: utf-8 -*-
"""ШАБЛОН. Скопіювати в scratchpad/n<year>-<issue>/proc.py і відредагувати docstring
під конкретний номер: чи потрібен flip (перевірити на 2-3 портретах ПЕРЕД масовою
обробкою — див. dentart-issue-pipeline.md, крок 2).

Переносить вибрані raw-зображення у images/ сайту з послідовною нумерацією.

usage: python3 proc.py <article_dir> <prefix> <raw1> <raw2> ...
       raw = частина назви після "im-", напр. 011-007
       Якщо для цього номера потрібен flip — розкоментувати FLIP нижче.
"""
from PIL import Image, ImageOps
import os, sys

BASE = os.path.dirname(os.path.abspath(__file__))
IMG = "/Users/mykolaradlinskyy/projects/radlinsky-site/images"
CAP = 1050
FLIP = False  # ⚠️ встановити True, якщо перевірка на портретах показала перевернуті фото

folder, prefix = sys.argv[1], sys.argv[2]
raws = sys.argv[3:]

for n, r in enumerate(raws, 1):
    src = os.path.join(BASE, folder, "raw", f"im-{r}.jpg")
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    if FLIP:
        im = ImageOps.flip(im)
    w, h = im.size
    if max(w, h) > CAP:
        s = CAP / max(w, h)
        im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
    out = os.path.join(IMG, f"{prefix}-{n:03d}.jpg")
    im.save(out, format="JPEG", quality=84, progressive=True, optimize=True)
    print(f"{prefix}-{n:03d}  <-  {r}  {im.size}")
