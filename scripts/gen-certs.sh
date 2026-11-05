#!/usr/bin/env bash
set -euo pipefail
export MSYS_NO_PATHCONV=1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

CERTS_DIR="certs/docker"
KEY_FILE="${CERTS_DIR}/api.key"
CRT_FILE="${CERTS_DIR}/api.crt"

FORCE=false
for arg in "$@"; do
  if [[ "$arg" == "--force" ]]; then
    FORCE=true
  fi
done

if [[ -f "$KEY_FILE" && -f "$CRT_FILE" && "$FORCE" != "true" ]]; then
  echo "Certificates already exist in ${CERTS_DIR}. Skipping generation (use --force to overwrite)."
  exit 0
fi

mkdir -p "${CERTS_DIR}"

echo "Generating self-signed development certificates for Docker..."
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "${KEY_FILE}" \
  -out "${CRT_FILE}" \
  -days 365 \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:api,IP:127.0.0.1"

# chmod 644 on api.key: this is a throwaway local certificate for containerized
# development and testing. The container's non-root 'node' user (uid 1000)
# must be able to read the bind-mounted key file.
chmod 644 "${KEY_FILE}" 2>/dev/null || true
chmod 644 "${CRT_FILE}" 2>/dev/null || true

echo "Certificates generated successfully:"
echo "  Private key: ${KEY_FILE}"
echo "  Certificate: ${CRT_FILE}"
