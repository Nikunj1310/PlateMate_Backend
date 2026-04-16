#!/usr/bin/env bash
# stop.sh – Stop all PlateMate Backend services gracefully
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

echo -e "${BOLD}${YELLOW}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${YELLOW}║   🛑  PlateMate Backend – Stopping…      ║${RESET}"
echo -e "${BOLD}${YELLOW}╚══════════════════════════════════════════╝${RESET}"

if ! command -v docker &>/dev/null; then
    error "Docker is not installed."; exit 1
fi

if docker compose version &>/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
    COMPOSE_CMD="docker-compose"
else
    error "Docker Compose is not installed."; exit 1
fi

info "Stopping all services (data volumes are preserved)…"
${COMPOSE_CMD} stop

success "All services stopped."
echo ""
echo -e "Database volumes have been preserved. Run ${CYAN}./scripts/start.sh${RESET} to bring services back up."
echo -e "To also remove containers, run: ${YELLOW}${COMPOSE_CMD} down${RESET}"
