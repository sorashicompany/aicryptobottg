const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function telegram(token, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) {
    console.error("Telegram API request failed", method, response.status, result?.description);
    throw new Error("Telegram API request failed");
  }
  return result;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ status: "ok" });
    }

    if (request.method !== "POST" || url.pathname !== "/telegram") {
      return json({ error: "not_found" }, 404);
    }

    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) {
      return json({ error: "worker_not_configured" }, 503);
    }

    const suppliedSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (!safeEqual(suppliedSecret, env.TELEGRAM_WEBHOOK_SECRET)) {
      return json({ error: "unauthorized" }, 401);
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    const message = update?.message;
    const chatId = message?.chat?.id;
    const messageId = message?.message_id;

    // Ignore updates that do not contain a regular chat message.
    if (!Number.isSafeInteger(chatId) || !Number.isSafeInteger(messageId)) {
      return json({ ok: true, ignored: true });
    }

    try {
      const command = typeof message.text === "string"
        ? message.text.trim().split(/[ \t\r\n]/, 1)[0].split("@", 1)[0]
        : "";

      if (command === "/start") {
        await telegram(env.TELEGRAM_BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: "Привет! Отправь мне сообщение, фото, стикер или файл — я повторю его.",
        });
      } else {
        await telegram(env.TELEGRAM_BOT_TOKEN, "copyMessage", {
          chat_id: chatId,
          from_chat_id: chatId,
          message_id: messageId,
        });
      }

      return json({ ok: true });
    } catch {
      // Telegram retries webhook updates when the Worker returns a non-2xx response.
      return json({ error: "message_copy_failed" }, 502);
    }
  },
};
