#!/usr/bin/env bash
# restart.sh – Restart all (or specific) PlateMate Backend services
# Usage: ./scripts/restart.sh [service-name]
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

SERVICE="${1:-}"

if [ -n "${SERVICE}" ]; then
    echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${RESET}"
    echo -e "${BOLD}${CYAN}║   🔄  PlateMate Backend – Restarting ${SERVICE}…${RESET}"
    echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${RESET}"
else
    echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════╗${RESET}"
    echo -e "${BOLD}${CYAN}║   🔄  PlateMate Backend – Restarting…    ║${RESET}"
    echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════╝${RESET}"
fi

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

if [ -n "${SERVICE}" ]; then
    info "Restarting service: ${SERVICE}"
    ${COMPOSE_CMD} restart "${SERVICE}"
    success "${SERVICE} restarted."
else
    info "Stopping all services…"
    ${COMPOSE_CMD} stop

    info "Starting all services…"
    ${COMPOSE_CMD} up -d

    success "All services restarted."
    echo ""
    echo -e "Run ${CYAN}./scripts/status.sh${RESET} to verify health."
fi
