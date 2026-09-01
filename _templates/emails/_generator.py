# -*- coding: utf-8 -*-
"""Генератор HTML-листів для SendPulse. Таблична верстка, інлайн-стилі, 600px."""
import os, html as H
OUT='/Users/mykolaradlinskyy/projects/radlinsky-site/_templates/emails'
SITE='https://radlinsky.com.ua'
PDF=SITE+'/files/dentart-dobirka-restavratsiia-za-rozrakhunkom.pdf'
FROM='nickolay@radlinsky.com.ua'
PETROL='#133B38'; PETROL_D='#0D2A28'; BRASS='#B0894F'; BRASS_L='#C79A57'
ENAMEL='#F7F4EC'; PAPER='#FFFFFF'; INK='#1B1916'; SOFT='#56514A'; FAINT='#8C867C'
SERIF="Georgia,'Times New Roman',serif"
SANS="Arial,Helvetica,sans-serif"

def utm(path, n):
    sep='&' if '?' in path else '?'
    return f"{SITE}{path}{sep}utm_source=email&utm_medium=seriia-dobirka&utm_campaign=lyst-{n}"

def para(t):
    return (f'<p style="margin:0 0 18px;font-family:{SANS};font-size:16px;line-height:1.62;'
            f'color:{INK};">{t}</p>')

def small(t):
    return (f'<p style="margin:0 0 18px;font-family:{SANS};font-size:14px;line-height:1.6;'
            f'color:{SOFT};">{t}</p>')

def button(label, href):
    return f'''<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 26px;">
        <tr><td align="center" bgcolor="{BRASS}" style="border-radius:3px;">
          <a href="{href}" style="display:inline-block;padding:15px 32px;font-family:{SANS};font-size:15px;font-weight:bold;letter-spacing:.4px;color:#FFFFFF;text-decoration:none;border-radius:3px;">{label}</a>
        </td></tr></table>'''

def rule():
    return (f'<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" '
            f'style="margin:6px 0 24px;"><tr><td height="1" bgcolor="#E4DFD3" '
            f'style="line-height:1px;font-size:0;">&nbsp;</td></tr></table>')

def quote(t):
    return (f'<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px;">'
            f'<tr><td width="3" bgcolor="{BRASS}" style="line-height:1px;font-size:0;">&nbsp;</td>'
            f'<td style="padding:2px 0 2px 18px;font-family:{SERIF};font-size:17px;line-height:1.55;'
            f'color:{SOFT};font-style:italic;">{t}</td></tr></table>')

SHELL = '''<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>{subject}</title>
<style type="text/css">
  body,table,td,a{{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}}
  table,td{{mso-table-lspace:0pt;mso-table-rspace:0pt;}}
  img{{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none;display:block;}}
  a{{color:{PETROL};}}
  @media screen and (max-width:620px){{
    .container{{width:100% !important;}}
    .pad{{padding-left:22px !important;padding-right:22px !important;}}
    .h1{{font-size:26px !important;line-height:1.22 !important;}}
  }}
</style>
</head>
<body style="margin:0;padding:0;background-color:{ENAMEL};">
<div style="display:none;font-size:1px;color:{ENAMEL};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">{preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:{ENAMEL};">
<tr><td align="center" style="padding:28px 12px 40px;">

  <table role="presentation" class="container" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:{PAPER};border:1px solid #E4DFD3;">

    <!-- шапка -->
    <tr><td align="left" bgcolor="{PETROL}" class="pad" style="padding:22px 36px;background-color:{PETROL};">
      <img src="{SITE}/images/logo-full.png" width="168" height="38" alt="Навчальний центр «Аполлонія»" style="display:block;width:168px;height:auto;" />
    </td></tr>

    <!-- тіло -->
    <tr><td class="pad" style="padding:34px 36px 10px;">
      <p style="margin:0 0 12px;font-family:{SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:{BRASS};font-weight:bold;">{eyebrow}</p>
      <h1 class="h1" style="margin:0 0 22px;font-family:{SERIF};font-size:30px;line-height:1.2;font-weight:normal;color:{INK};">{h1}</h1>
      {body}
    </td></tr>

    <!-- підпис -->
    <tr><td class="pad" style="padding:6px 36px 34px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td height="1" bgcolor="#E4DFD3" style="line-height:1px;font-size:0;">&nbsp;</td></tr></table>
      <p style="margin:18px 0 0;font-family:{SANS};font-size:14px;line-height:1.6;color:{SOFT};">
        З повагою,<br />
        <span style="color:{INK};">Навчальний центр «Аполлонія» С. Радлінського</span><br />
        <a href="mailto:{FROM}" style="color:{PETROL};text-decoration:none;">{FROM}</a>
      </p>
    </td></tr>

    <!-- підвал -->
    <tr><td class="pad" bgcolor="{PETROL_D}" style="padding:24px 36px;background-color:{PETROL_D};">
      <p style="margin:0 0 8px;font-family:{SANS};font-size:12.5px;line-height:1.6;color:rgba(247,244,236,.66);">
        Ви отримали цей лист, бо залишили пошту на сторінці добірки статей «ДентАрт» на radlinsky.com.ua.
      </p>
      <p style="margin:0;font-family:{SANS};font-size:12.5px;line-height:1.6;color:rgba(247,244,236,.66);">
        <a href="{SITE}" style="color:{BRASS_L};text-decoration:none;">radlinsky.com.ua</a>
        &nbsp;·&nbsp;
        <a href="{{{{unsubscribe_url}}}}" style="color:rgba(247,244,236,.66);text-decoration:underline;">Відписатися</a>
      </p>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>
'''

