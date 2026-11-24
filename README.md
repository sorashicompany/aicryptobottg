# Telegram Echo Bot

A minimal Telegram webhook bot deployed on Cloudflare Workers. The first milestone only echoes incoming text messages; it contains no exchange, wallet, or trading functionality.

## Architecture

- Telegram sends updates to the Cloudflare Worker webhook.
- The Worker validates Telegram's webhook secret header.
- Text messages are sent back unchanged using Telegram's `sendMessage` API.
- Bot credentials are stored as Cloudflare Worker secrets, never committed to Git.

## Local setup

Install Wrangler and authenticate with Cloudflare:

```bash
npm install --global wrangler
wrangler login
```

From `worker/`, set the secrets:

```bash
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_WEBHOOK_SECRET
```

Deploy:

```bash
wrangler deploy
```

After deployment, configure Telegram's webhook to `https://<worker-subdomain>.workers.dev/telegram`, passing the same `TELEGRAM_WEBHOOK_SECRET` as Telegram's `secret_token`.

Health check: `GET /health`.

## Security

Do not commit bot tokens, webhook secrets, API keys, or `.env` files. The bot is intentionally limited to echoing text messages.