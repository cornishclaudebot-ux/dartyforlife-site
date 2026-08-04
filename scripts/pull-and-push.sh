#!/bin/bash
# ============================================================
# DartyForLife — Posh auto-pull (runs on Aiden's Mac via launchd)
# GitHub Actions can't do this: Posh's Cloudflare 403s datacenter
# IPs. This Mac has a residential IP that Posh allows, so the pull
# runs here every 30 min, commits fresh events.json, and pushes —
# GitHub Pages redeploys the site automatically.
#
# Failure-proofing:
#  - Posh pull retries once after 60s before counting as a failure
#  - push retries once after re-rebasing (bot vs. human race)
#  - consecutive-failure streak tracked in logs/.pull-state;
#    3 strikes (~1.5h broken) -> ONE alert email to the owner,
#    and a recovery email when it heals. No spam in between.
# ============================================================
set -uo pipefail

export PATH="/Users/aidencornish/.nvm/versions/node/v22.22.3/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
REPO="/Users/aidencornish/dartyforlife-site"
STATE="$REPO/logs/.pull-state"
ALERT_TO="dartyforlife@gmail.com"
ALERT_FROM="DartyForLife Site Watchdog <rentals@apexaz.ai>"
RESEND_KEY_FILE="/Users/aidencornish/apex-audit-engine/.env"
cd "$REPO" || exit 1
mkdir -p logs

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

send_alert() { # $1 subject, $2 body
  local key
  key=$(grep '^RESEND_API_KEY=' "$RESEND_KEY_FILE" 2>/dev/null | cut -d= -f2)
  [ -z "$key" ] && { echo "[$(ts)] no resend key, cannot alert"; return 1; }
  curl -s -m 20 -X POST "https://api.resend.com/emails" \
    -H "Authorization: Bearer $key" -H "Content-Type: application/json" \
    -d "$(python3 -c 'import json,sys; print(json.dumps({"from":sys.argv[1],"to":[sys.argv[2]],"subject":sys.argv[3],"text":sys.argv[4]}))' \
        "$ALERT_FROM" "$ALERT_TO" "$1" "$2")" >/dev/null 2>&1
}

fail_streak() { cat "$STATE" 2>/dev/null || echo 0; }

mark_failure() { # $1 = reason
  local n; n=$(( $(fail_streak) + 1 )); echo "$n" > "$STATE"
  echo "[$(ts)] FAILURE #$n: $1"
  if [ "$n" -eq 3 ]; then
    send_alert "DFL site auto-update is DOWN" \
"The dartyforlife.com auto-updater has failed 3 times in a row (about 90 minutes).

Latest reason: $1
Log: ~/dartyforlife-site/logs/events-pull.log

The site is still up and serving the last good data. Fix the pull when you can - common causes: Mac offline, Posh blocking, git conflict."
    echo "[$(ts)] alert email sent"
  fi
  exit 1
}

mark_success() {
  local n; n=$(fail_streak)
  if [ "$n" -ge 3 ]; then
    send_alert "DFL site auto-update RECOVERED" "The dartyforlife.com auto-updater is pulling and pushing again as of $(ts). No action needed."
    echo "[$(ts)] recovery email sent"
  fi
  echo 0 > "$STATE"
}

echo "[$(ts)] pull-and-push start"

git pull --rebase --autostash origin main >/dev/null 2>&1 || mark_failure "git pull --rebase failed"

# Posh pull with one retry (transient Cloudflare hiccups happen)
if ! node scripts/update-events.mjs; then
  echo "[$(ts)] first pull attempt failed, retrying in 60s"
  sleep 60
  node scripts/update-events.mjs || mark_failure "Posh pull failed twice (see log above)"
fi

# Heartbeat: proof the whole pull->push->deploy chain works, committed at
# most once a day. Lets the watchdog + cloud sentinel tell "quiet week, no
# event changes" apart from "pipeline dead" without commit spam.
hb_age_ok() {
  [ -f heartbeat.txt ] || return 1
  python3 -c "
import datetime,sys
try:
    t=datetime.datetime.fromisoformat(open('heartbeat.txt').read().strip().replace('Z','+00:00'))
    sys.exit(0 if (datetime.datetime.now(datetime.timezone.utc)-t).total_seconds() < 20*3600 else 1)
except Exception: sys.exit(1)"
}

if git diff --quiet events.json scripts/geocache.json counts.json 2>/dev/null; then
  if hb_age_ok; then
    echo "[$(ts)] no change, nothing to deploy"
    mark_success
    exit 0
  fi
  echo "[$(ts)] no data change, refreshing daily heartbeat"
fi

ts > heartbeat.txt
# -A so new AND removed cal/*.ics both get staged as events roll on and off
git add -A events.json scripts/geocache.json counts.json heartbeat.txt cal
git -c user.name="dartyforlife-events-bot" -c user.email="actions@users.noreply.github.com" \
    commit -q -m "Auto-update events + going counts from Posh ($(date -u +"%Y-%m-%d %H:%MZ"))"

# push with one retry after re-rebasing (in case a human pushed mid-run)
if ! git push -q origin main 2>/dev/null; then
  git pull --rebase --autostash origin main >/dev/null 2>&1
  git push -q origin main 2>/dev/null || mark_failure "git push failed twice"
fi

echo "[$(ts)] pushed fresh data, site redeploying"
mark_success