MAILS = []

# ── 1 ─────────────────────────────────────────────────────────────────
MAILS.append(dict(
 n=1, file='1-dobirka.html',
 subject='Ваша добірка «Реставрація за розрахунком»',
 preheader='Сім клінічних протоколів Сергія Радлінського — за посиланням усередині',
 eyebrow='Безкоштовна добірка',
 h1='Реставрація за розрахунком',
 body=(
  para('Доброго дня, {{name}}!')
  + para('Ось ваша добірка — сім клінічних протоколів Сергія Радлінського з архіву журналу «ДентАрт».')
  + button('Завантажити PDF', PDF)
  + small('Усередині: просторові орієнтири в системній реставрації, реставрація за розрахунком, золотий коефіцієнт для нижніх різців, контактні поверхні верхніх і нижніх передніх зубів, відновлення зуба з поздовжнім розколом.')
  + small('Кожен розділ — резюме статті та ключові фото. Повний текст із усіма ілюстраціями відкритий на сайті, посилання є в кінці кожного розділу.')
  + rule()
  + small('Наступні кілька тижнів надсилатиму вам ще матеріали з архіву — по одному, без потоку.')
 )))

# ── 2 ─────────────────────────────────────────────────────────────────
MAILS.append(dict(
 n=2, file='2-prostorovi-oriientyry.html',
 subject='З чого починається системна реставрація',
 preheader='Про просторові орієнтири — коротко',
 eyebrow='З архіву «ДентАрт»',
 h1='З чого починається системна реставрація',
 body=(
  para('Доброго дня, {{name}}!')
  + para('Якщо з добірки читати щось одне — читайте розділ про просторові орієнтири.')
  + para('Ідея там проста і незручна одночасно: у прямій реставрації провідними орієнтирами є розміри й форма коронки зуба, зовнішня поверхня збереженої емалі, шийка зуба і топографія зубних тканин. Не «як здається красиво», а те, що вже є в зубі.')
  + para('У непрямій — орієнтири інші: позиція головок у суглобах і рухи нижньої щелепи з моделюванням у артикуляторі.')
  + quote('Різниця здається академічною, поки не доводиться переробляти роботу.')
  + button('Читати повністю', utm('/statti-radlinsky-prostorovi-oriientyry', 2))
 )))

# ── 3 ─────────────────────────────────────────────────────────────────
MAILS.append(dict(
 n=3, file='3-rozkolotyi-zub.html',
 subject='Розколотий зуб: видаляти чи рятувати',
 preheader='Клінічний випадок із контролем 8 років',
 eyebrow='З архіву «ДентАрт»',
 h1='Розколотий зуб: видаляти чи рятувати',
 body=(
  para('Доброго дня, {{name}}!')
  + para('Девітальний моляр, відновлений у системній реставрації, розколовся вздовж через 5 років. Класична розвилка: видалення чи спроба зберегти.')
  + para('У статті Сергія Радлінського — другий шлях: репозиція, іммобілізація, склеювання з армуванням скловолокном на рівні дна і даху порожнини зуба. Результат підтверджено 8-річним динамічним спостереженням.')
  + quote('Якщо є шанс — намагатися зберегти розколотий зуб потрібно завжди.')
  + button('Читати статтю', utm('/statti-radlinsky-vidnovlennia-rozkolotykh-zubiv', 3))
 )))

