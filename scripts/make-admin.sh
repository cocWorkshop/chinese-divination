#!/bin/bash
# Usage: bash scripts/make-admin.sh user@email.com
EMAIL="$1"
if [ -z "$EMAIL" ]; then
  echo "Usage: $0 <email>"
  exit 1
fi
RESULT=$(PGPASSWORD=postgres psql -U postgres -h 127.0.0.1 -d divination_db -t -c \
  "UPDATE \"User\" SET \"isAdmin\" = true WHERE email = '${EMAIL}' RETURNING email;")
if echo "$RESULT" | grep -q "@"; then
  echo "✅ Admin granted to: ${EMAIL}"
else
  echo "❌ User not found: ${EMAIL}"
fi
