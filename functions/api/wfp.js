// Вебхук WayForPay (serviceUrl) → Meta Conversions API.
// WayForPay після кожної оплати шле сюди сповіщення. Ми перевіряємо підпис,
// для успішних оплат передаємо в Meta подію Purchase і відповідаємо «accept».
//
// Секрети проєкту Cloudflare Pages:
//   WFP_SECRET_KEY        — SecretKey мерчанта WayForPay (перевірка підпису)
//   META_CAPI_TOKEN       — токен Conversions API з Events Manager
//   META_TEST_EVENT_CODE  — необов'язково: код із вкладки «Тестові події»
// Поки секретів немає, відповідаємо 503 — WayForPay повторює сповіщення до 4 діб,
// тому оплати не губляться.
const PIXEL_ID = "1357557515478741";
const GRAPH = "https://graph.facebook.com/v25.0";
const SITE = "https://radlinsky.com.ua";
const enc = new TextEncoder();

/* ---------- MD5 / HMAC-MD5 (WebCrypto не вміє HMAC з MD5) ---------- */
const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
           4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0);

export function md5(bytes) {
  const len = bytes.length;
  const padLen = (((len + 8) >>> 6) << 6) + 64;
  const buf = new Uint8Array(padLen);
  buf.set(bytes); buf[len] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(padLen - 8, (len * 8) >>> 0, true);
  dv.setUint32(padLen - 4, Math.floor(len / 0x20000000), true);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const M = new Uint32Array(16);
  for (let off = 0; off < padLen; off += 64) {
    for (let j = 0; j < 16; j++) M[j] = dv.getUint32(off + j * 4, true);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16)      { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D;          g = (3 * i + 5) % 16; }
      else             { F = C ^ (B | ~D);       g = (7 * i) % 16; }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  const out = new Uint8Array(16);
  const odv = new DataView(out.buffer);
  odv.setUint32(0, a0, true); odv.setUint32(4, b0, true); odv.setUint32(8, c0, true); odv.setUint32(12, d0, true);
  return out;
}

