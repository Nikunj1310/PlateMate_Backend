#!/usr/bin/env bash
# status.sh – Show the status of all PlateMate Backend services
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║   📊  PlateMate Backend – Status         ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════╝${RESET}"

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

# Print compact compose ps output
echo ""
${COMPOSE_CMD} ps
echo ""

# ─── Per-service health summary ───────────────────────────────────────────────
declare -A PORTS=(
    [rabbitmq]="5672, 15672"
    [postgres_db1]="5433"
    [postgres_db2]="5434"
    [postgres_db3]="5435"
    [postgres_db4]="5436"
    [postgres_db5]="5437"
    [user-location-service]="3001"
    [food-inventory-service]="3002"
    [claim-service]="3003"
    [reputation-service]="3004"
    [messaging-service]="3005"
)

echo -e "${BOLD}Service Health Summary:${RESET}"
echo -e "────────────────────────────────────────────────────────"
printf "%-30s %-12s %s\n" "SERVICE" "STATUS" "PORTS"
echo -e "────────────────────────────────────────────────────────"

for service in rabbitmq postgres_db1 postgres_db2 postgres_db3 postgres_db4 postgres_db5 \
               user-location-service food-inventory-service claim-service \
               reputation-service messaging-service; do

    # docker inspect returns a JSON; parse State.Status and Health.Status
    CONTAINER_ID=$(${COMPOSE_CMD} ps -q "${service}" 2>/dev/null || true)

    if [ -z "${CONTAINER_ID}" ]; then
        STATUS_ICON="${RED}✗ NOT FOUND${RESET}"
    else
        STATE=$(docker inspect --format '{{.State.Status}}' "${CONTAINER_ID}" 2>/dev/null || echo "unknown")
        HEALTH=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "${CONTAINER_ID}" 2>/dev/null || echo "none")

        if [ "${STATE}" = "running" ] && { [ "${HEALTH}" = "healthy" ] || [ "${HEALTH}" = "none" ]; }; then
            STATUS_ICON="${GREEN}✔ running${RESET}"
        elif [ "${STATE}" = "running" ] && [ "${HEALTH}" = "starting" ]; then
            STATUS_ICON="${YELLOW}⧗ starting${RESET}"
        elif [ "${STATE}" = "running" ] && [ "${HEALTH}" = "unhealthy" ]; then
            STATUS_ICON="${RED}✗ unhealthy${RESET}"
        else
            STATUS_ICON="${RED}✗ ${STATE}${RESET}"
        fi
    fi

    printf "%-30s " "${service}"
    echo -en "${STATUS_ICON}"
    printf "  %s\n" "${PORTS[$service]:-}"
done

echo -e "────────────────────────────────────────────────────────"
echo ""
echo -e "Run ${CYAN}./scripts/health-check.sh${RESET} to test HTTP endpoints."
