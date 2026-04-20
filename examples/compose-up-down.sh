#!/usr/bin/env bash
#
# End-to-end demo of the Docker Compose preview stack.
#
# Brings up an isolated preview for PR #42, prints the dynamically assigned
# host ports, waits for Postgres to become healthy, and then tears everything
# down (including the database volume) so re-running the script is idempotent.
#
# Requirements: Docker 20.10+ and the Docker Compose plugin (`docker compose`).

set -euo pipefail

PR="${PR:-pr-42}"
COMPOSE_FILE="$(cd "$(dirname "$0")/.." && pwd)/docker-compose.preview.yml"

echo "==> Bringing up preview ${PR} using ${COMPOSE_FILE}"
COMPOSE_PROJECT_NAME="${PR}" docker compose -f "${COMPOSE_FILE}" up -d

echo "==> Waiting for Postgres to report healthy (up to 60s)..."
for _ in $(seq 1 30); do
  status="$(COMPOSE_PROJECT_NAME="${PR}" docker compose -f "${COMPOSE_FILE}" ps --format json db \
    | sed -n 's/.*"Health":"\([^"]*\)".*/\1/p' | head -n1 || true)"
  if [ "${status}" = "healthy" ]; then
    echo "    Postgres is healthy."
    break
  fi
  sleep 2
done

echo "==> Dynamically assigned host ports:"
COMPOSE_PROJECT_NAME="${PR}" docker compose -f "${COMPOSE_FILE}" port web 3000 || true
COMPOSE_PROJECT_NAME="${PR}" docker compose -f "${COMPOSE_FILE}" port api 4000 || true
COMPOSE_PROJECT_NAME="${PR}" docker compose -f "${COMPOSE_FILE}" port db 5432 || true

echo "==> Tearing preview ${PR} back down (removing volumes)"
COMPOSE_PROJECT_NAME="${PR}" docker compose -f "${COMPOSE_FILE}" down -v

echo "==> Done."
