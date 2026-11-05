#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

TARGETS=(
  "hustlehub-backend/src"
  "hustlehub-frontend/src"
)

# Optional individual files if present
for extra in "hustlehub-backend/Dockerfile" "hustlehub-frontend/Dockerfile" "hustlehub-backend/nginx.conf" "hustlehub-frontend/nginx.conf"; do
  if [[ -f "$extra" ]]; then
    TARGETS+=("$extra")
  fi
done

MATCHES=$(grep -rn "REMOVE BEFORE COMMIT" "${TARGETS[@]}" 2>/dev/null || true)

if [[ -n "$MATCHES" ]]; then
  echo "ERROR: Found leftover 'REMOVE BEFORE COMMIT' tags in source files:"
  echo "$MATCHES"
  echo ""
  echo "All team members must clean up their OWNER headers before committing to main."
  exit 1
else
  echo "SUCCESS: No 'REMOVE BEFORE COMMIT' tags found."
  exit 0
fi
