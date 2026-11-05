#!/usr/bin/env bash
set -euo pipefail

# scripts/ci-newman.sh
# Runs integration and security tests against the containerized stack using Newman.
#
# WHY THERE ARE TWO PHASES:
# The auth rate limiter enforces a strict threshold (5 requests per 15 minutes per IP)
# covering both registration and login endpoints. The functional test folders (Authentication & Setup,
# Gigs, Bookings, Transactions, Account Lockout, Logout, Tax Summary) make far more than 5 authentication
# requests. Running all folders sequentially against strict limits causes functional tests to prematurely
# hit 429 RATE_LIMITED.
#
# Phase 1: Spins up the stack with raised rate limits (1000) to execute all functional integration tests.
# Phase 2: Recreates the API container with default production rate limits (5 and 10) to test that
#          rapid brute-force attempts strictly trigger HTTP 429 RATE_LIMITED on the 6th attempt.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

export CI_JWT_SECRET="${CI_JWT_SECRET:-$(openssl rand -hex 32)}"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.ci.yml"

# Locate newman or fall back to npx
if command -v newman >/dev/null 2>&1; then
  NEWMAN="newman"
else
  NEWMAN="npx --yes newman@6"
fi

COLLECTION="hustlehub-backend/postman/HustleHub-Part3.postman_collection.json"
ENVIRONMENT="hustlehub-backend/postman/HustleHub-Part3.postman_environment.json"

echo "=== PHASE 1: Functional Integration Tests (Raised Rate Limits) ==="
AUTH_RATE_LIMIT_MAX=1000 BOOKING_RATE_LIMIT_MAX=1000 $COMPOSE up -d --build --wait

echo "Running Phase 1 folders: 1, 2, 3, 4, 6, 7, 8..."
$NEWMAN run "${COLLECTION}" \
  -e "${ENVIRONMENT}" \
  --insecure \
  --folder "1. Authentication & Setup" \
  --folder "2. Gigs" \
  --folder "3. Bookings" \
  --folder "4. Transactions" \
  --folder "6. Account lockout" \
  --folder "7. Logout and token revocation" \
  --folder "8. Tax summary" \
  --reporters cli,junit \
  --reporter-junit-export newman-phase1.xml

echo "=== PHASE 2: Rate Limiting Security Tests (Strict Default Limits) ==="
# Recreate the API container without raised env limits so defaults (5 and 10) apply
# and in-memory rate-limiter counters are reset.
$COMPOSE up -d --force-recreate --no-deps --wait api

echo "Running Phase 2 folder: 5. Rate Limiting..."
$NEWMAN run "${COLLECTION}" \
  -e "${ENVIRONMENT}" \
  --insecure \
  --folder "5. Rate Limiting" \
  --reporters cli,junit \
  --reporter-junit-export newman-phase2.xml

echo "All Newman phases completed successfully!"
