#!/usr/bin/env bash
set -euo pipefail

: "${TELEGRAM_BOT_TOKEN:?Set TELEGRAM_BOT_TOKEN in your environment}"
: "${TELEGRAM_WEBHOOK_SECRET:?Set TELEGRAM_WEBHOOK_SECRET in your environment}"
: "${WORKER_URL:?Set WORKER_URL, e.g. https://aicryptobottg-echo.sorashithegod.workers.dev}"

curl --fail-with-body --silent --show-error \
  --request POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  --data-urlencode "url=${WORKER_URL%/}/telegram" \
  --data-urlencode "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
