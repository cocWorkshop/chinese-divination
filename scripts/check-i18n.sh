#!/usr/bin/env bash
# i18n guard — fails when someone re-declares a local bilingual `const T = (`
# helper instead of importing the canonical one from src/lib/i18n.
# (34 duplicated copies were consolidated on 2026-06-12 — keep it that way.)
#
# Usage: ./scripts/check-i18n.sh   (exit 0 = clean, exit 1 = violations listed)

set -uo pipefail
cd "$(dirname "$0")/.."

violations=$(grep -rn --include='*.ts' --include='*.tsx' 'const T = (' src | grep -v 'src/lib/i18n' || true)

if [ -n "$violations" ]; then
  echo "✗ Local bilingual T() helpers found — import { T } from '@/lib/i18n' instead:"
  echo "$violations"
  exit 1
fi

echo "✓ i18n check passed — no local T() re-declarations."
