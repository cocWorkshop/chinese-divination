#!/bin/bash
# =============================================================================
# 玄机 (Xuanji) — /start Ad Funnel End-to-End Test Suite
# =============================================================================
#
# Exercises the 5-view funnel via its API surface:
#   /api/start/init      — tentative-user creation, trial Karma grant
#   /api/divination      — funnel cookie auth + readingId-only request
#   /api/master          — funnel cookie auth (checkin)
#   /api/start/complete  — tentative → real user conversion
#
# Run against a live dev server (default http://localhost:8088). Uses curl
# with a cookie jar so the funnel session cookie persists across requests.
#
# Usage:
#   ./tests/run_funnel_tests.sh
#   BASE_URL=http://localhost:8094 ./tests/run_funnel_tests.sh
#
# Note on cost: this skips the actual LLM call where it can — it uses
# paipanOnly mode for /api/divination (no model invocation) and aborts
# /api/master after the response status is established (no streaming
# tokens). Trial Karma is consumed but not paywall-validated.

BASE_URL="${BASE_URL:-http://localhost:8088}"
PASS=0
FAIL=0
SKIP=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Unique test identifiers (timestamp-based)
TS=$(date +%s)
TRIAL_EMAIL="funnel_${TS}@xuanji.test"
TRIAL_PASSWORD="FunnelPass1"
EXISTING_EMAIL="existing_${TS}@xuanji.test"
EXISTING_PASSWORD="ExistingPass1"

COOKIE_JAR="/tmp/xj_funnel_cookies_${TS}.txt"
trap "rm -f $COOKIE_JAR" EXIT

section() { echo -e "\n${CYAN}${BOLD}══════════════════════════════════════${NC}"; echo -e "${CYAN}${BOLD}  $1${NC}"; echo -e "${CYAN}${BOLD}══════════════════════════════════════${NC}"; }
pass() { echo -e "  ${GREEN}✓${NC} $1"; ((PASS++)); }
fail() { echo -e "  ${RED}✗${NC} $1"; ((FAIL++)); }
skip() { echo -e "  ${YELLOW}○${NC} $1 (skipped)"; ((SKIP++)); }
info() { echo -e "  ${BLUE}ℹ${NC} $1"; }

# Helper: HTTP request with cookie jar
# Args: METHOD PATH [JSON_BODY] [EXTRA_ARGS]
req() {
  local method="$1" url="$2" data="$3" extra_args="$4"
  curl -s -w "\n__STATUS__%{http_code}" \
    -X "$method" \
    -H "Content-Type: application/json" \
    -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    ${data:+-d "$data"} \
    $extra_args \
    "${BASE_URL}${url}" 2>/dev/null
}

parse() {
  local raw="$1"
  BODY=$(echo "$raw" | sed 's/__STATUS__[0-9]*$//')
  STATUS=$(echo "$raw" | grep -o '__STATUS__[0-9]*' | grep -o '[0-9]*')
}

json_field() { echo "$1" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('$2',''))" 2>/dev/null; }
json_has()   { echo "$1" | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if '$2' in d else 1)" 2>/dev/null; }

# Check whether the cookie jar contains the funnel session cookie
has_funnel_cookie() {
  grep -q "xj_funnel_session" "$COOKIE_JAR" 2>/dev/null
}

# Strip the funnel cookie from the jar (simulates a different browser)
clear_funnel_cookie() {
  if [[ -f "$COOKIE_JAR" ]]; then
    grep -v "xj_funnel_session" "$COOKIE_JAR" > "${COOKIE_JAR}.tmp" 2>/dev/null || true
    mv "${COOKIE_JAR}.tmp" "$COOKIE_JAR" 2>/dev/null || true
  fi
}

echo ""
echo -e "${BOLD}☯  玄机 — /start Funnel E2E Test Suite${NC}"
echo -e "   Target: ${BASE_URL}"
echo -e "   Email:  ${TRIAL_EMAIL}"
echo -e "   Time:   $(date)"
echo ""

# Sanity check: server reachable
RAW=$(req GET "/start")
parse "$RAW"
if [[ "$STATUS" != "200" ]]; then
  echo -e "${RED}Cannot reach ${BASE_URL}/start (got ${STATUS:-no response}). Is dev server running?${NC}"
  exit 1
