#!/usr/bin/env bash
# start.sh – Start all PlateMate Backend services
set -euo pipefail

# ─── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

# ─── Helpers ──────────────────────────────────────────────────────────────────
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }

# ─── Locate project root (directory containing docker-compose.yml) ─────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║   🚀  PlateMate Backend – Starting…      ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════╝${RESET}"

# ─── Pre-flight checks ────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    error "Docker is not installed. See SETUP.md for installation instructions."
    exit 1
fi

if ! docker info &>/dev/null; then
    error "Docker daemon is not running. Please start Docker and try again."
    exit 1
fi

if ! command -v docker &>/dev/null || ! docker compose version &>/dev/null 2>&1; then
    if ! command -v docker-compose &>/dev/null; then
        error "Docker Compose is not installed. See SETUP.md for installation instructions."
        exit 1
    fi
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

if [ ! -f ".env" ]; then
    warn ".env file not found. Using default values from docker-compose.yml."
    warn "Run: cp .env.example .env  then edit .env for production settings."
fi

# ─── Build & start ────────────────────────────────────────────────────────────
info "Building images (this may take a few minutes on first run)…"
${COMPOSE_CMD} build --parallel

info "Starting all services in detached mode…"
${COMPOSE_CMD} up -d

# ─── Wait for infrastructure services ────────────────────────────────────────
info "Waiting for RabbitMQ to become healthy…"
TIMEOUT=60; ELAPSED=0
until ${COMPOSE_CMD} ps rabbitmq | grep -q "healthy" 2>/dev/null; do
    sleep 3; ELAPSED=$((ELAPSED + 3))
    if [ "${ELAPSED}" -ge "${TIMEOUT}" ]; then
        warn "RabbitMQ health check timed out. Services may still be starting."
        break
    fi
done
success "RabbitMQ is ready."

info "Waiting for databases to become healthy…"
for db in postgres_db1 postgres_db2 postgres_db3 postgres_db4 postgres_db5; do
    ELAPSED=0
    until ${COMPOSE_CMD} ps "${db}" | grep -q "healthy" 2>/dev/null; do
        sleep 3; ELAPSED=$((ELAPSED + 3))
        if [ "${ELAPSED}" -ge "${TIMEOUT}" ]; then
            warn "${db} health check timed out. It may still be initialising."
            break
        fi
    done
    success "${db} is ready."
done

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}✅  All services started!${RESET}"
echo ""
echo -e "${BOLD}Service endpoints:${RESET}"
echo -e "  user-location-service   → http://localhost:3001"
echo -e "  food-inventory-service  → http://localhost:3002"
echo -e "  claim-service           → http://localhost:3003"
echo -e "  reputation-service      → http://localhost:3004"
echo -e "  messaging-service       → http://localhost:3005"
echo -e "  RabbitMQ management UI  → http://localhost:15672  (guest/guest)"
echo ""
echo -e "Run ${CYAN}./scripts/status.sh${RESET} to check service health."
echo -e "Run ${CYAN}./scripts/logs.sh${RESET}   to tail live logs."
