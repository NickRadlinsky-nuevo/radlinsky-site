// Замок на весь проєкт kurs-kabinet: спільний пароль у секреті KABINET_PASS,
// cookie на 30 днів, підпис cookie залежить від пароля (зміна пароля = усі виходять).
const BASE = "/kurs/kabinet";   // "" для субдомену, "/kurs/kabinet" для шляху на основному сайті
const COOKIE = "kab";
const DAYS = 30;

async function token(pass) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("kurs-kabinet-v1"));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function cookieOf(request) {
  const m = (request.headers.get("Cookie") || "").match(new RegExp("(?:^|;\\s*)" + COOKIE + "=([a-f0-9]+)"));
  return m ? m[1] : null;
}

const page = (error) => `<!doctype html><html lang="uk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Кабінет курсу — вхід</title>
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;500&family=Onest:wght@400;500&display=swap">
<style>
:root{--bg:#0B1212;--ink:#F2EFE6;--mut:rgba(242,239,230,.62);--gold:#C79A57;--line:rgba(242,239,230,.12)}
*{box-sizing:border-box}html,body{height:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 Onest,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px 16px}
.box{width:100%;max-width:420px}
.logo{display:block;width:150px;margin:0 auto 34px}
h1{font:500 22px/1.25 Unbounded,sans-serif;margin:0 0 10px;text-align:center}
p{margin:0 0 22px;color:var(--mut);text-align:center;font-size:15px}
label{display:block;font-size:13px;color:var(--mut);margin:0 0 8px}
input{width:100%;padding:14px 16px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.04);color:var(--ink);font:inherit;outline:none}
input:focus{border-color:var(--gold)}
button{width:100%;margin-top:14px;padding:15px 16px;border:0;border-radius:10px;background:var(--gold);color:#121212;font:500 15px Unbounded,sans-serif;cursor:pointer}
.err{color:#E89B8E;font-size:14px;margin:12px 0 0;text-align:center}
.foot{margin-top:28px;font-size:13px;color:var(--mut);text-align:center}.foot a{color:var(--gold);text-decoration:none}
</style></head><body><main class="box">
<a href="https://radlinsky.com.ua"><img class="logo" src="/img/logo-full-gold.png" alt="Аполлонія"></a>
<h1>Кабінет онлайн-курсу<br>«Художня реставрація зубів»</h1>
<p>Введіть пароль, який ви отримали після оплати.</p>
<form method="post" action="${BASE}/login" autocomplete="off">
<label for="p">Пароль</label>
<input id="p" name="pass" type="password" required autofocus autocapitalize="off" autocorrect="off" spellcheck="false">
<button type="submit">Увійти</button>
${error ? `<div class="err">${error}</div>` : ""}
</form>
<div class="foot">Немає пароля або він не підходить? Напишіть на <a href="mailto:nickolay@radlinsky.com.ua">nickolay@radlinsky.com.ua</a></div>
</main></body></html>`;

const htmlResp = (body, status = 200, extra = {}) => new Response(body, {
  status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", ...extra },
});

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const pass = env.KABINET_PASS;
  if (!pass) return htmlResp("<p>Кабінет ще не налаштовано (немає KABINET_PASS).</p>", 503);
  const good = await token(pass);

  // публічні файли для сторінки входу
  if (url.pathname === "/favicon.ico" || url.pathname === "/img/logo-full-gold.png" || url.pathname === "/robots.txt") return next();

  if (url.pathname === BASE + "/logout") {
    return new Response(null, { status: 303, headers: { Location: BASE + "/", "Set-Cookie": `${COOKIE}=; Path=${BASE}/; Max-Age=0; Secure; HttpOnly; SameSite=Lax` } });
  }

  if (url.pathname === BASE + "/login" && request.method === "POST") {
    const form = await request.formData();
    const given = String(form.get("pass") || "").trim();
    if (given === pass) {
      return new Response(null, { status: 303, headers: {
        Location: BASE + "/",
        "Set-Cookie": `${COOKIE}=${good}; Path=${BASE}/; Max-Age=${DAYS * 86400}; Secure; HttpOnly; SameSite=Lax`,
        "Cache-Control": "no-store",
      } });
    }
    await new Promise(r => setTimeout(r, 800));
    return htmlResp(page("Пароль не підходить. Перевірте й спробуйте ще раз."), 401);
  }

  if (cookieOf(request) === good) {
    const res = await next();
    const h = new Headers(res.headers);
    h.set("Cache-Control", "private, no-store");
    h.set("X-Robots-Tag", "noindex, nofollow");
    return new Response(res.body, { status: res.status, headers: h });
  }
  return htmlResp(page(""), 401);
}