fi

# =============================================================================
section "1. View 1 / View 2 reachability (HTML pages)"
# =============================================================================

for path in "/start" "/start/cast"; do
  RAW=$(req GET "$path")
  parse "$RAW"
  if [[ "$STATUS" == "200" ]]; then
    pass "1.x ${path} renders (200)"
  else
    fail "1.x ${path} expected 200, got ${STATUS}"
  fi
done

# =============================================================================
section "2. POST /api/start/init — first-time tentative user"
# =============================================================================

# 2.1 Valid submission creates the tentative user, sets cookie, returns readingId
RAW=$(req POST "/api/start/init" "{\"email\":\"${TRIAL_EMAIL}\",\"birthDate\":\"1988-09-17\",\"birthTime\":\"wu\",\"gender\":\"male\"}")
parse "$RAW"
if [[ "$STATUS" == "201" ]]; then
  READING_ID=$(json_field "$BODY" "readingId")
  if [[ -n "$READING_ID" ]]; then
    pass "2.1 init returns 201 + readingId (${READING_ID:0:10}…)"
  else
    fail "2.1 init returned 201 but readingId missing"
  fi
else
  fail "2.1 init expected 201, got ${STATUS} — body: $BODY"
  echo "      Cannot continue funnel tests without a readingId"
  echo -e "\n${RED}TOTAL: ${PASS} pass, ${FAIL} fail${NC}\n"
  exit 1
fi

# 2.2 Funnel session cookie was set
if has_funnel_cookie; then
  pass "2.2 funnel session cookie set"
else
  fail "2.2 funnel session cookie missing from response"
fi

# 2.3 isReturning=false on first contact
IS_RETURNING=$(json_field "$BODY" "isReturning")
if [[ "$IS_RETURNING" == "False" || "$IS_RETURNING" == "false" ]]; then
  pass "2.3 isReturning=false on first contact"
else
  fail "2.3 isReturning expected false, got '${IS_RETURNING}'"
fi

# =============================================================================
section "3. POST /api/start/init — input validation"
# =============================================================================

# 3.1 Bad email
RAW=$(req POST "/api/start/init" "{\"email\":\"not-an-email\",\"birthDate\":\"1988-09-17\",\"birthTime\":\"wu\",\"gender\":\"male\"}")
parse "$RAW"
if [[ "$STATUS" == "400" ]]; then
  pass "3.1 invalid email → 400"
else
  fail "3.1 invalid email expected 400, got ${STATUS}"
fi

# 3.2 Bad shichen key
RAW=$(req POST "/api/start/init" "{\"email\":\"valid_${TS}@xuanji.test\",\"birthDate\":\"1988-09-17\",\"birthTime\":\"midnight\",\"gender\":\"male\"}")
parse "$RAW"
if [[ "$STATUS" == "400" ]]; then
  pass "3.2 invalid shichen key → 400"
else
  fail "3.2 invalid shichen expected 400, got ${STATUS}"
fi

# 3.3 Bad gender
RAW=$(req POST "/api/start/init" "{\"email\":\"valid2_${TS}@xuanji.test\",\"birthDate\":\"1988-09-17\",\"birthTime\":\"wu\",\"gender\":\"unknown\"}")
parse "$RAW"
if [[ "$STATUS" == "400" ]]; then
  pass "3.3 invalid gender → 400"
else
  fail "3.3 invalid gender expected 400, got ${STATUS}"
fi

# =============================================================================
section "4. POST /api/start/init — returning tentative user (same email)"
# =============================================================================

# 4.1 Re-submit with same email → 201 + isReturning=true (no extra credit grant)
RAW=$(req POST "/api/start/init" "{\"email\":\"${TRIAL_EMAIL}\",\"birthDate\":\"1990-01-01\",\"birthTime\":\"zi_early\",\"gender\":\"female\"}")
parse "$RAW"
if [[ "$STATUS" == "201" ]]; then
  IS_RETURNING=$(json_field "$BODY" "isReturning")
  if [[ "$IS_RETURNING" == "True" || "$IS_RETURNING" == "true" ]]; then
    pass "4.1 same email → 201 + isReturning=true"
  else
    fail "4.1 isReturning expected true, got '${IS_RETURNING}'"
  fi
