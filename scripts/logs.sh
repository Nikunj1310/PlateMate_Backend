#!/usr/bin/env bash
# logs.sh – View logs from PlateMate Backend services
# Usage:
#   ./scripts/logs.sh                     # tail all services (last 50 lines)
#   ./scripts/logs.sh user-location       # logs for one service
#   ./scripts/logs.sh -f                  # follow all services in real-time
#   ./scripts/logs.sh -f claim-service    # follow a specific service
set -euo pipefail

CYAN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; RESET='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

if ! command -v docker &>/dev/null; then
    echo -e "${RED}[ERROR]${RESET} Docker is not installed." >&2; exit 1
fi

if docker compose version &>/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}[ERROR]${RESET} Docker Compose is not installed." >&2; exit 1
fi

FOLLOW=false
SERVICE=""

# Parse arguments
for arg in "$@"; do
    case "${arg}" in
        -f|--follow) FOLLOW=true ;;
        -*) echo -e "${RED}[ERROR]${RESET} Unknown flag: ${arg}" >&2; exit 1 ;;
        *)  SERVICE="${arg}" ;;
    esac
done

TAIL_LINES=50
FOLLOW_FLAG=""
[ "${FOLLOW}" = "true" ] && FOLLOW_FLAG="--follow"

echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════╗${RESET}"
if [ -n "${SERVICE}" ]; then
    echo -e "${BOLD}${CYAN}║   📋  Logs: ${SERVICE}${RESET}"
else
    echo -e "${BOLD}${CYAN}║   📋  PlateMate Backend – Logs           ║${RESET}"
fi
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════╝${RESET}"
echo ""

if [ -n "${SERVICE}" ]; then
    # shellcheck disable=SC2086
    ${COMPOSE_CMD} logs --tail="${TAIL_LINES}" ${FOLLOW_FLAG} "${SERVICE}"
else
    # shellcheck disable=SC2086
    ${COMPOSE_CMD} logs --tail="${TAIL_LINES}" ${FOLLOW_FLAG}
fi
