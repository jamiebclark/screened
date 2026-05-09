#!/bin/sh

INTERVAL="${SYNC_INTERVAL_HOURS:-6}"
SLEEP_SECONDS=$((INTERVAL * 3600))
APP_URL="${APP_URL:-http://app:3000}"

echo "[trakt-cron] Starting. Will sync Trakt every ${INTERVAL} hour(s)."
echo "[trakt-cron] Waiting 30s for the app to be ready..."
sleep 30

while true; do
  echo "[trakt-cron] $(date -u '+%Y-%m-%dT%H:%M:%SZ') Running sync..."

  RESPONSE=$(curl -sf \
    -X POST \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    -H "Content-Type: application/json" \
    "${APP_URL}/api/cron/trakt-sync" 2>&1) && {
    echo "[trakt-cron] Sync complete: ${RESPONSE}"
  } || {
    echo "[trakt-cron] Sync failed (curl exit $?)"
  }

  echo "[trakt-cron] Next sync in ${INTERVAL} hour(s)."
  sleep "$SLEEP_SECONDS"
done