else
  fail "4.1 second init expected 201, got ${STATUS}"
fi

# =============================================================================
section "5. POST /api/start/init — already-registered email blocks the funnel"
# =============================================================================

# 5.1 Pre-create a real user via /api/register
RAW=$(curl -s -w "\n__STATUS__%{http_code}" \
  -X POST -H "Content-Type: application/json" \
  -d "{\"name\":\"Existing\",\"email\":\"${EXISTING_EMAIL}\",\"password\":\"${EXISTING_PASSWORD}\"}" \
  "${BASE_URL}/api/register" 2>/dev/null)
parse "$RAW"
if [[ "$STATUS" == "201" ]]; then
  pass "5.1 created seed registered user"
else
  fail "5.1 register seed user expected 201, got ${STATUS} — body: $BODY"
  skip "5.2 cannot test ALREADY_REGISTERED without seed user"
fi

# 5.2 Funnel init with the registered email → 409 ALREADY_REGISTERED
if [[ "$STATUS" == "201" ]]; then
  RAW=$(req POST "/api/start/init" "{\"email\":\"${EXISTING_EMAIL}\",\"birthDate\":\"1988-09-17\",\"birthTime\":\"wu\",\"gender\":\"male\"}")
  parse "$RAW"
  if [[ "$STATUS" == "409" ]]; then
    ERR_CODE=$(json_field "$BODY" "error")
    if [[ "$ERR_CODE" == "ALREADY_REGISTERED" ]]; then
      pass "5.2 registered email → 409 ALREADY_REGISTERED"
    else
      fail "5.2 status 409 but error code wrong: '${ERR_CODE}'"
    fi
  else
    fail "5.2 expected 409, got ${STATUS}"
  fi
fi

# =============================================================================
section "6. /api/divination + /api/master accept funnel cookie"
# =============================================================================

# 6.1 /api/divination without cookie → 401
clear_funnel_cookie
RAW=$(req POST "/api/divination" "{\"readingId\":\"${READING_ID}\"}")
parse "$RAW"
if [[ "$STATUS" == "401" ]]; then
  pass "6.1 /api/divination without cookie → 401"
else
  fail "6.1 /api/divination without cookie expected 401, got ${STATUS}"
fi

# Re-establish cookie via init (with same email — returning tentative)
req POST "/api/start/init" "{\"email\":\"${TRIAL_EMAIL}\",\"birthDate\":\"1988-09-17\",\"birthTime\":\"wu\",\"gender\":\"male\"}" > /dev/null

# 6.2 /api/divination with cookie + readingId-only (paipan mode skips LLM cost)
RAW=$(req POST "/api/divination" "{\"readingId\":\"${READING_ID}\",\"paipanOnly\":true,\"language\":\"zh-TW\"}" "--max-time 30")
parse "$RAW"
if [[ "$STATUS" == "200" ]]; then
  pass "6.2 /api/divination with funnel cookie + paipanOnly → 200"
else
  fail "6.2 /api/divination with cookie expected 200, got ${STATUS} — body: ${BODY:0:200}"
fi

# 6.3 /api/master without cookie → 401
clear_funnel_cookie
RAW=$(req POST "/api/master" '{"checkin":true}')
parse "$RAW"
if [[ "$STATUS" == "401" ]]; then
  pass "6.3 /api/master without cookie → 401"
else
  fail "6.3 /api/master without cookie expected 401, got ${STATUS}"
fi

# Re-establish cookie
req POST "/api/start/init" "{\"email\":\"${TRIAL_EMAIL}\",\"birthDate\":\"1988-09-17\",\"birthTime\":\"wu\",\"gender\":\"male\"}" > /dev/null

# 6.4 /api/master with cookie → not 401 (we abort the stream after 3s; just
# need to confirm the auth check passed). 200 with Content-Type SSE expected.
RAW=$(req POST "/api/master" '{"checkin":true}' "--max-time 3")
parse "$RAW"
# After 3s timeout we may get partial output but status code should be set.
# Curl returns 200 once headers are received even if stream is cut.
if [[ "$STATUS" == "200" ]]; then
  pass "6.4 /api/master with funnel cookie → 200 (auth OK)"
