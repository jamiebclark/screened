#!/bin/sh
set -e

apk add --no-cache curl --quiet

INTERVAL="${SYNC_INTERVAL_HOURS:-6}"
SLEEP_SECONDS=$((INTERVAL * 3600))
APP_URL="${APP_URL:-http://app:3000}"

echo "[letterboxd-cron] Starting. Will sync Letterboxd every ${INTERVAL} hour(s)."
echo "[letterboxd-cron] Waiting 30s for the app to be ready..."
sleep 30

while true; do
  echo "[letterboxd-cron] $(date -u '+%Y-%m-%dT%H:%M:%SZ') Running sync..."

  RESPONSE=$(curl -sf \
    -X POST \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    -H "Content-Type: application/json" \
    "${APP_URL}/api/cron/letterboxd-sync" 2>&1) && {
    echo "[letterboxd-cron] Sync complete: ${RESPONSE}"
  } || {
    echo "[letterboxd-cron] Sync failed (curl exit $?)"
  }

  echo "[letterboxd-cron] Next sync in ${INTERVAL} hour(s)."
  sleep "$SLEEP_SECONDS"
done
