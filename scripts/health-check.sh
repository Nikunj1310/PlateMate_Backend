#!/usr/bin/env bash
# health-check.sh – Test all PlateMate Backend service HTTP endpoints
# Also verifies Cloudflare DNS connectivity when a domain is provided.
# Usage:
#   ./scripts/health-check.sh                          # localhost only
#   ./scripts/health-check.sh api.yourdomain.com       # also test via domain
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

DOMAIN="${1:-}"
PASS=0; FAIL=0

echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║   🏥  PlateMate Backend – Health Check   ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════╝${RESET}"
echo ""

# ─── Helper: HTTP check ───────────────────────────────────────────────────────
check_http() {
    local label="$1"
    local url="$2"
    local timeout="${3:-5}"

    if command -v curl &>/dev/null; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "${timeout}" "${url}" 2>/dev/null || echo "000")
    elif command -v wget &>/dev/null; then
        HTTP_CODE=$(wget -q --spider --server-response --timeout="${timeout}" "${url}" 2>&1 \
            | awk '/HTTP\//{print $2}' | tail -1 || echo "000")
    else
        echo -e "  ${YELLOW}[SKIP]${RESET}  ${label} – curl/wget not found"
        return
    fi

    if [[ "${HTTP_CODE}" =~ ^2 ]]; then
        echo -e "  ${GREEN}✔ [${HTTP_CODE}]${RESET}  ${label}"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}✗ [${HTTP_CODE}]${RESET}  ${label}"
        FAIL=$((FAIL + 1))
    fi
}

# ─── Helper: TCP check (for non-HTTP services) ────────────────────────────────
check_tcp() {
    local label="$1"
    local host="$2"
    local port="$3"
    local timeout="${4:-3}"

    if command -v nc &>/dev/null; then
        if nc -z -w "${timeout}" "${host}" "${port}" 2>/dev/null; then
            echo -e "  ${GREEN}✔ [TCP]${RESET}   ${label}"
            PASS=$((PASS + 1))
        else
            echo -e "  ${RED}✗ [TCP]${RESET}   ${label}"
            FAIL=$((FAIL + 1))
        fi
    else
        # Fallback: /dev/tcp (bash built-in)
        if (echo >/dev/tcp/"${host}"/"${port}") 2>/dev/null; then
            echo -e "  ${GREEN}✔ [TCP]${RESET}   ${label}"
            PASS=$((PASS + 1))
        else
            echo -e "  ${RED}✗ [TCP]${RESET}   ${label}"
            FAIL=$((FAIL + 1))
        fi
    fi
}

# ─── Localhost service health endpoints ───────────────────────────────────────
echo -e "${BOLD}Microservice health endpoints (localhost):${RESET}"
check_http "user-location-service  :3001/health" "http://localhost:3001/health"
check_http "food-inventory-service :3002/health" "http://localhost:3002/health"
check_http "claim-service          :3003/health" "http://localhost:3003/health"
check_http "reputation-service     :3004/health" "http://localhost:3004/health"
check_http "messaging-service      :3005/health" "http://localhost:3005/health"

echo ""
echo -e "${BOLD}Infrastructure (TCP connectivity):${RESET}"
check_tcp  "RabbitMQ AMQP          :5672"        "localhost" 5672
check_tcp  "RabbitMQ Management    :15672"       "localhost" 15672
check_tcp  "PostgreSQL DB1         :5433"        "localhost" 5433
check_tcp  "PostgreSQL DB2         :5434"        "localhost" 5434
check_tcp  "PostgreSQL DB3         :5435"        "localhost" 5435
check_tcp  "PostgreSQL DB4         :5436"        "localhost" 5436
check_tcp  "PostgreSQL DB5         :5437"        "localhost" 5437

# ─── Cloudflare / public domain checks ────────────────────────────────────────
if [ -n "${DOMAIN}" ]; then
    echo ""
    echo -e "${BOLD}Cloudflare DNS / public access (${DOMAIN}):${RESET}"

    # Resolve the domain and show the IP
    if command -v dig &>/dev/null; then
        RESOLVED_IP=$(dig +short "${DOMAIN}" A 2>/dev/null | head -1 || true)
        if [ -n "${RESOLVED_IP}" ]; then
            echo -e "  ${GREEN}✔ DNS${RESET}    ${DOMAIN} resolves to ${RESOLVED_IP}"
        else
            echo -e "  ${RED}✗ DNS${RESET}    ${DOMAIN} did not resolve – check Cloudflare A record"
            FAIL=$((FAIL + 1))
        fi
    elif command -v nslookup &>/dev/null; then
        RESOLVED_IP=$(nslookup "${DOMAIN}" 2>/dev/null | awk '/^Address: /{print $2}' | tail -1 || true)
        if [ -n "${RESOLVED_IP}" ]; then
            echo -e "  ${GREEN}✔ DNS${RESET}    ${DOMAIN} resolves to ${RESOLVED_IP}"
        else
            echo -e "  ${RED}✗ DNS${RESET}    ${DOMAIN} did not resolve – check Cloudflare A record"
            FAIL=$((FAIL + 1))
        fi
    else
        echo -e "  ${YELLOW}[SKIP]${RESET}  DNS lookup – dig/nslookup not found"
    fi

    for port_path in "3001/health" "3002/health" "3003/health" "3004/health" "3005/health"; do
        port="${port_path%%/*}"
        path="${port_path#*/}"
        check_http "${DOMAIN}:${port}/${path}" "http://${DOMAIN}:${port}/${path}" 10
    done
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "────────────────────────────────────────────"
TOTAL=$((PASS + FAIL))
if [ "${FAIL}" -eq 0 ]; then
    echo -e "${GREEN}${BOLD}Result: ${PASS}/${TOTAL} checks passed ✅${RESET}"
else
    echo -e "${YELLOW}${BOLD}Result: ${PASS}/${TOTAL} checks passed, ${FAIL} failed ⚠️${RESET}"
    echo ""
    echo -e "  Tip: Run ${CYAN}./scripts/status.sh${RESET} and ${CYAN}./scripts/logs.sh${RESET} to diagnose failures."
fi
echo -e "────────────────────────────────────────────"

[ "${FAIL}" -eq 0 ]   # exit 1 if any checks failed