elif [[ -z "$STATUS" ]]; then
  # Connection cut before status flushed — check response wasn't an auth error
  if echo "$BODY" | grep -q "Unauthorized\|401"; then
    fail "6.4 /api/master with cookie returned auth error: $BODY"
  else
    pass "6.4 /api/master with funnel cookie → stream started (timed out cleanly)"
  fi
else
  fail "6.4 /api/master with cookie expected 200, got ${STATUS}"
fi

# =============================================================================
section "7. POST /api/start/complete — tentative → real user"
# =============================================================================

# 7.1 Without cookie → 401
clear_funnel_cookie
RAW=$(req POST "/api/start/complete" "{\"password\":\"${TRIAL_PASSWORD}\"}")
parse "$RAW"
if [[ "$STATUS" == "401" ]]; then
  pass "7.1 /api/start/complete without cookie → 401"
else
  fail "7.1 /api/start/complete without cookie expected 401, got ${STATUS}"
fi

# Re-establish cookie
req POST "/api/start/init" "{\"email\":\"${TRIAL_EMAIL}\",\"birthDate\":\"1988-09-17\",\"birthTime\":\"wu\",\"gender\":\"male\"}" > /dev/null

# 7.2 Weak password → 400
RAW=$(req POST "/api/start/complete" '{"password":"weak"}')
parse "$RAW"
if [[ "$STATUS" == "400" ]]; then
  pass "7.2 weak password → 400"
else
  fail "7.2 weak password expected 400, got ${STATUS}"
fi

# 7.3 Valid password → 200, success=true
RAW=$(req POST "/api/start/complete" "{\"password\":\"${TRIAL_PASSWORD}\"}")
parse "$RAW"
if [[ "$STATUS" == "200" ]]; then
  SUCCESS=$(json_field "$BODY" "success")
  EMAIL_ECHO=$(json_field "$BODY" "email")
  if [[ "$SUCCESS" == "True" || "$SUCCESS" == "true" ]] && [[ "$EMAIL_ECHO" == "$TRIAL_EMAIL" ]]; then
    pass "7.3 complete returns success + echoed email"
  else
    fail "7.3 complete body wrong: success='${SUCCESS}', email='${EMAIL_ECHO}'"
  fi
else
  fail "7.3 complete expected 200, got ${STATUS} — body: $BODY"
fi

# =============================================================================
section "8. After completion — funnel re-entry blocked"
# =============================================================================

# 8.1 Same email now triggers ALREADY_REGISTERED (tentative=false)
RAW=$(req POST "/api/start/init" "{\"email\":\"${TRIAL_EMAIL}\",\"birthDate\":\"1988-09-17\",\"birthTime\":\"wu\",\"gender\":\"male\"}")
parse "$RAW"
if [[ "$STATUS" == "409" ]]; then
  ERR_CODE=$(json_field "$BODY" "error")
  if [[ "$ERR_CODE" == "ALREADY_REGISTERED" ]]; then
    pass "8.1 completed email → 409 ALREADY_REGISTERED"
  else
    fail "8.1 status 409 but error code wrong: '${ERR_CODE}'"
  fi
else
  fail "8.1 completed email expected 409, got ${STATUS}"
fi

# 8.2 Replay /api/start/complete with the now-cleared cookie → 401
RAW=$(req POST "/api/start/complete" "{\"password\":\"${TRIAL_PASSWORD}\"}")
parse "$RAW"
if [[ "$STATUS" == "401" ]]; then
  pass "8.2 replay complete after success → 401 (cookie cleared)"
else
  fail "8.2 replay complete expected 401, got ${STATUS}"
fi

# =============================================================================
echo ""
echo -e "${BOLD}══════════════════════════════════════${NC}"
TOTAL=$((PASS + FAIL))
if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}✓ All ${PASS}/${TOTAL} funnel tests passed${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}${BOLD}✗ ${FAIL}/${TOTAL} tests failed${NC} (${PASS} passed, ${SKIP} skipped)"
  echo ""
  exit 1
fi