export function hmacMd5Hex(key, msg) {
  let k = enc.encode(key);
  if (k.length > 64) k = md5(k);
  const ipad = new Uint8Array(64).fill(0x36), opad = new Uint8Array(64).fill(0x5c);
  for (let i = 0; i < k.length; i++) { ipad[i] ^= k[i]; opad[i] ^= k[i]; }
  const m = enc.encode(msg);
  const inner = new Uint8Array(64 + m.length); inner.set(ipad); inner.set(m, 64);
  const outer = new Uint8Array(80); outer.set(opad); outer.set(md5(inner), 64);
  return [...md5(outer)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(s) {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
}

/* ---------- розбір тіла ---------- */
// WayForPay шле JSON, інколи з Content-Type форми (тоді весь JSON — це ключ форми).
function parseBody(raw) {
  try { return { data: JSON.parse(raw), json: raw }; } catch (_) {}
  try {
    const first = [...new URLSearchParams(raw).keys()][0];
    return { data: JSON.parse(first), json: first };
  } catch (_) {}
  return { data: null, json: "" };
}

// Значення поля так, як воно записане в JSON (3890.00 не має стати 3890 — від цього залежить підпис).
function rawToken(json, key) {
  const m = json.match(new RegExp('"' + key + '"\\s*:\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|([^,}\\s]+))'));
  if (!m) return null;
  return m[1] !== undefined ? m[1] : m[2];
}

const SIGN_FIELDS = ["merchantAccount", "orderReference", "amount", "currency",
                     "authCode", "cardPan", "transactionStatus", "reasonCode"];

export function signatureOk(data, json, secret) {
  const got = String(data.merchantSignature || "").toLowerCase();
  if (!got) return false;
  const asParsed = SIGN_FIELDS.map(f => data[f] == null ? "" : String(data[f])).join(";");
  const asRaw = SIGN_FIELDS.map(f => { const t = rawToken(json, f); return t == null || t === "null" ? "" : t; }).join(";");
  return hmacMd5Hex(secret, asParsed) === got || hmacMd5Hex(secret, asRaw) === got;
}

function accept(orderReference, secret) {
  const time = Math.floor(Date.now() / 1000);
  const signature = hmacMd5Hex(secret, `${orderReference};accept;${time}`);
  return Response.json({ orderReference, status: "accept", time, signature });
}

/* ---------- Meta Conversions API ---------- */
async function buildEvent(d) {
  const user_data = {};
  const email = String(d.email || "").trim().toLowerCase();
  if (email.includes("@")) user_data.em = [await sha256Hex(email)];
  const phone = String(d.phone || "").replace(/\D/g, "");
  if (phone.length >= 9) user_data.ph = [await sha256Hex(phone)];
  const country = String(d.issuerBankCountry || "").trim().toLowerCase();
  // Номер замовлення як зовнішній ідентифікатор не годиться; країну шлемо лише якщо це ISO-2.
  if (/^[a-z]{2}$/.test(country)) user_data.country = [await sha256Hex(country)];

  const product = Array.isArray(d.products) && d.products[0] && d.products[0].name
    ? String(d.products[0].name) : "Онлайн-продукт НЦ «Аполлонія»";
  const t = Number(d.processingDate || d.createdDate) || Math.floor(Date.now() / 1000);
  return {
    event_name: "Purchase",
    event_time: t,
    event_id: String(d.orderReference),          // той самий id шле піксель на /thank-you → Meta зливає дублікати
    action_source: "website",
    event_source_url: SITE + "/thank-you",
    user_data,
    custom_data: {
      currency: String(d.currency || "UAH"),
      value: Number(d.amount) || 0,
      content_name: product,
      order_id: String(d.orderReference),
    },
  };
}

async function sendToMeta(event, env, forceTestCode) {
  const post = async (ev) => {
    const body = { data: [ev] };
    const code = forceTestCode || env.META_TEST_EVENT_CODE;
    if (code) body.test_event_code = code;
    const r = await fetch(`${GRAPH}/${PIXEL_ID}/events?access_token=${encodeURIComponent(env.META_CAPI_TOKEN)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    return { ok: r.ok, status: r.status, text: await r.text() };
  };
  let res = await post(event);
  // Сповіщення йде з сервера WayForPay, браузера покупця тут немає. Якщо Meta вимагає
  // client_user_agent для подій «website», шлемо ту саму подію як серверну.
  if (!res.ok && /client_user_agent|user.?agent/i.test(res.text)) {
    res = await post({ ...event, action_source: "system_generated" });
    res.fallback = true;
  }
  return res;
}

/* ---------- лист покупцю (SendPulse) ---------- */
// Вимкнено, доки секрет BUYER_EMAIL_ON не дорівнює "1".
// Адреса відправника — секрет SENDER_EMAIL (у коді її немає). Має бути активним відправником у SendPulse.
const FROM_NAME = "Навчальний центр «Аполлонія»";
const CABINET_URL = SITE + "/kurs/kabinet/";
const COURSE_AMOUNTS = new Set([3890, 4990, 8000]);
const ASK = ["прізвище", "ім'я", "по батькові", "номер телефону", "емейл", "дату народження", "освіту", "місце роботи"];

// Лист із кабінетом — лише за курс «Художня реставрація зубів».
export function isCourse(d) {
  const name = Array.isArray(d.products) && d.products[0] ? String(d.products[0].name || "").toLowerCase() : "";
  return name.includes("реставрац") || COURSE_AMOUNTS.has(Number(d.amount));
}

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function buyerEmail(pass) {
  const subject = "Ваш доступ до онлайн-курсу «Художня реставрація зубів»";
  const text = [
    "Вітаємо!", "",
    "Оплату отримано, дякуємо. Доступ до онлайн-курсу Сергія Радлінського «Художня реставрація зубів» для вас відкрито.", "",
    "Кабінет курсу: " + CABINET_URL,
    "Пароль: " + pass, "",
    "У кабінеті 26 лекцій і майстер-класів, 60 годин відео. Дивитися можна з будь-якого пристрою і в будь-якому порядку. Доступ діє до 31 грудня 2027 року.", "",
    "Збережіть цей лист, щоб пароль був під рукою. Кабінет запам'ятовує вхід на 30 днів, потім попросить пароль знову.", "",
    "Будь ласка, надішліть у відповідь на цей лист свої дані для отримання сертифіката на 30 балів БПР:",
    ...ASK.map(x => "• " + x), "",
    "Якщо щось не відкривається, просто дайте відповідь на цей лист або зателефонуйте: +38 (066) 191-83-00.", "",
    "З повагою,", "Навчальний центр «Аполлонія»",
  ].join("\n");
  const P = 'style="margin:0 0 16px;font:16px/1.55 Arial,Helvetica,sans-serif;color:#1f1611"';
  const html = `<!doctype html><html lang="uk"><body style="margin:0;padding:24px;background:#faf5e8">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
<p ${P}>Вітаємо!</p>
<p ${P}>Оплату отримано, дякуємо. Доступ до онлайн-курсу Сергія Радлінського <b>«Художня реставрація зубів»</b> для вас відкрито.</p>
<p ${P}>Кабінет курсу: <a href="${CABINET_URL}">${CABINET_URL}</a><br>Пароль: <b>${esc(pass)}</b></p>
<p ${P}>У кабінеті 26 лекцій і майстер-класів, 60 годин відео. Дивитися можна з будь-якого пристрою і в будь-якому порядку. Доступ діє до 31 грудня 2027 року.</p>
<p ${P}>Збережіть цей лист, щоб пароль був під рукою. Кабінет запам'ятовує вхід на 30 днів, потім попросить пароль знову.</p>
<p ${P}>Будь ласка, надішліть у відповідь на цей лист свої дані для отримання сертифіката на 30 балів БПР:</p>
<ul style="margin:0 0 16px;padding-left:22px;font:16px/1.7 Arial,Helvetica,sans-serif;color:#1f1611">${ASK.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
<p ${P}>Якщо щось не відкривається, просто дайте відповідь на цей лист або зателефонуйте: +38 (066) 191-83-00.</p>
<p ${P} >З повагою,<br>Навчальний центр «Аполлонія»</p>
</div></body></html>`;
  return { subject, text, html };
}

function b64utf8(s) {
  const bytes = enc.encode(s); let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function sendBuyerEmail(to, name, env) {
  const key = env.SENDPULSE_API_KEY || env.SENDPULSE_ID;
  const m = buyerEmail(env.KABINET_PASS);
  const r = await fetch("https://api.sendpulse.com/smtp/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({ email: { subject: m.subject, html: b64utf8(m.html), text: m.text,
      from: { name: FROM_NAME, email: env.SENDER_EMAIL }, to: [{ email: to, ...(name ? { name } : {}) }] } }),
  });
  return { ok: r.ok, status: r.status, text: (await r.text()).slice(0, 300) };
}

/* ---------- обробники ---------- */
export async function onRequestGet({ request, env }) {
  // Самоперевірка: заголовок X-Selftest = секрет SELFTEST_KEY. Шле в Meta подію
  // з тестовим кодом — вона видна лише у «Тестових подіях» і в статистику не потрапляє.
  // Перевіряє, що токен дійсний і Meta приймає формат події.
  const st = request.headers.get("X-Selftest");
  const check = new URL(request.url).searchParams.get("check");
  if (st && env.SELFTEST_KEY && st === env.SELFTEST_KEY && check === "sendpulse") {
    // Перевірка ключа SendPulse лише читанням: нічого не надсилає і не змінює.
    const key = env.SENDPULSE_API_KEY || env.SENDPULSE_ID || "";
    const out = { key_present: !!key, key_format: key.startsWith("sp_apikey_") ? "api_key" : (key ? "other" : "none") };
    for (const path of ["/senders", "/smtp/senders", "/smtp/domains", "/smtp/ips", "/addressbooks?limit=20"]) {
      try {
        const r = await fetch("https://api.sendpulse.com" + path, { headers: { Authorization: "Bearer " + key } });
        out[path] = { status: r.status, body: (await r.text()).split(key).join("***").slice(0, 700) };
      } catch (e) { out[path] = { error: String(e).slice(0, 200) }; }
    }
    return Response.json(out, { headers: { "Cache-Control": "no-store" } });
  }
  if (st && env.SELFTEST_KEY && st === env.SELFTEST_KEY && check === "email") {
    // Тестовий лист покупцю — на адресу відправника або на адресу з заголовка X-Test-To.
    if (!env.SENDER_EMAIL) return Response.json({ emailtest: false, error: "немає секрету SENDER_EMAIL" }, { status: 503 });
    const want = (request.headers.get("X-Test-To") || "").trim();
    const custom = /^[^\s@<>,;]+@[^\s@<>,;]+\.[a-z]{2,}$/i.test(want);
    const m = await sendBuyerEmail(custom ? want : env.SENDER_EMAIL, "", env);
    return Response.json({ emailtest: true, to: custom ? "X-Test-To" : "SENDER_EMAIL", status: m.status, ok: m.ok, response: m.text,
      buyer_email_on: env.BUYER_EMAIL_ON === "1" }, { headers: { "Cache-Control": "no-store" } });
  }
  if (st && env.SELFTEST_KEY && st === env.SELFTEST_KEY && env.META_CAPI_TOKEN) {
    const ev = await buildEvent({ orderReference: "SELFTEST-" + Date.now(), amount: 1, currency: "UAH",
      email: "selftest@example.com", products: [{ name: "Самоперевірка вебхука" }] });
    const res = await sendToMeta(ev, env, env.META_TEST_EVENT_CODE || "TEST_SELFCHECK");
    return Response.json({ selftest: true, meta_status: res.status, meta_ok: res.ok,
      action_source: res.fallback ? "system_generated" : "website", meta_response: res.text.slice(0, 600) },
      { headers: { "Cache-Control": "no-store" } });
  }
  // Перевірка налаштувань без розкриття значень.
  return Response.json({
    ok: true, service: "wayforpay → meta capi", pixel: PIXEL_ID,
    configured: { WFP_SECRET_KEY: !!env.WFP_SECRET_KEY, META_CAPI_TOKEN: !!env.META_CAPI_TOKEN,
                  META_TEST_EVENT_CODE: !!env.META_TEST_EVENT_CODE,
                  SENDPULSE: !!(env.SENDPULSE_API_KEY || env.SENDPULSE_ID), SENDER_EMAIL: !!env.SENDER_EMAIL,
                  BUYER_EMAIL_ON: env.BUYER_EMAIL_ON === "1" },
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function onRequestPost({ request, env }) {
  if (!env.WFP_SECRET_KEY || !env.META_CAPI_TOKEN) {
    console.log("wfp: секрети не задано, 503 (WayForPay повторить)");
    return new Response("not configured", { status: 503 });
  }
  const raw = await request.text();
  const { data, json } = parseBody(raw);
  if (!data || !data.orderReference) return new Response("bad request", { status: 400 });

  if (!signatureOk(data, json, env.WFP_SECRET_KEY)) {
    console.log("wfp: невірний підпис", data.orderReference);
    return new Response("bad signature", { status: 403 });
  }

  if (data.transactionStatus === "Approved") {
    const res = await sendToMeta(await buildEvent(data), env);
    console.log("wfp: Purchase", data.orderReference, data.amount, data.currency,
                "→ meta", res.status, res.fallback ? "(system_generated)" : "", res.ok ? "" : res.text.slice(0, 300));
    // Meta не прийняла — не підтверджуємо, WayForPay надішле ще раз (дублікати Meta зіллє за event_id).
    if (!res.ok) return new Response("meta error", { status: 502 });

    // Будова сповіщення без особистих даних — щоб бачити, за чим відрізняти курс від інших товарів.
    const prods = Array.isArray(data.products) ? data.products.map(p => p && p.name) : null;
    console.log("wfp: поля", Object.keys(data).join(","), "| товари", JSON.stringify(prods), "| курс:", isCourse(data));

    const email = String(data.email || "").trim();
    if (env.BUYER_EMAIL_ON === "1" && (env.SENDPULSE_API_KEY || env.SENDPULSE_ID) && env.KABINET_PASS
        && env.SENDER_EMAIL && isCourse(data) && email.includes("@")) {
      const m = await sendBuyerEmail(email, String(data.clientName || "").trim(), env);
      console.log("wfp: лист покупцю", data.orderReference, "→ sendpulse", m.status, m.ok ? "" : m.text);
      // Лист не пішов — не підтверджуємо, WayForPay повторить (Meta дублікат зіллє).
      if (!m.ok) return new Response("email error", { status: 502 });
    }
  } else {
    console.log("wfp: статус", data.transactionStatus, data.orderReference, "— у Meta не шлемо");
  }
  return accept(data.orderReference, env.WFP_SECRET_KEY);
}
