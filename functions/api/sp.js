// Службова точка для роботи з SendPulse: шаблони листів, тестове надсилання, перелік адресних книг.
// Ключ SendPulse лежить у секретах Cloudflare і назовні не віддається.
// Доступ лише із заголовком X-Selftest, що дорівнює секрету SELFTEST_KEY; без нього відповідь 404.
// Масових розсилок ця точка не запускає.
const API = "https://api.sendpulse.com";

export function b64utf8(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function call(key, path, init = {}) {
  const r = await fetch(API + path, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key, ...(init.headers || {}) },
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return { status: r.status, ok: r.ok, json, text: json ? undefined : text.slice(0, 500) };
}

export async function onRequest({ request, env }) {
  const st = request.headers.get("X-Selftest");
  if (!st || !env.SELFTEST_KEY || st !== env.SELFTEST_KEY) return new Response("Not found", { status: 404 });
  const key = env.SENDPULSE_API_KEY || env.SENDPULSE_ID;
  if (!key) return Response.json({ ok: false, error: "немає ключа SendPulse" }, { status: 503 });

  const url = new URL(request.url);
  const act = url.searchParams.get("do") || "";

  // Адресні книги: лише назви й кількість адрес, без самих адрес.
  if (request.method === "GET" && act === "books") {
    const r = await call(key, "/addressbooks?limit=100");
    const books = Array.isArray(r.json) ? r.json.map(b => ({ id: b.id, name: b.name, all: b.all_email_qty, active: b.active_email_qty, created: b.creationdate })) : r.json;
    return Response.json({ ok: r.ok, status: r.status, books, text: r.text });
  }

  // Власні шаблони: назва, номер, дата.
  if (request.method === "GET" && act === "templates") {
    const r = await call(key, "/templates?owner=me");
    const list = Array.isArray(r.json) ? r.json.map(t => ({ id: t.real_id || t.id, name: t.name, created: t.created })) : r.json;
    return Response.json({ ok: r.ok, status: r.status, templates: list, text: r.text });
  }

  if (request.method === "POST") {
    let body = null;
    try { body = await request.json(); } catch (_) {}
    if (!body || typeof body.html !== "string" || body.html.length < 200) return Response.json({ ok: false, error: "потрібне поле html" }, { status: 400 });

    // Створити шаблон або оновити наявний (?id=номер). Нічого не надсилає.
    if (act === "template") {
      const id = (url.searchParams.get("id") || "").replace(/\D/g, "");
      const payload = { body: b64utf8(body.html), lang: "ua" };
      if (!id) payload.name = String(body.name || "Лист").slice(0, 120);
      const r = await call(key, id ? "/template/edit/" + id : "/template", { method: "POST", body: JSON.stringify(payload) });
      return Response.json({ ok: r.ok, status: r.status, action: id ? "edit" : "create", response: r.json, text: r.text });
    }

    // Один тестовий лист на адресу із заголовка X-Test-To.
    if (act === "test") {
      const to = (request.headers.get("X-Test-To") || "").trim();
      if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[a-z]{2,}$/i.test(to)) return Response.json({ ok: false, error: "потрібен заголовок X-Test-To з однією адресою" }, { status: 400 });
      if (!env.SENDER_EMAIL) return Response.json({ ok: false, error: "немає SENDER_EMAIL" }, { status: 503 });
      const email = {
        subject: String(body.subject || "Тестовий лист").slice(0, 200),
        html: b64utf8(body.html),
        text: String(body.text || "Тестовий лист. Відкрийте HTML-версію."),
        from: { name: env.SENDER_NAME || "Навчальний центр «Аполлонія»", email: String(env.SENDER_EMAIL).trim().toLowerCase() },
        to: [{ email: to }],
      };
      const r = await call(key, "/smtp/emails", { method: "POST", body: JSON.stringify({ email }) });
      return Response.json({ ok: r.ok, status: r.status, action: "test", response: r.json, text: r.text });
    }
  }

  return Response.json({ ok: false, error: "невідома дія", actions: ["GET do=books", "GET do=templates", "POST do=template[&id=]", "POST do=test"] }, { status: 400 });
}
