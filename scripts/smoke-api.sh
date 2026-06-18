#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:53001}"

echo "== RetailFlow Pro API Smoke Test =="
echo "API_BASE_URL=${API_BASE_URL}"
echo

request() {
  local method="$1"
  local path="$2"
  local expected_status="$3"

  local url="${API_BASE_URL}${path}"

  echo "Testing ${method} ${path}"

  local response
  response="$(curl -s -w '\n%{http_code}' -X "$method" "$url")"

  local body
  local status
  body="$(printf '%s' "$response" | sed '$d')"
  status="$(printf '%s' "$response" | tail -n 1)"

  if [ "$status" != "$expected_status" ]; then
    echo "FAIL ${method} ${path}"
    echo "Expected HTTP ${expected_status}, got HTTP ${status}"
    echo "Body:"
    echo "$body"
    exit 1
  fi

  echo "OK HTTP ${status}"
  echo "$body" | python3 -m json.tool >/dev/null 2>&1 || true
  echo
}

request GET "/health" "200"
request GET "/api/v1/database/status" "200"
request GET "/api/v1/stores?page=1&pageSize=10" "200"
request GET "/api/v1/categories?page=1&pageSize=10" "200"
request GET "/api/v1/products?page=1&pageSize=10&search=produto" "200"
request GET "/api/v1/products?page=abc" "400"
request GET "/api/v1/products?storeId=abc" "400"
request GET "/products" "404"

echo "Smoke test concluído com sucesso."
