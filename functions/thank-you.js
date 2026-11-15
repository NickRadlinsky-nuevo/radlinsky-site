// WayForPay повертає покупця на returnUrl методом POST, а статична сторінка
// на POST відповідає 405. Тут POST перетворюється на звичайний GET тієї ж сторінки:
// покупець бачить «Дякуємо», піксель шле Purchase.
// orderReference передається як ?o=… — це спільний event_id для пікселя і Conversions API.
const FAILED = new Set(["Declined", "Expired", "Refunded", "Voided"]);
const LANDINGS = new Set(["kurs-online", "summer-sale"]);

export async function onRequest({ request, next }) {
  if (request.method !== "POST") return next();

  const url = new URL(request.url);
  let status = "", order = "";
  try {
    const raw = await request.text();
    let f = null;
    try { f = JSON.parse(raw); } catch (_) {
      const p = new URLSearchParams(raw);
      f = Object.fromEntries(p.entries());
    }
    status = String(f.transactionStatus || "");
    order = String(f.orderReference || "");
  } catch (_) {}

  // Оплата не пройшла — подяку не показуємо і Purchase не шлемо.
  if (FAILED.has(status)) {
    const p = url.searchParams.get("p");
    const back = LANDINGS.has(p) ? `/${p}?pay=failed` : "/";
    return Response.redirect(new URL(back, url.origin).toString(), 303);
  }

  if (order && /^[\w.\-]{1,80}$/.test(order)) url.searchParams.set("o", order);
  return Response.redirect(url.toString(), 303);
}
