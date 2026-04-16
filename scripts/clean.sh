#!/usr/bin/env bash
# clean.sh – Remove stopped containers, dangling images and build cache
# Usage: ./scripts/clean.sh [--volumes]
#   --volumes  also removes Docker volumes (WARNING: deletes database data!)
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

REMOVE_VOLUMES=false
for arg in "$@"; do
    case "${arg}" in
        --volumes|-v) REMOVE_VOLUMES=true ;;
        *) error "Unknown argument: ${arg}"; exit 1 ;;
    esac
done

echo -e "${BOLD}${YELLOW}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${YELLOW}║   🧹  PlateMate Backend – Cleanup        ║${RESET}"
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

if [ "${REMOVE_VOLUMES}" = "true" ]; then
    warn "⚠️  --volumes flag detected. This will DELETE all database data!"
    echo -n "  Are you sure? Type 'yes' to confirm: "
    read -r CONFIRM
    if [ "${CONFIRM}" != "yes" ]; then
        info "Aborted."
        exit 0
    fi
    info "Removing containers, networks and volumes…"
    ${COMPOSE_CMD} down --volumes --remove-orphans
else
    info "Removing stopped containers and networks (volumes are preserved)…"
    ${COMPOSE_CMD} down --remove-orphans
fi

info "Removing dangling Docker images…"
docker image prune -f

info "Removing unused build cache…"
docker builder prune -f

success "Cleanup complete."
echo ""
docker system df
