#!/bin/sh

INTERVAL="${SYNC_INTERVAL_HOURS:-6}"
SLEEP_SECONDS=$((INTERVAL * 3600))
APP_URL="${APP_URL:-http://app:3000}"

echo "[plex-cron] Starting. Will sync Plex every ${INTERVAL} hour(s)."
echo "[plex-cron] Waiting 30s for the app to be ready..."
sleep 30

while true; do
  echo "[plex-cron] $(date -u '+%Y-%m-%dT%H:%M:%SZ') Running sync..."

  RESPONSE=$(curl -sf \
    -X POST \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    -H "Content-Type: application/json" \
    "${APP_URL}/api/cron/plex-sync" 2>&1) && {
    echo "[plex-cron] Sync complete: ${RESPONSE}"
  } || {
    echo "[plex-cron] Sync failed (curl exit $?)"
  }

  echo "[plex-cron] Next sync in ${INTERVAL} hour(s)."
  sleep "$SLEEP_SECONDS"
done
