# -*- coding: utf-8 -*-
"""Контактний аркуш із підписами імен файлів: python3 sheet.py <out.png> <img1> <img2> ..."""
import sys
from PIL import Image, ImageDraw
out = sys.argv[1]; files = sys.argv[2:]
CELL = 300; PAD = 6; LAB = 20; COLS = 5
rows = (len(files)+COLS-1)//COLS
W = COLS*(CELL+PAD)+PAD; H = rows*(CELL+PAD+LAB)+PAD
sheet = Image.new("RGB", (W,H), (30,30,30)); d = ImageDraw.Draw(sheet)
for i,f in enumerate(files):
    im = Image.open(f).convert("RGB"); im.thumbnail((CELL,CELL), Image.LANCZOS)
    c,r = i%COLS, i//COLS
    x = PAD + c*(CELL+PAD) + (CELL-im.width)//2
    y = PAD + r*(CELL+PAD+LAB) + (CELL-im.height)//2
    sheet.paste(im,(x,y))
    d.text((PAD + c*(CELL+PAD)+2, PAD + r*(CELL+PAD+LAB)+CELL+3), f.split("im-")[-1].replace(".jpg",""), fill=(255,220,80))
sheet.save(out)
print(out, sheet.size, len(files))
