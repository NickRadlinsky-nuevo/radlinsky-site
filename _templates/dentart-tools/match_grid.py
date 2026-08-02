# -*- coding: utf-8 -*-
"""Визначає, який raw-файл стоїть у кожній комірці сітки на сторінці журналу.

Порівнює 12x12 сигнатури (сірий + RGB) вирізаної комірки і кожного raw-зображення.
Призначення жадібне: найкращі пари першими, кожен raw використовується один раз.

usage: python3 match_grid.py <page.png> <x0,y0,x1,y1 у частках> <rows> <cols> <raw1> ...
       порядок виводу — по рядках зліва направо.
"""
import sys
from PIL import Image

N = 12


def sig(im):
    g = im.convert("RGB").resize((N, N), Image.LANCZOS)
    px = list(g.getdata())
    # нормалізуємо яскравість, щоб не заважала різна експозиція друку
    lum = [(r + g_ + b) / 3.0 for r, g_, b in px]
    m = sum(lum) / len(lum)
    s = (sum((v - m) ** 2 for v in lum) / len(lum)) ** 0.5 or 1.0
    return [(v - m) / s for v in lum] + [(c - 128) / 64.0 for p in px for c in p]


def dist(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b))


page = Image.open(sys.argv[1])
x0f, y0f, x1f, y1f = [float(v) for v in sys.argv[2].split(",")]
rows, cols = int(sys.argv[3]), int(sys.argv[4])
raws = sys.argv[5:]
W, H = page.size
x0, y0, x1, y1 = int(x0f * W), int(y0f * H), int(x1f * W), int(y1f * H)
cw, ch = (x1 - x0) / cols, (y1 - y0) / rows

cells = []
for r in range(rows):
    for c in range(cols):
        pad_x, pad_y = cw * 0.10, ch * 0.10
        box = (int(x0 + c * cw + pad_x), int(y0 + r * ch + pad_y),
               int(x0 + (c + 1) * cw - pad_x), int(y0 + (r + 1) * ch - pad_y))
        cells.append(((r, c), sig(page.crop(box))))

rsig = [(f, sig(Image.open(f))) for f in raws]

cost = [[dist(cs, rs) for _, rs in rsig] for _, cs in cells]

# оптимальне призначення (Угорський алгоритм, O(n^3)) — жадібне дає помилки
# на майже однакових знімках «до/після» одного зуба.
def hungarian(a):
    n, m = len(a), len(a[0])
    INF = float("inf")
    u = [0.0] * (n + 1); v = [0.0] * (m + 1)
    p = [0] * (m + 1); way = [0] * (m + 1)
    for i in range(1, n + 1):
        p[0] = i; j0 = 0
        minv = [INF] * (m + 1); used = [False] * (m + 1)
        while True:
            used[j0] = True
            i0 = p[j0]; delta = INF; j1 = 0
            for j in range(1, m + 1):
                if not used[j]:
                    cur = a[i0 - 1][j - 1] - u[i0] - v[j]
                    if cur < minv[j]:
                        minv[j] = cur; way[j] = j0
                    if minv[j] < delta:
                        delta = minv[j]; j1 = j
            for j in range(m + 1):
                if used[j]:
                    u[p[j]] += delta; v[j] -= delta
                else:
                    minv[j] -= delta
            j0 = j1
            if p[j0] == 0:
                break
        while j0:
            j1 = way[j0]; p[j0] = p[j1]; j0 = j1
    return {p[j] - 1: j - 1 for j in range(1, m + 1) if p[j]}


assign = hungarian(cost)
out = {cells[i][0]: (rsig[j][0], cost[i][j]) for i, j in assign.items()}

for r in range(rows):
    line = []
    for c in range(cols):
        f, d = out[(r, c)]
        line.append("%s(%.0f)" % (f.split("im-")[-1].replace(".jpg", ""), d))
    print("  ".join(line))
print("ORDER:", " ".join(out[(r, c)][0].split("im-")[-1].replace(".jpg", "")
                         for r in range(rows) for c in range(cols)))