# ── 4 ─────────────────────────────────────────────────────────────────
MAILS.append(dict(
 n=4, file='4-arkhiv.html',
 subject='590 статей «ДентАрту» — і як у них шукати',
 preheader='Весь архів журналу відкритий безкоштовно',
 eyebrow='Архів журналу',
 h1='590 статей — і як у них шукати',
 body=(
  para('Доброго дня, {{name}}!')
  + para('Мало хто знає: увесь архів журналу «ДентАрт» з 2013 року викладено на сайті у відкритому доступі. Це майже 600 матеріалів — клінічні протоколи, дослідження, інтерв’ю з фаховими лідерами.')
  + para('Кілька точок входу:')
  + f'''<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
      <tr><td style="padding:11px 0;border-bottom:1px solid #E4DFD3;font-family:{SANS};font-size:15.5px;color:{INK};">
        <a href="{utm('/statti-radlinsky',4)}" style="color:{PETROL};text-decoration:none;">Статті Сергія Радлінського</a></td></tr>
      <tr><td style="padding:11px 0;border-bottom:1px solid #E4DFD3;font-family:{SANS};font-size:15.5px;color:{INK};">
        <a href="{utm('/statti-ponomarenko',4)}" style="color:{PETROL};text-decoration:none;">Статті Ольги Пономаренко</a></td></tr>
      <tr><td style="padding:11px 0;font-family:{SANS};font-size:15.5px;color:{INK};">
        <a href="{utm('/statti',4)}" style="color:{PETROL};text-decoration:none;">Увесь архів</a></td></tr>
    </table>'''
  + small('Наприкінці кожної статті ми додали три схожі матеріали — так зручно рухатися темою, а не номерами журналу.')
 )))

# ── 5 ─────────────────────────────────────────────────────────────────
MAILS.append(dict(
 n=5, file='5-kurs.html',
 subject='Онлайн майстер-курс художньої реставрації',
 preheader='26 лекцій, 60 годин, 30 балів БПР',
 eyebrow='Навчання',
 h1='Онлайн майстер-курс художньої реставрації',
 body=(
  para('Доброго дня, {{name}}!')
  + para('Статті дають підхід. Але техніку зручніше переймати, коли бачиш руки й послідовність кроків.')
  + f'''<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 24px;background-color:{ENAMEL};">
      <tr><td style="padding:20px 22px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="padding:5px 0;font-family:{SANS};font-size:15.5px;color:{INK};">26 лекцій і майстер-класів, близько 60 годин</td></tr>
          <tr><td style="padding:5px 0;font-family:{SANS};font-size:15.5px;color:{INK};">Доступ 24/7 — дивитеся у своєму темпі</td></tr>
          <tr><td style="padding:5px 0;font-family:{SANS};font-size:15.5px;color:{INK};">30 балів БПР після тестування</td></tr>
          <tr><td style="padding:5px 0;font-family:{SANS};font-size:15.5px;color:{INK};"><strong>Вартість 5999 ₴</strong></td></tr>
        </table>
      </td></tr></table>'''
  + para('Це той самий матеріал, що й на очних курсах у Полтаві, тільки без дороги і без прив’язки до дати.')
  + button('Дивитися програму курсу', utm('/kurs-online', 5))
 )))

# ── 6 ─────────────────────────────────────────────────────────────────
def qa(q, a):
    return (f'<p style="margin:0 0 5px;font-family:{SANS};font-size:15.5px;font-weight:bold;color:{INK};">{q}</p>'
            f'<p style="margin:0 0 20px;font-family:{SANS};font-size:15.5px;line-height:1.6;color:{SOFT};">{a}</p>')

MAILS.append(dict(
 n=6, file='6-faq.html',
 subject='Питання, які ставлять найчастіше',
 preheader='Про доступ, бали БПР і сертифікат',
 eyebrow='Питання і відповіді',
 h1='Питання, які ставлять найчастіше',
 body=(
  para('Доброго дня, {{name}}!')
  + para('Зібрав відповіді на те, про що питають перед записом на онлайн-курс.')
  + rule()
  + qa('Коли відкриється доступ?', 'Менеджер надішле доступи протягом робочого дня після оплати.')
  + qa('Скільки часу є на перегляд?', 'Доступ 24/7, дивитеся у своєму темпі.')
  + qa('Як нараховуються бали БПР?', ' 30 балів після проходження тестування. Сертифікат надходить приблизно за місяць після нього.')
  + qa('Чи підійде курс, якщо я працюю переважно з бічними зубами?', 'Так — логіка розрахунку й системного відновлення однакова, змінюється геометрія.')
  + rule()
  + small('Якщо лишилось питання, якого тут немає — просто відповідайте на цей лист.')
  + button('Програма курсу', utm('/kurs-online', 6))
 )))

os.makedirs(OUT, exist_ok=True)
index=[]
for m in MAILS:
    doc = SHELL.format(subject=H.escape(m['subject']), preheader=H.escape(m['preheader']),
                       eyebrow=m['eyebrow'], h1=m['h1'], body=m['body'],
                       SITE=SITE, FROM=FROM, PETROL=PETROL, PETROL_D=PETROL_D, BRASS=BRASS,
                       BRASS_L=BRASS_L, ENAMEL=ENAMEL, PAPER=PAPER, INK=INK, SOFT=SOFT,
                       FAINT=FAINT, SERIF=SERIF, SANS=SANS)
    open(os.path.join(OUT, m['file']), 'w', encoding='utf-8').write(doc)
    index.append((m['n'], m['file'], m['subject'], m['preheader'], len(doc)))
for n, f, s, p, ln in index:
    print(f"{n}. {f:32} {ln//1024}КБ  «{s}»")
