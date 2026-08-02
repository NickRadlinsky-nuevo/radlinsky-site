# -*- coding: utf-8 -*-
"""Показує речення джерела, яких немає в опублікованому тілі статті.
   usage: python3 missing.py <src.txt> <article.html>"""
import re, io, sys

def norm(s):
    s = s.replace('’', "'").replace('‘', "'").replace('“','"').replace('”','"')
    s = s.replace('—', '-').replace('–', '-').replace('­','')
    return re.sub(r'[^0-9a-zа-яіїєґ]+', ' ', s.lower()).strip()

src = io.open(sys.argv[1], encoding='utf-8').read()
html = io.open(sys.argv[2], encoding='utf-8').read()
m = re.search(r'<div class="art-body">(.*?)</article>', html, re.S)
pub = norm(re.sub(r'<[^>]+>', ' ', m.group(1)))

# джерело: склеїти переноси рядків усередині абзаців
src = re.sub(r'(\w)-\n(\w)', r'\1\2', src)
src = src.replace('\n', ' ')
sents = re.split(r'(?<=[.!?:;])\s+', src)
missing = []
for s in sents:
    n = norm(s)
    ws = n.split()
    if len(ws) < 6:
        continue
    # шукаємо кілька 5-грам речення в опублікованому тексті
    grams = [' '.join(ws[i:i+5]) for i in range(0, max(1, len(ws)-4), 3)]
    hit = sum(1 for g in grams if g in pub)
    if hit == 0:
        missing.append(' '.join(ws))
    elif hit < len(grams) * 0.5:
        missing.append('~ ' + ' '.join(ws))
print(f"--- {sys.argv[2]}: {len(missing)} з {len(sents)} речень не знайдено (~ = частково)")
for x in missing:
    print(" *", x[:300])
