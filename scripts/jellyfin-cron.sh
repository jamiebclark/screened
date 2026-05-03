#!/bin/sh
set -e

INTERVAL="${SYNC_INTERVAL_HOURS:-6}"
SLEEP_SECONDS=$((INTERVAL * 3600))
APP_URL="${APP_URL:-http://app:3000}"

echo "[jellyfin-cron] Starting. Will sync Jellyfin every ${INTERVAL} hour(s)."
echo "[jellyfin-cron] Waiting 30s for the app to be ready..."
sleep 30

while true; do
  echo "[jellyfin-cron] $(date -u '+%Y-%m-%dT%H:%M:%SZ') Running sync..."

  RESPONSE=$(curl -sf \
    -X POST \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    -H "Content-Type: application/json" \
    "${APP_URL}/api/cron/jellyfin-sync" 2>&1) && {
    echo "[jellyfin-cron] Sync complete: ${RESPONSE}"
  } || {
    echo "[jellyfin-cron] Sync failed (curl exit $?)"
  }

  echo "[jellyfin-cron] Next sync in ${INTERVAL} hour(s)."
  sleep "$SLEEP_SECONDS"
done
