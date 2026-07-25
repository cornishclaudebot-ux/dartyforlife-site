#!/bin/bash
# ============================================================
# DartyForLife — daily end-to-end watchdog (launchd, 9am)
# Checks what USERS actually see, not what we hope is running:
#   1. https://dartyforlife.com  loads (Pages + TLS + DNS)
#   2. live events.json is fresh (<26h)  -> whole pull->push->deploy chain
#   3. going-counter API is up            -> live ticket counts on site
#   4. leads API answers                  -> rental/list forms can submit
#   5. Resend key valid                   -> rental email forwarding works
# Any failure -> one plain email listing exactly what is broken.
# All green -> silence.
# ============================================================
set -uo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
ALERT_TO="dartyforlife@gmail.com"
ALERT_FROM="DartyForLife Site Watchdog <rentals@apexaz.ai>"
KEY=$(grep '^RESEND_API_KEY=' /Users/aidencornish/apex-audit-engine/.env 2>/dev/null | cut -d= -f2)
FAILS=""

add_fail() { FAILS="${FAILS}- $1"$'\n'; }

# 1. site up
code=$(curl -s -o /dev/null -w "%{http_code}" -m 20 "https://dartyforlife.com/")
[ "$code" = "200" ] || add_fail "dartyforlife.com returned $code (site down or TLS/DNS broken)"

# 2. data freshness on the LIVE site
fresh=$(curl -s -m 20 "https://dartyforlife.com/events.json" | python3 -c "
import json,sys,datetime
try:
    d=json.load(sys.stdin)
    upd=datetime.datetime.fromisoformat(d['updated'].replace('Z','+00:00'))
    age=(datetime.datetime.now(datetime.timezone.utc)-upd).total_seconds()/3600
    print('OK' if age < 26 else f'STALE {age:.0f}h')
except Exception as e:
    print('BROKEN', e)")
[ "$fresh" = "OK" ] || add_fail "live events.json is $fresh (auto-update chain broken - check ~/dartyforlife-site/logs/events-pull.log)"

# 3. going counter
gcode=$(curl -s -o /dev/null -w "%{http_code}" -m 20 "https://social-command-center-lemon.vercel.app/api/public/going")
[ "$gcode" = "200" ] || add_fail "going-counter API returned $gcode (live ticket counts frozen on site)"

# 4. lead intake (forms)
lcode=$(curl -s -o /dev/null -w "%{http_code}" -m 20 -X OPTIONS "https://social-command-center-lemon.vercel.app/api/public/leads")
[ "$lcode" = "204" ] || add_fail "leads API preflight returned $lcode (rental + list forms cannot submit)"

# 5. resend key
rcode=$(curl -s -o /dev/null -w "%{http_code}" -m 20 "https://api.resend.com/domains" -H "Authorization: Bearer $KEY")
[ "$rcode" = "200" ] || add_fail "Resend API key check returned $rcode (rental email forwarding broken)"

if [ -n "$FAILS" ]; then
  echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") FAILURES:"; printf '%s' "$FAILS"
  [ -n "$KEY" ] && curl -s -m 20 -X POST "https://api.resend.com/emails" \
    -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
    -d "$(python3 -c 'import json,sys; print(json.dumps({"from":sys.argv[1],"to":[sys.argv[2]],"subject":"DFL daily check: something is broken","text":"Daily dartyforlife.com health check found problems:\n\n"+sys.argv[3]+"\nEverything not listed above is working."}))' \
        "$ALERT_FROM" "$ALERT_TO" "$FAILS")" >/dev/null
else
  echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") all checks green"
fi
