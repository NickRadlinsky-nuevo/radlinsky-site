# -*- coding: utf-8 -*-
"""Відновлює scratchpad/n2023-1/build.py з уже згенерованої статті.

Каталог n2023-1 було очищено, генератор втрачено. Кожна побудована сторінка
містить повний шаблон, тож беремо зразок, ЩО БУВ ЗГЕНЕРОВАНИЙ ОРИГІНАЛЬНИМ
build.py (/tmp/chep_before.html), і шаблонізуємо його цілком — щоб новий
генератор давав байт-у-байт таку саму розмітку.
"""
import io, os

SITE = "/Users/mykolaradlinskyy/projects/radlinsky-site"
SAMPLE = "/tmp/chep_before.html"
OUT_DIR = "/private/tmp/claude-501/-Users-mykolaradlinskyy/36d9793e-2e9c-4a64-852c-a6b19ed9af71/scratchpad/n2023-1"

h = io.open(SAMPLE, encoding="utf-8").read()

# --- відомі значення, з якими будувався зразок ---
TITLE = "Рецесія ясен. Комплексний міждисциплінарний підхід"
SLUG = "statti-chepurkova-retsesiia-iasen"
OGIMG = "chep19-011.jpg"          # у шаблоні перед ним стоїть images/
KICKER = "Практичні курси · журнал «ДентАрт» 2019 №1"
ENTITLE = "GUM RECESSION. COMPLEX INTERDISCIPLINARY APPROACH"

i_desc = h.index('<meta name="description" content="') + len('<meta name="description" content="')
DESC = h[i_desc:h.index('">', i_desc)]
i_og = h.index('<meta property="og:description" content="') + len('<meta property="og:description" content="')
OGDESC = h[i_og:h.index('">', i_og)]

i_ld = h.index('<script type="application/ld+json">')
SCHEMA = h[h.index("\n", i_ld) + 1: h.index("\n  </script>", i_ld)]

# тіло: від рядка після author-блоку до </article>
i_body = h.index("      </div>\n", h.index('<div class="art-head">')) + len("      </div>\n")
BODY = h[i_body: h.index("    </article>", i_body)].rstrip("\n")

# author_html: між рядком en-title і закриттям art-head
i_en = h.index('<p class="en-title">')
i_en_end = h.index("\n", i_en) + 1
AUTHOR = h[i_en_end: i_body - len("      </div>\n")].rstrip("\n")

tpl = h
subs = [
    (SCHEMA, "{schema}"),
    (BODY, "{body}"),
    (AUTHOR, "{author_html}"),
    (OGDESC, "{ogdesc}"),
    (DESC, "{desc}"),
    (ENTITLE, "{en_title}"),
    (KICKER, "{kicker}"),
    (TITLE, "{title}"),
    (SLUG, "{slug}"),
    (OGIMG, "{ogimg}"),
]
for old, new in subs:
    assert old in tpl, "не знайдено: " + old[:60]
    tpl = tpl.replace(old, new)

# захищаємо решту фігурних дужок (CSS/JS) від .format
plc = ["{schema}", "{body}", "{author_html}", "{ogdesc}", "{desc}",
       "{en_title}", "{kicker}", "{title}", "{slug}", "{ogimg}"]
MARK = "\x00%d\x00"
for k, p in enumerate(plc):
    tpl = tpl.replace(p, MARK % k)
tpl = tpl.replace("{", "{{").replace("}", "}}")
for k, p in enumerate(plc):
    tpl = tpl.replace(MARK % k, p)

# зразок будувався з помилковим ogimg="images/…", тож у шаблон потрапило
# подвоєне "images/images/". Лишаємо один префікс — як в оригінальному build.py.
tpl = tpl.replace("radlinsky.com.ua/images/images/{ogimg}",
                  "radlinsky.com.ua/images/{ogimg}")
assert "images/images/{ogimg}" not in tpl

