#!/bin/sh

INTERVAL="${SYNC_INTERVAL_HOURS:-6}"
SLEEP_SECONDS=$((INTERVAL * 3600))
APP_URL="${APP_URL:-http://app:3000}"

echo "[tautulli-cron] Starting. Will sync Tautulli every ${INTERVAL} hour(s)."
echo "[tautulli-cron] Waiting 30s for the app to be ready..."
sleep 30

while true; do
  echo "[tautulli-cron] $(date -u '+%Y-%m-%dT%H:%M:%SZ') Running sync..."

  RESPONSE=$(curl -sf \
    -X POST \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    -H "Content-Type: application/json" \
    "${APP_URL}/api/cron/tautulli-sync" 2>&1) && {
    echo "[tautulli-cron] Sync complete: ${RESPONSE}"
  } || {
    echo "[tautulli-cron] Sync failed (curl exit $?)"
  }

  echo "[tautulli-cron] Next sync in ${INTERVAL} hour(s)."
  sleep "$SLEEP_SECONDS"
done
