# Telegram Echo Bot

A minimal Telegram webhook bot deployed on Cloudflare Workers. It echoes incoming text messages; it contains no exchange, wallet, or trading functionality.

## Architecture

- Telegram sends updates to the Cloudflare Worker webhook.
- The Worker validates Telegram's webhook secret header.
- Text messages are sent back unchanged using Telegram's `sendMessage` API.
- Bot credentials are stored as Cloudflare Worker secrets and GitHub Actions secrets, never committed to Git.

## Configure GitHub Actions

In the GitHub repository, open **Settings → Secrets and variables → Actions** and add these repository secrets:

- `TELEGRAM_BOT_TOKEN`: the bot token from BotFather.
- `TELEGRAM_WEBHOOK_SECRET`: a secret string used by the Worker to validate Telegram webhook requests. It must match the Cloudflare Worker secret with the same name.

The Cloudflare Worker must also have `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` configured as Worker secrets. GitHub Actions secrets do not automatically sync to Cloudflare.

Optionally add an Actions variable named `WORKER_URL` with the Worker base URL. If omitted, the workflow uses:

`https://aicryptobottg-echo.sorashithegod.workers.dev`

After saving both GitHub secrets, open **Actions → Register Telegram webhook → Run workflow**. The workflow checks the Worker health endpoint, registers `/telegram` with Telegram using `setWebhook`, and fails if Telegram does not confirm success.

## Local setup

Install Wrangler and authenticate with Cloudflare:

```bash
npm install --global wrangler
wrangler login
```

From `worker/`, set the Worker secrets and deploy:

```bash
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_WEBHOOK_SECRET
wrangler deploy
```

Alternatively, the helper `scripts/set-webhook.sh` registers the webhook locally when `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, and `WORKER_URL` are exported.

Health check: `GET /health`.

## Security

Never commit bot tokens, webhook secrets, API keys, or `.env` files. The bot is intentionally limited to echoing text messages.
