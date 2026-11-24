const API = "https://api.telegram.org";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function validSecret(received, expected) {
  if (typeof received !== "string" || typeof expected !== "string") return false;
  if (received.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < received.length; i++) {
    diff |= received.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

async function callTelegram(env, method, payload) {
  const response = await fetch(`${API}/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    console.error("Telegram API error", method, response.status, data?.description);
    throw new Error(data?.description || `Telegram API HTTP ${response.status}`);
  }
  return data.result;
}

async function handleWebhook(request, env) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) {
    return json({ ok: false, error: "missing_worker_secrets" }, 503);
  }

  const receivedSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (!validSecret(receivedSecret, env.TELEGRAM_WEBHOOK_SECRET)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  let update;
  try {
    update = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const message = update?.message;
  const chatId = message?.chat?.id;
  const messageId = message?.message_id;

  if (chatId == null || messageId == null) {
    return json({ ok: true, ignored: true });
  }

  const text = typeof message.text === "string" ? message.text : "";
  const command = text.trim().split(/\s+/, 1)[0].split("@", 1)[0];

  try {
    if (command === "/start") {
      await callTelegram(env, "sendMessage", {
        chat_id: chatId,
        text: "Привет! Я эхо-бот. Отправь мне сообщение — я повторю его.",
      });
    } else {
      await callTelegram(env, "copyMessage", {
        chat_id: chatId,
        from_chat_id: chatId,
        message_id: messageId,
      });
    }
    return json({ ok: true });
  } catch (error) {
    console.error("Webhook processing failed:", error.message);
    // A non-2xx response lets Telegram retry delivery.
    return json({ ok: false, error: "telegram_request_failed" }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ status: "ok" });
    }

    if (request.method === "POST" && url.pathname === "/telegram") {
      return handleWebhook(request, env);
    }

    return json({ error: "not_found" }, 404);
  },
};
