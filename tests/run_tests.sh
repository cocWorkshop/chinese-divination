#!/bin/bash
# =============================================================================
# 玄机 (Xuanji) - Comprehensive API & Integration Test Suite
# =============================================================================

BASE_URL="${BASE_URL:-http://localhost:8094}"
PASS=0
FAIL=0
SKIP=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Unique test user (timestamp-based)
TS=$(date +%s)
TEST_EMAIL="testuser_${TS}@xuanji.test"
TEST_PASSWORD="testpass123"
TEST_NAME="Test User"
AUTH_COOKIE=""

section() { echo -e "\n${CYAN}${BOLD}══════════════════════════════════════${NC}"; echo -e "${CYAN}${BOLD}  $1${NC}"; echo -e "${CYAN}${BOLD}══════════════════════════════════════${NC}"; }
pass() { echo -e "  ${GREEN}✓${NC} $1"; ((PASS++)); }
fail() { echo -e "  ${RED}✗${NC} $1"; ((FAIL++)); }
skip() { echo -e "  ${YELLOW}○${NC} $1 (skipped)"; ((SKIP++)); }
info() { echo -e "  ${BLUE}ℹ${NC} $1"; }

# Helper: HTTP request
req() {
  local method="$1" url="$2" data="$3" extra_args="$4"
  curl -s -w "\n__STATUS__%{http_code}" \
    -X "$method" \
    -H "Content-Type: application/json" \
    ${AUTH_COOKIE:+-H "Cookie: $AUTH_COOKIE"} \
    ${data:+-d "$data"} \
    $extra_args \
    "${BASE_URL}${url}" 2>/dev/null
}

# Parse response: extract body and status
parse() {
  local raw="$1"
  BODY=$(echo "$raw" | sed 's/__STATUS__[0-9]*$//')
  STATUS=$(echo "$raw" | grep -o '__STATUS__[0-9]*' | grep -o '[0-9]*')
}

# Check JSON field
json_field() { echo "$1" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('$2',''))" 2>/dev/null; }
json_has() { echo "$1" | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if '$2' in d else 1)" 2>/dev/null; }

echo ""
echo -e "${BOLD}☯  玄机 Xuanji — Test Suite${NC}"
echo -e "   Target: ${BASE_URL}"
echo -e "   Time:   $(date)"
echo ""

# =============================================================================
section "1. Connectivity & Health"
# =============================================================================

# 1.1 Homepage responds
RAW=$(req GET "/")
parse "$RAW"
if [[ "$STATUS" == "200" ]]; then
  pass "1.1 Homepage returns HTTP 200"
else
  fail "1.1 Homepage expected 200, got ${STATUS:-no response}"
fi

# 1.2 HTML contains app name
if echo "$BODY" | grep -qi "xuanji\|玄机\|divination"; then
  pass "1.2 Homepage contains app identity"
else
  fail "1.2 Homepage missing app identity (no 'xuanji', '玄机', or 'divination')"
fi

# 1.3 Login page accessible
RAW=$(req GET "/login")
parse "$RAW"
if [[ "$STATUS" == "200" ]]; then
  pass "1.3 Login page returns HTTP 200"
else
  fail "1.3 Login page expected 200, got ${STATUS}"
fi

# 1.4 Register page accessible
RAW=$(req GET "/register")
parse "$RAW"
if [[ "$STATUS" == "200" ]]; then
  pass "1.4 Register page returns HTTP 200"
else
  fail "1.4 Register page expected 200, got ${STATUS}"
fi

# 1.5 Divination page accessible (may redirect to login)
RAW=$(req GET "/divination")
parse "$RAW"
if [[ "$STATUS" == "200" || "$STATUS" == "307" || "$STATUS" == "302" ]]; then
  pass "1.5 Divination page responds (${STATUS})"
else
  fail "1.5 Divination page expected 200/3xx, got ${STATUS}"
fi

# =============================================================================
section "2. User Registration API"
# =============================================================================

# 2.1 Valid registration
RAW=$(req POST "/api/register" "{\"name\":\"${TEST_NAME}\",\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")
parse "$RAW"
if [[ "$STATUS" == "201" ]]; then
  USER_ID=$(json_field "$BODY" "id")
  pass "2.1 Register new user → 201 (id: ${USER_ID:0:8}...)"
