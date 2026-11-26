// Службова точка для роботи з SendPulse: шаблони листів, тестове надсилання, перелік адресних книг.
// Ключ SendPulse лежить у секретах Cloudflare і назовні не віддається.
// Доступ лише із заголовком X-Selftest, що дорівнює секрету SELFTEST_KEY; без нього відповідь 404.
// Розсилку по базі запускає лише дія do=send з явним підтвердженням і звіркою адресної книги.
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

// SendPulse віддає розсилки від найстаріших, тому гортаємо до кінця і беремо останні n.
async function recentCampaigns(key, n = 20) {
  const all = [];
  for (let page = 0; page < 40; page++) {
    const r = await call(key, "/campaigns?limit=100&offset=" + page * 100);
    if (!Array.isArray(r.json)) return { ok: false, status: r.status, list: null, text: r.text };
    all.push(...r.json);
    if (r.json.length < 100) break;
  }
  all.sort((a, b) => Number(b.id) - Number(a.id));
  return { ok: true, status: 200, list: all.slice(0, n), total: all.length };
}

function brief(c, names) {
  const m = c.message || {};
  return {
    id: c.id, name: c.name, subject: m.subject, status: c.status, qty: c.all_email_qty, send_date: c.send_date,
    list_id: m.list_id, list_name: names[m.list_id] || null, sender_name: m.sender_name,
    sender_domain: m.sender_email ? String(m.sender_email).split("@").pop() : null,
  };
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

  // Останні розсилки: назва, тема, статус, кількість, адресна книга. Адреси відправника не віддаємо.
  if (request.method === "GET" && act === "campaigns") {
    const [r, b] = await Promise.all([recentCampaigns(key, 20), call(key, "/addressbooks?limit=100")]);
    const names = {};
    if (Array.isArray(b.json)) for (const x of b.json) names[x.id] = x.name;
    const list = r.list ? r.list.map(c => brief(c, names)) : null;
    return Response.json({ ok: r.ok, status: r.status, total: r.total, campaigns: list, text: r.text });
  }

  // Одна розсилка з цифрами доставки.
  if (request.method === "GET" && act === "campaign") {
    const id = (url.searchParams.get("id") || "").replace(/\D/g, "");
    if (!id) return Response.json({ ok: false, error: "потрібен id" }, { status: 400 });
    const [r, b] = await Promise.all([call(key, "/campaigns/" + id), call(key, "/addressbooks?limit=100")]);
    const names = {};
    if (Array.isArray(b.json)) for (const x of b.json) names[x.id] = x.name;
    const c = r.json && r.json.id ? { ...brief(r.json, names), statistics: (r.json.statistics || []).map(x => ({ code: x.code, count: x.count, explain: x.explain })) } : r.json;
    return Response.json({ ok: r.ok, status: r.status, campaign: c, text: r.text });
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

    // Розсилка по адресній книзі. Відправник береться з попередньої розсилки (?like), книга має збігатися з нею.
    // Захист: поле confirm:"SEND", звірка книги, заборона повтору з тією самою назвою.
    if (act === "send") {
      if (body.confirm !== "SEND") return Response.json({ ok: false, error: "потрібне confirm: SEND" }, { status: 400 });
      const like = String(body.like || "").replace(/\D/g, "");
      const listId = Number(body.list_id);
      const subject = String(body.subject || "").trim();
      const name = String(body.name || "").trim();
      if (!like || !listId || !subject || !name) return Response.json({ ok: false, error: "потрібні like, list_id, subject, name" }, { status: 400 });
      if (/\[ТЕСТ\]|\[TEST\]/i.test(subject)) return Response.json({ ok: false, error: "у темі позначка тесту" }, { status: 400 });

      const prev = await call(key, "/campaigns/" + like);
      const pm = prev.json && prev.json.message;
      if (!pm || !pm.sender_email) return Response.json({ ok: false, error: "не знайдено попередню розсилку", status: prev.status }, { status: 502 });
      if (Number(pm.list_id) !== listId) return Response.json({ ok: false, error: "адресна книга не збігається з попередньою розсилкою", prev_list_id: pm.list_id }, { status: 409 });

      const recent = await recentCampaigns(key, 30);
      if (!recent.list) return Response.json({ ok: false, error: "не вдалося перевірити повтор", status: recent.status }, { status: 502 });
      if (recent.list.some(c => String(c.name || "").trim() === name)) return Response.json({ ok: false, error: "розсилка з такою назвою вже є — повтор заборонено" }, { status: 409 });

      const payload = { sender_name: pm.sender_name, sender_email: pm.sender_email, subject, body: b64utf8(body.html), list_id: listId, name };
      const r = await call(key, "/campaigns", { method: "POST", body: JSON.stringify(payload) });
      return Response.json({ ok: r.ok, status: r.status, action: "send", sender_name: pm.sender_name, list_id: listId, response: r.json, text: r.text });
    }
  }

  return Response.json({ ok: false, error: "невідома дія", actions: ["GET do=books", "GET do=templates", "GET do=campaigns", "GET do=campaign&id=", "POST do=template[&id=]", "POST do=test", "POST do=send"] }, { status: 400 });
}
