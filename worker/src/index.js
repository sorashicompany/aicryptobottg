const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS }); }
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") return json({ status: "ok", service: "telegram-echo-bot" });
    if (request.method !== "POST" || url.pathname !== "/telegram") return json({ error: "not_found" }, 404);
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) return json({ error: "worker_not_configured" }, 503);
    const suppliedSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (!safeEqual(suppliedSecret, env.TELEGRAM_WEBHOOK_SECRET)) return json({ error: "unauthorized" }, 401);
    let update;
    try { update = await request.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const message = update?.message;
    const chatId = message?.chat?.id;
    const text = message?.text;
    if (!Number.isSafeInteger(chatId) || typeof text !== "string") return json({ ok: true, ignored: true });
    const telegramResponse = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text })
    });
    if (!telegramResponse.ok) return json({ error: "telegram_send_failed" }, 502);
    return json({ ok: true });
  },
  async scheduled(controller, env) {
    if (await env.SETUP_STATE.get("webhook_setup") === "ok") return;
    try {
      const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: "https://aicryptobottg-echo.sorashithegod.workers.dev/telegram", secret_token: env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ["message"], drop_pending_updates: true })
      });
      const result = await response.json();
      await env.SETUP_STATE.put("webhook_setup_result", JSON.stringify({ ok: response.ok && result.ok === true, description: result.description || "Webhook registration attempted", error_code: result.error_code || null }));
      if (response.ok && result.ok) await env.SETUP_STATE.put("webhook_setup", "ok");
    } catch {
      await env.SETUP_STATE.put("webhook_setup_result", JSON.stringify({ ok: false, description: "Registration request failed" }));
    }
  }
};