else
  fail "2.1 Register expected 201, got ${STATUS}. Body: ${BODY}"
fi

# 2.2 Duplicate email → 409
RAW=$(req POST "/api/register" "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")
parse "$RAW"
if [[ "$STATUS" == "409" ]]; then
  pass "2.2 Duplicate email → 409 Conflict"
else
  fail "2.2 Duplicate email expected 409, got ${STATUS}"
fi

# 2.3 Missing password → 400
RAW=$(req POST "/api/register" "{\"email\":\"nopass@test.com\"}")
parse "$RAW"
if [[ "$STATUS" == "400" ]]; then
  pass "2.3 Missing password → 400"
else
  fail "2.3 Missing password expected 400, got ${STATUS}"
fi

# 2.4 Short password → 400
RAW=$(req POST "/api/register" "{\"email\":\"short@test.com\",\"password\":\"123\"}")
parse "$RAW"
if [[ "$STATUS" == "400" ]]; then
  pass "2.4 Short password (<6 chars) → 400"
else
  fail "2.4 Short password expected 400, got ${STATUS}"
fi

# 2.5 Missing email → 400
RAW=$(req POST "/api/register" "{\"password\":\"testpass\"}")
parse "$RAW"
if [[ "$STATUS" == "400" ]]; then
  pass "2.5 Missing email → 400"
else
  fail "2.5 Missing email expected 400, got ${STATUS}"
fi

# =============================================================================
section "3. Authentication (NextAuth)"
# =============================================================================

# 3.1 Get CSRF token
info "Fetching CSRF token..."
CSRF_RAW=$(curl -s -c /tmp/xuanji_cookies.txt "${BASE_URL}/api/auth/csrf" 2>/dev/null)
CSRF_TOKEN=$(echo "$CSRF_RAW" | python3 -c "import json,sys; print(json.load(sys.stdin).get('csrfToken',''))" 2>/dev/null)
if [[ -n "$CSRF_TOKEN" ]]; then
  pass "3.1 CSRF token obtained: ${CSRF_TOKEN:0:16}..."
else
  fail "3.1 Could not get CSRF token. Response: ${CSRF_RAW:0:100}"
fi

