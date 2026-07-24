#!/bin/bash
# ============================================================
# DartyForLife — Posh auto-pull (runs on Aiden's Mac via launchd)
# GitHub Actions can't do this: Posh's Cloudflare 403s datacenter
# IPs. This Mac has a residential IP that Posh allows, so the pull
# runs here every 30 min, commits fresh events.json, and pushes —
# GitHub Pages redeploys the site automatically. No third-party
# service, no inbound server, nothing exposed: outbound pull + push.
# ============================================================
set -uo pipefail

# launchd gives a minimal PATH — set the tools we need explicitly.
export PATH="/Users/aidencornish/.nvm/versions/node/v22.22.3/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
REPO="/Users/aidencornish/dartyforlife-site"
cd "$REPO" || exit 1

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
echo "[$(ts)] pull-and-push start"

# stay in sync with remote (autostash guards local scratch)
git pull --rebase --autostash origin main >/dev/null 2>&1 || { echo "[$(ts)] git pull failed"; exit 1; }

node scripts/update-events.mjs || { echo "[$(ts)] update-events.mjs failed"; exit 1; }

if git diff --quiet events.json scripts/geocache.json counts.json 2>/dev/null; then
  echo "[$(ts)] no change, nothing to deploy"
  exit 0
fi

git add events.json scripts/geocache.json counts.json
git -c user.name="dartyforlife-events-bot" -c user.email="actions@users.noreply.github.com" \
    commit -q -m "Auto-update events + going counts from Posh ($(date -u +"%Y-%m-%d %H:%MZ"))"
if git push -q origin main 2>/dev/null; then
  echo "[$(ts)] pushed fresh data, site redeploying"
else
  echo "[$(ts)] push failed"
  exit 1
fi
