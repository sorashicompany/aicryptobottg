const API = "https://api.telegram.org";

async function telegram(env, method, data) {
  const response = await fetch(`${API}/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.description || "Telegram API error");
  return result;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return new Response('{"status":"ok"}', {
        headers: { "content-type": "application/json" },
      });
    }

    if (request.method !== "POST" || url.pathname !== "/telegram") {
      return new Response("Not found", { status: 404 });
    }

    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response("Server configuration error", { status: 500 });
    }

    if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const message = update.message;
    if (!message?.chat?.id || !message.message_id) {
      return new Response("OK");
    }

    try {
      const command = message.text?.trim().split(/\s+/, 1)[0].split("@", 1)[0];

      if (command === "/start") {
        await telegram(env, "sendMessage", {
          chat_id: message.chat.id,
          text: "Привет! Я эхо-бот. Отправь любое сообщение — я повторю его.",
        });
      } else {
        await telegram(env, "copyMessage", {
          chat_id: message.chat.id,
          from_chat_id: message.chat.id,
          message_id: message.message_id,
        });
      }

      return new Response("OK");
    } catch (error) {
      console.error(error);
      return new Response("Telegram request failed", { status: 502 });
    }
  },
};
