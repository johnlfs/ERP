#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:53001}"
STORE_ID="${SMOKE_STORE_ID:-00000000-0000-0000-0000-000000000001}"
AUTH_EMAIL="${SMOKE_AUTH_EMAIL:-admin@retailflow.local}"
AUTH_PASSWORD="${SMOKE_AUTH_PASSWORD:-Admin@123456}"
AUTH_TOKEN=""

cleanup_smoke_data() {
  echo
  echo "Limpando dados criados pelo smoke test..."

  if pnpm --filter @erp/database db:cleanup:smoke >/tmp/retailflow-smoke-cleanup.log 2>&1; then
    cat /tmp/retailflow-smoke-cleanup.log
    echo "Limpeza smoke concluída."
  else
    echo "Aviso: falha ao limpar dados smoke."
    cat /tmp/retailflow-smoke-cleanup.log || true
  fi

  rm -f /tmp/retailflow-smoke-cleanup.log
}

trap cleanup_smoke_data EXIT

echo "== RetailFlow Pro API Smoke Test =="
echo "API_BASE_URL=${API_BASE_URL}"
echo "STORE_ID=${STORE_ID}"
echo "AUTH_EMAIL=${AUTH_EMAIL}"
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

json_request() {
  local method="$1"
  local path="$2"
  local expected_status="$3"
  local payload="${4:-}"

  local url="${API_BASE_URL}${path}"

  echo "Testing ${method} ${path}" >&2

  local auth_args=()
  if [ -n "$AUTH_TOKEN" ]; then
    auth_args=(-H "Authorization: Bearer ${AUTH_TOKEN}")
  fi

  local response
  if [ -n "$payload" ]; then
    response="$(curl -s -w '\n%{http_code}' -X "$method" "$url" \
      -H "Content-Type: application/json" \
      "${auth_args[@]}" \
      -d "$payload")"
  else
    response="$(curl -s -w '\n%{http_code}' -X "$method" "$url" \
      "${auth_args[@]}")"
  fi

  local body
  local status
  body="$(printf '%s' "$response" | sed '$d')"
  status="$(printf '%s' "$response" | tail -n 1)"

  if [ "$status" != "$expected_status" ]; then
    echo "FAIL ${method} ${path}" >&2
    echo "Expected HTTP ${expected_status}, got HTTP ${status}" >&2
    echo "Body:" >&2
    echo "$body" >&2
    exit 1
  fi

  echo "OK HTTP ${status}" >&2
  echo "$body" | python3 -m json.tool >/dev/null 2>&1 || true
  echo >&2

  printf '%s' "$body"
}

request GET "/health" "200"
request GET "/api/v1/database/status" "200"
request GET "/api/v1/stores?page=1&pageSize=10" "200"
request GET "/api/v1/categories?page=1&pageSize=10" "200"
request GET "/api/v1/products?page=1&pageSize=10&search=produto" "200"
request GET "/api/v1/stock-movements?page=1&pageSize=10" "401"
request GET "/api/v1/sales?page=1&pageSize=10" "401"

UNAUTHORIZED_CATEGORY_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "name": "Smoke Categoria Sem Token"
}
JSON
)"

json_request POST "/api/v1/categories" "401" "$UNAUTHORIZED_CATEGORY_PAYLOAD" >/dev/null

UNAUTHORIZED_PRODUCT_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "categoryId": "00000000-0000-0000-0000-000000000001",
  "internalCode": "SMOKE-NO-TOKEN",
  "barcode": "7890000000000",
  "name": "Smoke Produto Sem Token",
  "description": "Produto sem token",
  "costPrice": 10,
  "salePrice": 19.9,
  "ncm": "00000000",
  "unit": "UN",
  "minStock": 1,
  "currentStock": 5
}
JSON
)"

json_request POST "/api/v1/products" "401" "$UNAUTHORIZED_PRODUCT_PAYLOAD" >/dev/null

UNAUTHORIZED_STOCK_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "productId": "00000000-0000-0000-0000-000000000001",
  "type": "IN",
  "quantity": 1,
  "reason": "Smoke sem token"
}
JSON
)"

json_request POST "/api/v1/stock-movements" "401" "$UNAUTHORIZED_STOCK_PAYLOAD" >/dev/null

LOGIN_PAYLOAD="$(cat <<JSON
{
  "email": "${AUTH_EMAIL}",
  "password": "${AUTH_PASSWORD}"
}
JSON
)"

LOGIN_RESPONSE="$(json_request POST "/api/v1/auth/login" "201" "$LOGIN_PAYLOAD")"

AUTH_TOKEN="$(printf '%s' "$LOGIN_RESPONSE" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["accessToken"])')"

json_request GET "/api/v1/auth/me" "200" "" >/dev/null

SMOKE_SUFFIX="$(date +%s)"

CATEGORY_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "name": "Smoke Categoria ${SMOKE_SUFFIX}"
}
JSON
)"