# 3.2 Login with valid credentials
info "Attempting login..."
LOGIN_RAW=$(curl -s -w "\n__STATUS__%{http_code}" \
  -X POST \
  -b /tmp/xuanji_cookies.txt \
  -c /tmp/xuanji_cookies.txt \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=${TEST_EMAIL}&password=${TEST_PASSWORD}&csrfToken=${CSRF_TOKEN}&callbackUrl=%2Fdivination&json=true" \
  "${BASE_URL}/api/auth/callback/credentials" 2>/dev/null)
LOGIN_STATUS=$(echo "$LOGIN_RAW" | grep -o '__STATUS__[0-9]*' | grep -o '[0-9]*')
LOGIN_BODY=$(echo "$LOGIN_RAW" | sed 's/__STATUS__[0-9]*$//')

if [[ "$LOGIN_STATUS" == "200" || "$LOGIN_STATUS" == "302" ]]; then
  pass "3.2 Login with valid credentials → ${LOGIN_STATUS}"
else
  fail "3.2 Login expected 200/302, got ${LOGIN_STATUS}. Body: ${LOGIN_BODY:0:200}"
fi

# 3.3 Get session (check if authenticated)
SESSION_RAW=$(curl -s -b /tmp/xuanji_cookies.txt "${BASE_URL}/api/auth/session" 2>/dev/null)
SESSION_EMAIL=$(echo "$SESSION_RAW" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('user',{}).get('email',''))" 2>/dev/null)
if [[ "$SESSION_EMAIL" == "$TEST_EMAIL" ]]; then
  pass "3.3 Session valid — email matches (${SESSION_EMAIL})"
  # Extract session token for later API calls
  AUTH_COOKIE=$(cat /tmp/xuanji_cookies.txt 2>/dev/null | grep -E 'next-auth|authjs' | awk '{print $6"="$7}' | tr '\n' '; ' | head -c 500)
  info "Session cookie: ${AUTH_COOKIE:0:60}..."
else
  fail "3.3 Session check failed. Response: ${SESSION_RAW:0:200}"
  info "Will skip auth-required tests"
fi

# 3.4 Login with wrong password
CSRF2=$(curl -s -c /tmp/xuanji_bad.txt "${BASE_URL}/api/auth/csrf" | python3 -c "import json,sys; print(json.load(sys.stdin).get('csrfToken',''))" 2>/dev/null)
BAD_RAW=$(curl -s -w "\n__STATUS__%{http_code}" \
  -X POST \
  -b /tmp/xuanji_bad.txt \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=${TEST_EMAIL}&password=wrongpass&csrfToken=${CSRF2}&callbackUrl=%2F&json=true" \
  "${BASE_URL}/api/auth/callback/credentials" 2>/dev/null)
BAD_STATUS=$(echo "$BAD_RAW" | grep -o '__STATUS__[0-9]*' | grep -o '[0-9]*')
BAD_BODY=$(echo "$BAD_RAW" | sed 's/__STATUS__[0-9]*$//')
# NextAuth returns 200 with error URL or 302 redirect to error page on bad creds
if echo "$BAD_BODY" | grep -qi "error\|CredentialsSignin" || [[ "$BAD_STATUS" != "200" ]]; then
  pass "3.4 Login with wrong password → rejected (${BAD_STATUS})"
else
  fail "3.4 Wrong password should be rejected. Got ${BAD_STATUS}: ${BAD_BODY:0:100}"
fi

# =============================================================================
section "4. Protected Route Guards"
# =============================================================================

# 4.1 Unauthenticated readings GET → 401
RAW=$(req GET "/api/readings")
parse "$RAW"
if [[ "$STATUS" == "401" ]]; then
  pass "4.1 GET /api/readings without auth → 401"
else
  fail "4.1 Expected 401, got ${STATUS}"
fi

# 4.2 Unauthenticated divination POST → 401
RAW=$(req POST "/api/divination" '{"type":"iching","inputData":{"question":"test"}}')
parse "$RAW"
if [[ "$STATUS" == "401" ]]; then
  pass "4.2 POST /api/divination without auth → 401"
else
  fail "4.2 Expected 401, got ${STATUS}"
fi

# 4.3 Unauthenticated profile PUT → 401
RAW=$(req PUT "/api/profile" '{"name":"test"}')
parse "$RAW"
if [[ "$STATUS" == "401" ]]; then
  pass "4.3 PUT /api/profile without auth → 401"
else
  fail "4.3 Expected 401, got ${STATUS}"
fi

# =============================================================================
section "5. Readings API (Authenticated)"
# =============================================================================

if [[ -n "$SESSION_EMAIL" ]]; then
  # 5.1 GET readings (empty at start)
  READINGS_RAW=$(curl -s -b /tmp/xuanji_cookies.txt "${BASE_URL}/api/readings" 2>/dev/null)
  READINGS_COUNT=$(echo "$READINGS_RAW" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('readings',[])))" 2>/dev/null)
  if [[ "$READINGS_COUNT" == "0" ]]; then
    pass "5.1 GET /api/readings → empty array for new user"
  elif [[ "$READINGS_COUNT" =~ ^[0-9]+$ ]]; then
    pass "5.1 GET /api/readings → ${READINGS_COUNT} readings"
  else
    fail "5.1 GET /api/readings unexpected response: ${READINGS_RAW:0:100}"
  fi

  # 5.2 POST /api/divination — missing type → 400
  BAD_DIV=$(curl -s -w "\n__STATUS__%{http_code}" \
    -X POST \
    -b /tmp/xuanji_cookies.txt \
    -H "Content-Type: application/json" \
    -d '{"inputData":{"question":"test"}}' \
    "${BASE_URL}/api/divination" 2>/dev/null)
  BD_STATUS=$(echo "$BAD_DIV" | grep -o '__STATUS__[0-9]*' | grep -o '[0-9]*')
  if [[ "$BD_STATUS" == "400" ]]; then
    pass "5.2 POST /api/divination missing type → 400"
  else
    fail "5.2 Expected 400, got ${BD_STATUS}"
  fi

  # 5.3 POST /api/divination — missing inputData → 400
  BAD_DIV2=$(curl -s -w "\n__STATUS__%{http_code}" \
    -X POST \
    -b /tmp/xuanji_cookies.txt \
    -H "Content-Type: application/json" \
    -d '{"type":"iching"}' \
    "${BASE_URL}/api/divination" 2>/dev/null)
  BD2_STATUS=$(echo "$BAD_DIV2" | grep -o '__STATUS__[0-9]*' | grep -o '[0-9]*')
  if [[ "$BD2_STATUS" == "400" ]]; then
    pass "5.3 POST /api/divination missing inputData → 400"
  else
    fail "5.3 Expected 400, got ${BD2_STATUS}"
  fi

  # 5.4 POST /api/divination — no API key → 503
  info "Testing divination without API key (expect 503)..."
  DIV_RAW=$(curl -s -w "\n__STATUS__%{http_code}" \
    -X POST \
    -b /tmp/xuanji_cookies.txt \
    -H "Content-Type: application/json" \
    -d '{"type":"iching","inputData":{"question":"Will my project succeed?","hexagram":42},"language":"zh"}' \
    "${BASE_URL}/api/divination" 2>/dev/null)
  DIV_STATUS=$(echo "$DIV_RAW" | grep -o '__STATUS__[0-9]*' | grep -o '[0-9]*')
  DIV_BODY=$(echo "$DIV_RAW" | sed 's/__STATUS__[0-9]*$//')
  if [[ "$DIV_STATUS" == "503" || "$DIV_STATUS" == "402" ]]; then
    pass "5.4 Divination API error correctly handled → ${DIV_STATUS}"
    DIV_SKIPPED=true
  elif [[ "$DIV_STATUS" == "200" ]]; then
    READING_ID=$(echo "$DIV_BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('reading',{}).get('id',''))" 2>/dev/null)
    pass "5.4 Divination with API key → 200 (reading id: ${READING_ID:0:8}...)"
    DIV_SKIPPED=false
  else
    fail "5.4 Unexpected divination response: ${DIV_STATUS}. Body: ${DIV_BODY:0:200}"
    DIV_SKIPPED=true
  fi

  # 5.5 DELETE a reading (need a reading ID first)
  if [[ "$DIV_SKIPPED" == "false" && -n "$READING_ID" ]]; then
    DEL_RAW=$(curl -s -w "\n__STATUS__%{http_code}" \
      -X DELETE \
      -b /tmp/xuanji_cookies.txt \
      "${BASE_URL}/api/readings/${READING_ID}" 2>/dev/null)
    DEL_STATUS=$(echo "$DEL_RAW" | grep -o '__STATUS__[0-9]*' | grep -o '[0-9]*')
    if [[ "$DEL_STATUS" == "200" ]]; then
      pass "5.5 DELETE /api/readings/${READING_ID:0:8}... → 200"
    else
      fail "5.5 DELETE reading expected 200, got ${DEL_STATUS}"
    fi
  else
    skip "5.5 DELETE reading (no reading to delete)"
  fi
else
  skip "5.1-5.5 (Skipped: user not authenticated)"
fi

# =============================================================================
section "6. Profile API (Authenticated)"
# =============================================================================

if [[ -n "$SESSION_EMAIL" ]]; then
  # 6.1 Update profile fields
  PROFILE_RAW=$(curl -s -w "\n__STATUS__%{http_code}" \
    -X PUT \
    -b /tmp/xuanji_cookies.txt \
    -H "Content-Type: application/json" \
    -d '{"name":"Updated Name","birthDate":"1988-09-17","birthTime":"子时","birthPlace":"Henan, China","gender":"male","language":"zh"}' \
    "${BASE_URL}/api/profile" 2>/dev/null)
  PROFILE_STATUS=$(echo "$PROFILE_RAW" | grep -o '__STATUS__[0-9]*' | grep -o '[0-9]*')
  PROFILE_BODY=$(echo "$PROFILE_RAW" | sed 's/__STATUS__[0-9]*$//')
  if [[ "$PROFILE_STATUS" == "200" ]]; then
    pass "6.1 PUT /api/profile → 200 (profile updated)"
  else
    fail "6.1 Profile update expected 200, got ${PROFILE_STATUS}. Body: ${PROFILE_BODY:0:100}"
  fi

  # 6.2 Change password — wrong current password → 400
  PW_RAW=$(curl -s -w "\n__STATUS__%{http_code}" \
    -X PUT \
    -b /tmp/xuanji_cookies.txt \
    -H "Content-Type: application/json" \
    -d '{"newPassword":"newpass123","currentPassword":"wrongoldpass"}' \
    "${BASE_URL}/api/profile" 2>/dev/null)
  PW_STATUS=$(echo "$PW_RAW" | grep -o '__STATUS__[0-9]*' | grep -o '[0-9]*')
  if [[ "$PW_STATUS" == "400" ]]; then
    pass "6.2 Change password with wrong current → 400"
  else
    fail "6.2 Wrong current password expected 400, got ${PW_STATUS}"
  fi

  # 6.3 Change password — missing currentPassword → 400
  PW_RAW2=$(curl -s -w "\n__STATUS__%{http_code}" \
    -X PUT \
    -b /tmp/xuanji_cookies.txt \
    -H "Content-Type: application/json" \
    -d '{"newPassword":"newpass123"}' \
    "${BASE_URL}/api/profile" 2>/dev/null)
  PW2_STATUS=$(echo "$PW_RAW2" | grep -o '__STATUS__[0-9]*' | grep -o '[0-9]*')
  if [[ "$PW2_STATUS" == "400" ]]; then
    pass "6.3 Change password without currentPassword → 400"
  else
    fail "6.3 Expected 400, got ${PW2_STATUS}"
  fi

  # 6.4 Change password — correct current → 200
  PW_RAW3=$(curl -s -w "\n__STATUS__%{http_code}" \
    -X PUT \
    -b /tmp/xuanji_cookies.txt \
    -H "Content-Type: application/json" \
    -d "{\"newPassword\":\"newpass456\",\"currentPassword\":\"${TEST_PASSWORD}\"}" \
    "${BASE_URL}/api/profile" 2>/dev/null)
  PW3_STATUS=$(echo "$PW_RAW3" | grep -o '__STATUS__[0-9]*' | grep -o '[0-9]*')
  if [[ "$PW3_STATUS" == "200" ]]; then
    pass "6.4 Change password with correct current → 200"
  else
    fail "6.4 Password change expected 200, got ${PW3_STATUS}"
  fi
else
  skip "6.1-6.4 (Skipped: user not authenticated)"
fi

# =============================================================================
section "7. Divination Reference Files"
# =============================================================================

# Check via docker exec that ref files exist in container
CONTAINER=$(docker ps --format '{{.Names}}' | grep chinese-divination | head -1)
if [[ -n "$CONTAINER" ]]; then
  for reffile in bazi.md iching.md ziwei.md qimen.md fengshui.md others.md; do
    EXISTS=$(docker exec "$CONTAINER" test -f "/app/divination-refs/${reffile}" && echo "yes" || echo "no")
    if [[ "$EXISTS" == "yes" ]]; then
      pass "7.x Reference file exists in container: ${reffile}"
    else
      fail "7.x Reference file MISSING in container: ${reffile}"
    fi
  done
else
  skip "7.x Docker container not found (skipping ref file checks)"
fi

# =============================================================================
section "8. Database Integrity"
# =============================================================================

# 8.1 User was created in DB
DB_CHECK=$(PGPASSWORD=postgres psql -U postgres -h 127.0.0.1 -d divination_db -t -c "SELECT COUNT(*) FROM \"User\" WHERE email='${TEST_EMAIL}';" 2>/dev/null | tr -d ' ')
if [[ "$DB_CHECK" == "1" ]]; then
  pass "8.1 User exists in PostgreSQL (divination_db)"
else
  fail "8.1 User not found in DB (count: ${DB_CHECK})"
fi

# 8.2 Tables exist
TABLES=$(PGPASSWORD=postgres psql -U postgres -h 127.0.0.1 -d divination_db -t -c "\dt" 2>/dev/null)
if echo "$TABLES" | grep -qi "user"; then
  pass "8.2 User table exists in DB"
else
  fail "8.2 User table missing"
fi
if echo "$TABLES" | grep -qi "reading"; then
  pass "8.3 Reading table exists in DB"
else
  fail "8.3 Reading table missing"
fi

# 8.4 User password is hashed (not plaintext)
PW_VALUE=$(PGPASSWORD=postgres psql -U postgres -h 127.0.0.1 -d divination_db -t -c "SELECT password FROM \"User\" WHERE email='${TEST_EMAIL}';" 2>/dev/null | tr -d ' \n')
if [[ "${PW_VALUE:0:7}" == "\$2b\$12\$" || "${PW_VALUE:0:4}" == "\$2b\$" || "${PW_VALUE:0:4}" == "\$2a\$" ]]; then
  pass "8.4 Password stored as bcrypt hash"
else
  fail "8.4 Password not properly hashed: ${PW_VALUE:0:20}"
fi

# =============================================================================
section "9. Static Assets & Pages"
# =============================================================================

for path in "/divination" "/dashboard" "/profile"; do
  RAW=$(curl -s -w "\n__STATUS__%{http_code}" -L -b /tmp/xuanji_cookies.txt "${BASE_URL}${path}" 2>/dev/null)
  S=$(echo "$RAW" | grep -o '__STATUS__[0-9]*' | grep -o '[0-9]*')
  if [[ "$S" == "200" ]]; then
    pass "9.x Page ${path} → 200"
  else
    fail "9.x Page ${path} → ${S}"
  fi
done

# =============================================================================
section "10. Docker Health"
# =============================================================================

# 10.1 Container is running
if docker ps | grep -q chinese-divination; then
  pass "10.1 Docker container 'chinese-divination' is running"
else
  fail "10.1 Container not running"
fi

# 10.2 Port binding: host network mode — app listens directly on host port 8094
NETWORK_MODE=$(docker inspect chinese-divination --format '{{.HostConfig.NetworkMode}}' 2>/dev/null)
APP_PORT=$(docker inspect chinese-divination --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep '^PORT=' | cut -d= -f2)
if [[ "$NETWORK_MODE" == "host" && "$APP_PORT" == "8094" ]]; then
  pass "10.2 Host network mode, PORT=8094 (direct binding)"
elif docker ps | grep -q "8094->3000"; then
  pass "10.2 Port 8094→3000 mapped correctly"
else
  fail "10.2 Port config unexpected: network=${NETWORK_MODE} PORT=${APP_PORT}"
fi

# 10.3 Container restart policy
RESTART=$(docker inspect chinese-divination --format '{{.HostConfig.RestartPolicy.Name}}' 2>/dev/null)
if [[ "$RESTART" == "unless-stopped" ]]; then
  pass "10.3 Restart policy: unless-stopped ✓"
else
  fail "10.3 Restart policy: ${RESTART} (expected unless-stopped)"
fi

# 10.4 No recent crash restarts
RESTARTS=$(docker inspect chinese-divination --format '{{.RestartCount}}' 2>/dev/null)
if [[ "$RESTARTS" == "0" ]]; then
  pass "10.4 No container restarts (stable)"
else
  fail "10.4 Container has restarted ${RESTARTS} times"
fi

# =============================================================================

# =============================================================================
section "11. Rate Limiting"
# =============================================================================

TS2=$(date +%s)
RL_EMAIL="ratelimit_${TS2}@xuanji.test"

# Create a user with quota=2 for testing
REG=$(curl -s -X POST http://localhost:8094/api/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${RL_EMAIL}\",\"password\":\"testpass123\"}" 2>/dev/null)
RL_UID=$(echo "$REG" | python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)

if [[ -n "$RL_UID" ]]; then
  # Set quota to 2
  PGPASSWORD=postgres psql -U postgres -h 127.0.0.1 -d divination_db -q \
    -c "UPDATE \"User\" SET \"hourlyQuota\" = 2 WHERE id = '${RL_UID}';" 2>/dev/null

  # Login
  CSRF_RL=$(curl -s -c /tmp/rl_cookies.txt http://localhost:8094/api/auth/csrf 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('csrfToken',''))" 2>/dev/null)
  curl -s -c /tmp/rl_cookies.txt -b /tmp/rl_cookies.txt -X POST \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "email=${RL_EMAIL}&password=testpass123&csrfToken=${CSRF_RL}&callbackUrl=%2F&json=true" \
    http://localhost:8094/api/auth/callback/credentials > /dev/null 2>&1

  # Requests 1 and 2 should hit rate limiter (no API key = 503, not 429)
  # Requests 3+ should return 429 rate limited
  for i in 1 2 3; do
    R=$(curl -s -w "\n__STATUS__%{http_code}" -X POST \
      -b /tmp/rl_cookies.txt \
      -H "Content-Type: application/json" \
      -d '{"type":"iching","inputData":{"question":"test"},"language":"zh"}' \
      http://localhost:8094/api/divination 2>/dev/null)
    ST=$(echo "$R" | grep -o '__STATUS__[0-9]*' | grep -o '[0-9]*')
    if [[ "$i" -le 2 ]]; then
      # Should pass rate limit but fail on AI (402/503)
      if [[ "$ST" == "402" || "$ST" == "503" || "$ST" == "200" ]]; then
        pass "11.${i} Request ${i}/2 within quota → ${ST} (not rate-limited)"
      else
        fail "11.${i} Request ${i}/2 expected 402/503/200, got ${ST}"
      fi
    else
      # Request 3 exceeds quota=2 → must be 429
      if [[ "$ST" == "429" ]]; then
        BODY=$(echo "$R" | sed 's/__STATUS__[0-9]*$//')
        RESET=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('resetAt','')[:16])" 2>/dev/null)
        pass "11.${i} Request ${i}/2 exceeds quota → 429 (resets at: ${RESET})"
      else
        fail "11.${i} Request ${i}/2 expected 429, got ${ST}"
      fi
    fi
  done

  # 11.4 Admin bypass — admin should not be rate-limited
  if [[ -n "$SESSION_EMAIL" ]]; then
    # Drain the admin's quota first by checking (admin should always pass)
    PGPASSWORD=postgres psql -U postgres -h 127.0.0.1 -d divination_db -q \
      -c "UPDATE \"User\" SET \"hourlyQuota\" = 0 WHERE email = '${TEST_EMAIL}';" 2>/dev/null
    PGPASSWORD=postgres psql -U postgres -h 127.0.0.1 -d divination_db -q \
      -c "UPDATE \"User\" SET \"isAdmin\" = true WHERE email = '${TEST_EMAIL}';" 2>/dev/null

    ADM=$(curl -s -w "\n__STATUS__%{http_code}" -X POST \
      -b /tmp/xuanji_cookies.txt \
      -H "Content-Type: application/json" \
      -d '{"type":"iching","inputData":{"question":"admin bypass test"},"language":"zh"}' \
      http://localhost:8094/api/divination 2>/dev/null)
    ADM_ST=$(echo "$ADM" | grep -o '__STATUS__[0-9]*' | grep -o '[0-9]*')
    if [[ "$ADM_ST" != "429" ]]; then
      pass "11.4 Admin bypasses rate limit (quota=0, got ${ADM_ST} not 429)"
    else
      fail "11.4 Admin should bypass rate limit, got 429"
    fi
    # Restore
    PGPASSWORD=postgres psql -U postgres -h 127.0.0.1 -d divination_db -q \
      -c "UPDATE \"User\" SET \"isAdmin\" = false, \"hourlyQuota\" = 10 WHERE email = '${TEST_EMAIL}';" 2>/dev/null
  else
    skip "11.4 Admin bypass (no session)"
  fi

  rm -f /tmp/rl_cookies.txt
  PGPASSWORD=postgres psql -U postgres -h 127.0.0.1 -d divination_db -q \
    -c "DELETE FROM \"User\" WHERE email = '${RL_EMAIL}';" 2>/dev/null
else
  skip "11.1-11.4 Rate limit tests (could not create test user)"
fi

# =============================================================================
section "12. Admin API"
# =============================================================================

if [[ -n "$SESSION_EMAIL" ]]; then
  # Make test user admin temporarily
  PGPASSWORD=postgres psql -U postgres -h 127.0.0.1 -d divination_db -q \
    -c "UPDATE \"User\" SET \"isAdmin\" = true WHERE email = '${TEST_EMAIL}';" 2>/dev/null

  # 12.1 GET /api/admin/stats
  STATS=$(curl -s -b /tmp/xuanji_cookies.txt http://localhost:8094/api/admin/stats 2>/dev/null)
  if echo "$STATS" | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'totalUsers' in d" 2>/dev/null; then
    TU=$(echo "$STATS" | python3 -c "import json,sys; print(json.load(sys.stdin)['totalUsers'])" 2>/dev/null)
    pass "12.1 GET /api/admin/stats → 200 (totalUsers: ${TU})"
  else
    fail "12.1 GET /api/admin/stats failed: ${STATS:0:100}"
  fi

  # 12.2 Non-admin cannot access /api/admin/stats
  PGPASSWORD=postgres psql -U postgres -h 127.0.0.1 -d divination_db -q \
    -c "UPDATE \"User\" SET \"isAdmin\" = false WHERE email = '${TEST_EMAIL}';" 2>/dev/null
  UNAUTH=$(curl -s -w "\n__STATUS__%{http_code}" -b /tmp/xuanji_cookies.txt \
    http://localhost:8094/api/admin/stats 2>/dev/null)
  UNAUTH_ST=$(echo "$UNAUTH" | grep -o '__STATUS__[0-9]*' | grep -o '[0-9]*')
  if [[ "$UNAUTH_ST" == "403" ]]; then
    pass "12.2 Non-admin GET /api/admin/stats → 403"
  else
    fail "12.2 Non-admin expected 403, got ${UNAUTH_ST}"
  fi

  # 12.3 Admin settings PUT
  PGPASSWORD=postgres psql -U postgres -h 127.0.0.1 -d divination_db -q \
    -c "UPDATE \"User\" SET \"isAdmin\" = true WHERE email = '${TEST_EMAIL}';" 2>/dev/null
  SET_R=$(curl -s -w "\n__STATUS__%{http_code}" -X PUT \
    -b /tmp/xuanji_cookies.txt \
    -H "Content-Type: application/json" \
    -d '{"defaultHourlyQuota":"15"}' \
    http://localhost:8094/api/admin/settings 2>/dev/null)
  SET_ST=$(echo "$SET_R" | grep -o '__STATUS__[0-9]*' | grep -o '[0-9]*')
  if [[ "$SET_ST" == "200" ]]; then
    pass "12.3 PUT /api/admin/settings → 200"
    # Restore
    curl -s -X PUT -b /tmp/xuanji_cookies.txt \
      -H "Content-Type: application/json" \
      -d '{"defaultHourlyQuota":"10"}' \
      http://localhost:8094/api/admin/settings > /dev/null 2>&1
  else
    fail "12.3 Settings update expected 200, got ${SET_ST}"
  fi

  # 12.4 Admin users list
  USERS_R=$(curl -s -b /tmp/xuanji_cookies.txt http://localhost:8094/api/admin/users 2>/dev/null)
  if echo "$USERS_R" | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'users' in d" 2>/dev/null; then
    UC=$(echo "$USERS_R" | python3 -c "import json,sys; print(json.load(sys.stdin)['total'])" 2>/dev/null)
    pass "12.4 GET /api/admin/users → 200 (${UC} users)"
  else
    fail "12.4 GET /api/admin/users failed"
  fi

  # 12.5 Admin pages accessible
  for apath in "/admin" "/admin/users" "/admin/settings"; do
    AP=$(curl -s -o /dev/null -w "%{http_code}" -L -b /tmp/xuanji_cookies.txt http://localhost:8094${apath})
    if [[ "$AP" == "200" ]]; then
      pass "12.5 Admin page ${apath} → 200"
    else
      fail "12.5 Admin page ${apath} → ${AP}"
    fi
  done

  # Clean up admin role from test user
  PGPASSWORD=postgres psql -U postgres -h 127.0.0.1 -d divination_db -q \
    -c "UPDATE \"User\" SET \"isAdmin\" = false WHERE email = '${TEST_EMAIL}';" 2>/dev/null
else
  skip "12.1-12.5 Admin tests (no session)"
fi

# CLEANUP
# =============================================================================

rm -f /tmp/xuanji_cookies.txt /tmp/xuanji_bad.txt

# =============================================================================
# SUMMARY
# =============================================================================

TOTAL=$((PASS + FAIL + SKIP))
echo ""
echo -e "${BOLD}══════════════════════════════════════${NC}"
echo -e "${BOLD}  Results: ${GREEN}${PASS} passed${NC} | ${RED}${FAIL} failed${NC} | ${YELLOW}${SKIP} skipped${NC} | Total: ${TOTAL}"
echo -e "${BOLD}══════════════════════════════════════${NC}"

if [[ "$FAIL" -gt 0 ]]; then
  echo -e "\n${RED}${BOLD}Some tests failed. See details above.${NC}\n"
  exit 1
  echo -e "\n${GREEN}${BOLD}All tests passed! ☯${NC}\n"
  exit 0
fi