src = '''# -*- coding: utf-8 -*-
"""Генератор сторінок статей ДентАрт для radlinsky.com.ua.

ВІДНОВЛЕНО (2026-07-31) з готової сторінки після того, як каталог
scratchpad/n2023-1 було очищено разом із оригінальним build.py.
Шаблон узято зі статті, побудованої оригінальним генератором, тож
розмітка збігається з раніше опублікованими статтями байт-у-байт.

API:
  build(slug, title, en_title, kicker, author_html, body, ogimg, desc, ogdesc,
        schema_type="Article", schema_authors=None, alt_headline="")
      ⚠️ ogimg — ЛИШЕ ім'я файлу, БЕЗ префікса "images/" (шаблон додає його сам).
      body мусить сам містити <div class="art-body">…</div>
      і, за потреби, <div class="refs">…</div>.
      Номер випуску подається у kicker: «Рубрика · журнал «ДентАрт» 2019 №1».
  gal(ids, prefix, alt, cls="")        — галерея без підписів
  galc(items, prefix, wide_ratio=1.9)  — галерея з <figcaption>, items = [(n, caption)]
  thumb(src, n, center=(0.5,0.42))     — картка-мініатюра images/statti-th-<n>.jpg
"""
import os, re
from PIL import Image

SITE = %r
IMG = SITE + "/images"

TEMPLATE = %r


def gal(ids, prefix, alt, cls=""):
    out = [f'<div class="gal{(" " + cls) if cls else ""}">']
    for i in ids:
        fn = f"{prefix}-{i:03d}.jpg"
        w, h = Image.open(f"{IMG}/{fn}").size
        wide = " wide" if w / h > 1.9 else ""
        out.append(f'  <figure><img class="aimg{wide}" src="images/{fn}" width="{w}" height="{h}" loading="lazy" alt="{alt}"></figure>')
    out.append("</div>")
    return "\\n".join(out)


def galc(items, prefix, wide_ratio=1.9):
    out = ['<div class="galc">']
    for n, cap in items:
        fn = f"{prefix}-{n:03d}.jpg"
        w, h = Image.open(f"{IMG}/{fn}").size
        wide = " wide" if w / h > wide_ratio else ""
        alt = re.sub(r'^(Фото|Рис\\.?|Мал\\.?)\\s*[0-9]+[\\.\\)]?\\s*', "", cap).strip() or cap
        alt = alt.replace('"', "'")
        out.append(f'  <figure><img class="aimg{wide}" src="images/{fn}" width="{w}" height="{h}" loading="lazy" alt="{alt}"><figcaption>{cap}</figcaption></figure>')
    out.append("</div>")
    return "\\n".join(out)


def build(slug, title, en_title, kicker, author_html, body, ogimg, desc, ogdesc,
          schema_type="Article", schema_authors=None, alt_headline=""):
    if ogimg.startswith("images/"):
        ogimg = ogimg[len("images/"):]
    if schema_authors is None:
        schema_authors = []
    if len(schema_authors) == 1:
        auth_json = '"author":{"@type":"Person","name":"%%s"},' %% schema_authors[0]
    elif len(schema_authors) > 1:
        auth_json = '"author":[' + ",".join('{"@type":"Person","name":"%%s"}' %% a for a in schema_authors) + '],'
    else:
        auth_json = ""
    altj = ('"alternativeHeadline":"%%s",' %% alt_headline) if alt_headline else ""
    schema = ('{"@context":"https://schema.org","@type":"%%s","headline":"%%s",%%s%%s'
              '"publisher":{"@type":"Organization","name":"Навчальний центр «Аполлонія»","logo":{"@type":"ImageObject","url":"https://radlinsky.com.ua/images/logo-full.png"}},'
              '"isPartOf":{"@type":"Periodical","name":"ДентАрт","issn":"1993-2170"},"inLanguage":"uk","url":"https://radlinsky.com.ua/%%s"}'
              ) %% (schema_type, title, altj, auth_json, slug)

    html = TEMPLATE.format(slug=slug, title=title, en_title=en_title, kicker=kicker,
                           author_html=author_html, body=body, ogimg=ogimg,
                           desc=desc, ogdesc=ogdesc, schema=schema)
    open(f"{SITE}/{slug}.html", "w", encoding="utf-8").write(html)
    from html.parser import HTMLParser
    HTMLParser().feed(html)
    imgs = re.findall(r'src="(images/[^"]+)"', html)
    miss = [i for i in imgs if not os.path.exists(f"{SITE}/{i}")]
    moj = sum(1 for m in re.finditer(r'alt="([^"]*)"', html)
              if any(ord(c) > 0x7f for c in m.group(1)) and not any(ord(c) >= 0x400 for c in m.group(1)))
    print(f"  built {slug}: imgs={len(imgs)} miss={len(miss)} moj={moj}")
    if miss:
        print("   MISSING:", miss)
    return html


def thumb(src, n, center=(0.5, 0.42)):
    from PIL import ImageOps
    im = Image.open(f"{IMG}/{src}").convert("RGB")
    ImageOps.fit(im, (520, 347), Image.LANCZOS, centering=center).save(
        f"{IMG}/statti-th-{n}.jpg", format="JPEG", quality=83, progressive=True, optimize=True)
    print(f"  thumb statti-th-{n}.jpg from {src}")
''' % (SITE, tpl)

os.makedirs(OUT_DIR, exist_ok=True)
io.open(os.path.join(OUT_DIR, "build.py"), "w", encoding="utf-8").write(src)
print("build.py відновлено; шаблон", len(tpl), "символів")