CATEGORY_RESPONSE="$(json_request POST "/api/v1/categories" "201" "$CATEGORY_PAYLOAD")"

CATEGORY_ID="$(printf '%s' "$CATEGORY_RESPONSE" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["id"])')"

PRODUCT_CODE="SMOKE-PROD-${SMOKE_SUFFIX}"
PRODUCT_BARCODE="789${SMOKE_SUFFIX}"

PRODUCT_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "categoryId": "${CATEGORY_ID}",
  "internalCode": "${PRODUCT_CODE}",
  "barcode": "${PRODUCT_BARCODE}",
  "name": "Smoke Produto ${SMOKE_SUFFIX}",
  "description": "Produto criado pelo smoke test",
  "costPrice": 10,
  "salePrice": 19.9,
  "ncm": "00000000",
  "unit": "UN",
  "minStock": 1,
  "currentStock": 5
}
JSON
)"

PRODUCT_RESPONSE="$(json_request POST "/api/v1/products" "201" "$PRODUCT_PAYLOAD")"

PRODUCT_ID="$(printf '%s' "$PRODUCT_RESPONSE" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["id"])')"

PRODUCT_UPDATE_PAYLOAD="$(cat <<JSON
{
  "name": "Smoke Produto ${SMOKE_SUFFIX} Atualizado",
  "salePrice": 24.9,
  "currentStock": 7
}
JSON
)"

SAVED_AUTH_TOKEN="${AUTH_TOKEN}"
AUTH_TOKEN=""
json_request PATCH "/api/v1/products/${PRODUCT_ID}" "401" "$PRODUCT_UPDATE_PAYLOAD" >/dev/null
AUTH_TOKEN="${SAVED_AUTH_TOKEN}"

json_request PATCH "/api/v1/products/${PRODUCT_ID}" "200" "$PRODUCT_UPDATE_PAYLOAD" >/dev/null

json_request PATCH "/api/v1/products/${PRODUCT_ID}/status" "200" '{
  "status": "INACTIVE"
}' >/dev/null

json_request PATCH "/api/v1/products/${PRODUCT_ID}/status" "200" '{
  "status": "ACTIVE"
}' >/dev/null

json_request PATCH "/api/v1/products/${PRODUCT_ID}" "400" '{}' >/dev/null

STOCK_IN_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "productId": "${PRODUCT_ID}",
  "type": "IN",
  "quantity": 10,
  "reason": "Smoke entrada de estoque",
  "document": "SMOKE-IN-${SMOKE_SUFFIX}"
}
JSON
)"

json_request POST "/api/v1/stock-movements" "201" "$STOCK_IN_PAYLOAD" >/dev/null

STOCK_OUT_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "productId": "${PRODUCT_ID}",
  "type": "OUT",
  "quantity": 3,
  "reason": "Smoke saída de estoque",
  "document": "SMOKE-OUT-${SMOKE_SUFFIX}"
}
JSON
)"

json_request POST "/api/v1/stock-movements" "201" "$STOCK_OUT_PAYLOAD" >/dev/null

STOCK_OUT_TOO_MUCH_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "productId": "${PRODUCT_ID}",
  "type": "OUT",
  "quantity": 999999,
  "reason": "Smoke saída acima do estoque"
}
JSON
)"

json_request POST "/api/v1/stock-movements" "400" "$STOCK_OUT_TOO_MUCH_PAYLOAD" >/dev/null

json_request GET "/api/v1/stock-movements?page=1&pageSize=10" "200" "" >/dev/null

SALE_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "paymentMethod": "PIX",
  "document": "SMOKE-SALE-${SMOKE_SUFFIX}",
  "notes": "Venda criada pelo smoke test",
  "items": [
    {
      "productId": "${PRODUCT_ID}",
      "quantity": 2,
      "unitPrice": 24.9,
      "discount": 0
    }
  ],
  "discount": 0
}
JSON
)"

SALE_RESPONSE="$(json_request POST "/api/v1/sales" "201" "$SALE_PAYLOAD")"

SALE_ID="$(printf '%s' "$SALE_RESPONSE" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["id"])')"

json_request GET "/api/v1/sales?page=1&pageSize=10" "200" "" >/dev/null
json_request GET "/api/v1/sales/${SALE_ID}" "200" "" >/dev/null

SALE_TOO_MUCH_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "paymentMethod": "PIX",
  "document": "SMOKE-SALE-TOO-MUCH-${SMOKE_SUFFIX}",
  "items": [
    {
      "productId": "${PRODUCT_ID}",
      "quantity": 999999,
      "unitPrice": 24.9,
      "discount": 0
    }
  ],
  "discount": 0
}
JSON
)"

json_request POST "/api/v1/sales" "400" "$SALE_TOO_MUCH_PAYLOAD" >/dev/null

request GET "/api/v1/products?page=abc" "400"
request GET "/api/v1/products?storeId=abc" "400"
request GET "/products" "404"

echo "Smoke test concluído com sucesso."
