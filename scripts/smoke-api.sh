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
request GET "/api/v1/customers?page=1&pageSize=10" "401"
request GET "/api/v1/suppliers?page=1&pageSize=10" "401"
request GET "/api/v1/purchases?page=1&pageSize=10" "401"
request GET "/api/v1/accounts-payable?page=1&pageSize=10" "401"
request GET "/api/v1/accounts-receivable?page=1&pageSize=10" "401"
request GET "/api/v1/cash-movements?page=1&pageSize=10" "401"

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

UNAUTHORIZED_SALE_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "paymentMethod": "PIX",
  "items": [
    {
      "productId": "${STORE_ID}",
      "quantity": 1,
      "unitPrice": 1,
      "discount": 0
    }
  ],
  "discount": 0
}
JSON
)"

json_request POST "/api/v1/sales" "401" "$UNAUTHORIZED_SALE_PAYLOAD" >/dev/null

UNAUTHORIZED_CUSTOMER_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "name": "Smoke Cliente Não Autorizado"
}
JSON
)"

json_request POST "/api/v1/customers" "401" "$UNAUTHORIZED_CUSTOMER_PAYLOAD" >/dev/null

UNAUTHORIZED_SUPPLIER_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "name": "Smoke Fornecedor Não Autorizado"
}
JSON
)"

json_request POST "/api/v1/suppliers" "401" "$UNAUTHORIZED_SUPPLIER_PAYLOAD" >/dev/null

UNAUTHORIZED_PURCHASE_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "supplierId": "00000000-0000-0000-0000-000000009998",
  "document": "SMOKE-PURCHASE-UNAUTHORIZED",
  "items": [
    {
      "productId": "00000000-0000-0000-0000-000000009997",
      "quantity": 1,
      "unitCost": 10,
      "discount": 0
    }
  ],
  "discount": 0
}
JSON
)"

json_request POST "/api/v1/purchases" "401" "$UNAUTHORIZED_PURCHASE_PAYLOAD" >/dev/null




request PATCH "/api/v1/sales/00000000-0000-0000-0000-000000000001/cancel" "401"
request PATCH "/api/v1/purchases/00000000-0000-0000-0000-000000000001/cancel" "401"
request PATCH "/api/v1/accounts-payable/00000000-0000-0000-0000-000000000001/pay" "401"
request PATCH "/api/v1/accounts-receivable/00000000-0000-0000-0000-000000000001/receive" "401"
request GET "/api/v1/cash-movements/stores/${STORE_ID}/summary" "401"
request GET "/api/v1/stock-audit/products/00000000-0000-0000-0000-000000000001" "401"
request GET "/api/v1/stock-audit/stores/${STORE_ID}/summary" "401"
request GET "/api/v1/financial-audit/stores/${STORE_ID}/summary" "401"


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

json_request GET "/api/v1/financial-audit/stores/abc/summary" "400" "" >/dev/null
json_request GET "/api/v1/cash-movements/stores/abc/summary" "400" "" >/dev/null
json_request GET "/api/v1/cash-movements?page=1&pageSize=10&type=INVALID" "400" "" >/dev/null
json_request GET "/api/v1/cash-movements?page=1&pageSize=10&source=INVALID" "400" "" >/dev/null
json_request GET "/api/v1/cash-movements?page=1&pageSize=10&storeId=abc" "400" "" >/dev/null
json_request GET "/api/v1/cash-movements?page=1&pageSize=10&accountPayableId=abc" "400" "" >/dev/null
json_request GET "/api/v1/cash-movements?page=1&pageSize=10&accountReceivableId=abc" "400" "" >/dev/null
json_request GET "/api/v1/cash-movements?page=1&pageSize=10&occurredAtFrom=not-a-date" "400" "" >/dev/null
json_request GET "/api/v1/cash-movements?page=1&pageSize=10&occurredAtFrom=2030-06-02T00:00:00.000Z&occurredAtTo=2030-06-01T00:00:00.000Z" "400" "" >/dev/null
json_request GET "/api/v1/cash-movements/00000000-0000-0000-0000-000000009999" "404" "" >/dev/null

json_request GET "/api/v1/accounts-payable?page=1&pageSize=10&status=INVALID" "400" "" >/dev/null
json_request GET "/api/v1/accounts-payable?page=1&pageSize=10&storeId=abc" "400" "" >/dev/null
json_request GET "/api/v1/accounts-payable?page=1&pageSize=10&dueDateFrom=2030-02-01T00:00:00.000Z&dueDateTo=2030-01-01T00:00:00.000Z" "400" "" >/dev/null
json_request GET "/api/v1/accounts-payable?page=1&pageSize=10&paidAtFrom=2030-04-01T00:00:00.000Z&paidAtTo=2030-03-01T00:00:00.000Z" "400" "" >/dev/null
json_request GET "/api/v1/accounts-payable/00000000-0000-0000-0000-000000009999" "404" "" >/dev/null

json_request GET "/api/v1/accounts-receivable?page=1&pageSize=10&status=INVALID" "400" "" >/dev/null
json_request GET "/api/v1/accounts-receivable?page=1&pageSize=10&storeId=abc" "400" "" >/dev/null
json_request GET "/api/v1/accounts-receivable?page=1&pageSize=10&customerId=abc" "400" "" >/dev/null
json_request GET "/api/v1/accounts-receivable?page=1&pageSize=10&saleId=abc" "400" "" >/dev/null
json_request GET "/api/v1/accounts-receivable?page=1&pageSize=10&dueDateFrom=not-a-date" "400" "" >/dev/null
json_request GET "/api/v1/accounts-receivable?page=1&pageSize=10&receivedAtFrom=not-a-date" "400" "" >/dev/null
json_request GET "/api/v1/accounts-receivable?page=1&pageSize=10&dueDateFrom=2030-02-01T00:00:00.000Z&dueDateTo=2030-01-01T00:00:00.000Z" "400" "" >/dev/null
json_request GET "/api/v1/accounts-receivable?page=1&pageSize=10&receivedAtFrom=2030-04-01T00:00:00.000Z&receivedAtTo=2030-03-01T00:00:00.000Z" "400" "" >/dev/null
json_request GET "/api/v1/accounts-receivable/00000000-0000-0000-0000-000000009999" "404" "" >/dev/null

RECEIVE_ACCOUNT_RECEIVABLE_NOT_FOUND_PAYLOAD="$(cat <<JSON
{
  "receiptMethod": "PIX"
}
JSON
)"

json_request PATCH "/api/v1/accounts-receivable/00000000-0000-0000-0000-000000009999/receive" "404" "$RECEIVE_ACCOUNT_RECEIVABLE_NOT_FOUND_PAYLOAD" >/dev/null

RECEIVE_ACCOUNT_RECEIVABLE_INVALID_PAYLOAD="$(cat <<JSON
{
  "receiptMethod": ""
}
JSON
)"

json_request PATCH "/api/v1/accounts-receivable/00000000-0000-0000-0000-000000009999/receive" "400" "$RECEIVE_ACCOUNT_RECEIVABLE_INVALID_PAYLOAD" >/dev/null

RECEIVE_ACCOUNT_RECEIVABLE_INVALID_METHOD_PAYLOAD="$(cat <<JSON
{
  "receiptMethod": "CHEQUE"
}
JSON
)"

json_request PATCH "/api/v1/accounts-receivable/00000000-0000-0000-0000-000000009999/receive" "400" "$RECEIVE_ACCOUNT_RECEIVABLE_INVALID_METHOD_PAYLOAD" >/dev/null

PAY_ACCOUNT_PAYABLE_NOT_FOUND_PAYLOAD="$(cat <<JSON
{
  "paymentMethod": "PIX"
}
JSON
)"

json_request PATCH "/api/v1/accounts-payable/00000000-0000-0000-0000-000000009999/pay" "404" "$PAY_ACCOUNT_PAYABLE_NOT_FOUND_PAYLOAD" >/dev/null

PAY_ACCOUNT_PAYABLE_INVALID_PAYLOAD="$(cat <<JSON
{
  "paymentMethod": ""
}
JSON
)"

json_request PATCH "/api/v1/accounts-payable/00000000-0000-0000-0000-000000009999/pay" "400" "$PAY_ACCOUNT_PAYABLE_INVALID_PAYLOAD" >/dev/null

PAY_ACCOUNT_PAYABLE_INVALID_METHOD_PAYLOAD="$(cat <<JSON
{
  "paymentMethod": "CHEQUE"
}
JSON
)"

json_request PATCH "/api/v1/accounts-payable/00000000-0000-0000-0000-000000009999/pay" "400" "$PAY_ACCOUNT_PAYABLE_INVALID_METHOD_PAYLOAD" >/dev/null

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

PRODUCT_NO_MOVEMENTS_CODE="SMOKE-PROD-NOMOV-${SMOKE_SUFFIX}"
PRODUCT_NO_MOVEMENTS_BARCODE="790${SMOKE_SUFFIX}"

PRODUCT_NO_MOVEMENTS_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "categoryId": "${CATEGORY_ID}",
  "internalCode": "${PRODUCT_NO_MOVEMENTS_CODE}",
  "barcode": "${PRODUCT_NO_MOVEMENTS_BARCODE}",
  "name": "Smoke Produto Sem Movimento ${SMOKE_SUFFIX}",
  "description": "Produto sem movimentação criado pelo smoke test",
  "costPrice": 5,
  "salePrice": 9.9,
  "ncm": "00000000",
  "unit": "UN",
  "minStock": 1,
  "currentStock": 5
}
JSON
)"

PRODUCT_NO_MOVEMENTS_RESPONSE="$(json_request POST "/api/v1/products" "201" "$PRODUCT_NO_MOVEMENTS_PAYLOAD")"

PRODUCT_NO_MOVEMENTS_ID="$(printf '%s' "$PRODUCT_NO_MOVEMENTS_RESPONSE" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["id"])')"

STOCK_AUDIT_NO_MOVEMENTS_RESPONSE="$(json_request GET "/api/v1/stock-audit/products/${PRODUCT_NO_MOVEMENTS_ID}" "200" "" )"

STOCK_AUDIT_NO_MOVEMENTS_RESPONSE="$STOCK_AUDIT_NO_MOVEMENTS_RESPONSE" PRODUCT_NO_MOVEMENTS_ID="$PRODUCT_NO_MOVEMENTS_ID" python3 - <<'PYVALIDATION'
import json
import os
from decimal import Decimal

payload = json.loads(os.environ["STOCK_AUDIT_NO_MOVEMENTS_RESPONSE"])
audit = payload["data"]
product_id = os.environ["PRODUCT_NO_MOVEMENTS_ID"]

assert audit["productId"] == product_id, "productId da auditoria sem movimento não bate"
assert audit["product"]["id"] == product_id, "product.id da auditoria sem movimento não bate"
assert audit["isConsistent"] is True, "Produto sem movimento deveria estar consistente"
assert audit["isCurrentStockConsistent"] is True, "currentStock sem movimento deveria estar consistente"
assert audit["isMovementChainConsistent"] is True, "Cadeia sem movimento deveria estar consistente"
assert audit["totalMovements"] == 0, f"Produto sem movimento deveria ter 0 movimentos, veio {audit['totalMovements']}"
assert audit["latestMovement"] is None, "Produto sem movimento não deveria ter latestMovement"
assert audit["brokenTransitions"] == [], "Produto sem movimento não deveria ter brokenTransitions"
assert audit["movements"] == [], "Produto sem movimento não deveria retornar movements"

current_stock = Decimal(str(audit["currentStock"]))
calculated_stock = Decimal(str(audit["calculatedStock"]))
assert current_stock == Decimal("5"), f"currentStock sem movimento deveria ser 5, veio {current_stock}"
assert calculated_stock == Decimal("5"), f"calculatedStock sem movimento deveria ser 5, veio {calculated_stock}"
PYVALIDATION

CUSTOMER_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "name": "Smoke Cliente ${SMOKE_SUFFIX}",
  "document": "SMOKE-DOC-${SMOKE_SUFFIX}",
  "email": "smoke.${SMOKE_SUFFIX}@example.com",
  "phone": "+5544999999999",
  "notes": "Cliente criado pelo smoke test"
}
JSON
)"

CUSTOMER_RESPONSE="$(json_request POST "/api/v1/customers" "201" "$CUSTOMER_PAYLOAD")"

json_request POST "/api/v1/customers" "409" "$CUSTOMER_PAYLOAD" >/dev/null

CUSTOMER_ID="$(printf '%s' "$CUSTOMER_RESPONSE" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["id"])')"

json_request GET "/api/v1/customers?page=1&pageSize=10&search=Smoke" "200" "" >/dev/null
json_request GET "/api/v1/customers/${CUSTOMER_ID}" "200" "" >/dev/null

UPDATE_CUSTOMER_PAYLOAD="$(cat <<JSON
{
  "name": "Smoke Cliente Atualizado ${SMOKE_SUFFIX}",
  "phone": "+5544888888888"
}
JSON
)"

json_request PATCH "/api/v1/customers/${CUSTOMER_ID}" "200" "$UPDATE_CUSTOMER_PAYLOAD" >/dev/null

CUSTOMER_INACTIVE_PAYLOAD="$(cat <<JSON
{
  "isActive": false
}
JSON
)"

json_request PATCH "/api/v1/customers/${CUSTOMER_ID}/status" "200" "$CUSTOMER_INACTIVE_PAYLOAD" >/dev/null

SALE_WITH_INACTIVE_CUSTOMER_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "customerId": "${CUSTOMER_ID}",
  "paymentMethod": "PIX",
  "document": "SMOKE-SALE-INACTIVE-CUSTOMER-${SMOKE_SUFFIX}",
  "items": [
    {
      "productId": "${PRODUCT_ID}",
      "quantity": 1,
      "unitPrice": 24.9,
      "discount": 0
    }
  ],
  "discount": 0
}
JSON
)"

json_request POST "/api/v1/sales" "400" "$SALE_WITH_INACTIVE_CUSTOMER_PAYLOAD" >/dev/null

SALE_WITH_UNKNOWN_CUSTOMER_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "customerId": "00000000-0000-0000-0000-000000009999",
  "paymentMethod": "PIX",
  "document": "SMOKE-SALE-UNKNOWN-CUSTOMER-${SMOKE_SUFFIX}",
  "items": [
    {
      "productId": "${PRODUCT_ID}",
      "quantity": 1,
      "unitPrice": 24.9,
      "discount": 0
    }
  ],
  "discount": 0
}
JSON
)"

json_request POST "/api/v1/sales" "404" "$SALE_WITH_UNKNOWN_CUSTOMER_PAYLOAD" >/dev/null

CUSTOMER_ACTIVE_PAYLOAD="$(cat <<JSON
{
  "isActive": true
}
JSON
)"

json_request PATCH "/api/v1/customers/${CUSTOMER_ID}/status" "200" "$CUSTOMER_ACTIVE_PAYLOAD" >/dev/null

json_request PATCH "/api/v1/customers/${CUSTOMER_ID}" "400" "{}" >/dev/null

SUPPLIER_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "name": "Smoke Fornecedor ${SMOKE_SUFFIX}",
  "document": "SMOKE-SUP-DOC-${SMOKE_SUFFIX}",
  "email": "supplier.${SMOKE_SUFFIX}@example.com",
  "phone": "+5544999999999",
  "contactName": "Contato Smoke",
  "notes": "Fornecedor criado pelo smoke test"
}
JSON
)"

SUPPLIER_RESPONSE="$(json_request POST "/api/v1/suppliers" "201" "$SUPPLIER_PAYLOAD")"

json_request POST "/api/v1/suppliers" "409" "$SUPPLIER_PAYLOAD" >/dev/null

SUPPLIER_ID="$(printf '%s' "$SUPPLIER_RESPONSE" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["id"])')"

json_request GET "/api/v1/suppliers?page=1&pageSize=10&search=Smoke" "200" "" >/dev/null
json_request GET "/api/v1/suppliers/${SUPPLIER_ID}" "200" "" >/dev/null

UPDATE_SUPPLIER_PAYLOAD="$(cat <<JSON
{
  "name": "Smoke Fornecedor Atualizado ${SMOKE_SUFFIX}",
  "phone": "+5544888888888",
  "contactName": "Contato Smoke Atualizado"
}
JSON
)"

json_request PATCH "/api/v1/suppliers/${SUPPLIER_ID}" "200" "$UPDATE_SUPPLIER_PAYLOAD" >/dev/null

SUPPLIER_INACTIVE_PAYLOAD="$(cat <<JSON
{
  "isActive": false
}
JSON
)"

json_request PATCH "/api/v1/suppliers/${SUPPLIER_ID}/status" "200" "$SUPPLIER_INACTIVE_PAYLOAD" >/dev/null

PURCHASE_WITH_INACTIVE_SUPPLIER_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "supplierId": "${SUPPLIER_ID}",
  "document": "SMOKE-PURCHASE-INACTIVE-SUPPLIER-${SMOKE_SUFFIX}",
  "items": [
    {
      "productId": "${PRODUCT_ID}",
      "quantity": 1,
      "unitCost": 10,
      "discount": 0
    }
  ],
  "discount": 0
}
JSON
)"

json_request POST "/api/v1/purchases" "400" "$PURCHASE_WITH_INACTIVE_SUPPLIER_PAYLOAD" >/dev/null

PURCHASE_WITH_UNKNOWN_SUPPLIER_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "supplierId": "00000000-0000-0000-0000-000000009998",
  "document": "SMOKE-PURCHASE-UNKNOWN-SUPPLIER-${SMOKE_SUFFIX}",
  "items": [
    {
      "productId": "${PRODUCT_ID}",
      "quantity": 1,
      "unitCost": 10,
      "discount": 0
    }
  ],
  "discount": 0
}
JSON
)"

json_request POST "/api/v1/purchases" "404" "$PURCHASE_WITH_UNKNOWN_SUPPLIER_PAYLOAD" >/dev/null

SUPPLIER_ACTIVE_PAYLOAD="$(cat <<JSON
{
  "isActive": true
}
JSON
)"

json_request PATCH "/api/v1/suppliers/${SUPPLIER_ID}/status" "200" "$SUPPLIER_ACTIVE_PAYLOAD" >/dev/null

json_request PATCH "/api/v1/suppliers/${SUPPLIER_ID}" "400" "{}" >/dev/null



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

PURCHASE_WITH_INACTIVE_PRODUCT_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "supplierId": "${SUPPLIER_ID}",
  "document": "SMOKE-PURCHASE-INACTIVE-PRODUCT-${SMOKE_SUFFIX}",
  "items": [
    {
      "productId": "${PRODUCT_ID}",
      "quantity": 1,
      "unitCost": 10,
      "discount": 0
    }
  ],
  "discount": 0
}
JSON
)"

json_request POST "/api/v1/purchases" "400" "$PURCHASE_WITH_INACTIVE_PRODUCT_PAYLOAD" >/dev/null

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
  "customerId": "${CUSTOMER_ID}",
  "paymentMethod": "PIX",
  "document": "SMOKE-SALE-${SMOKE_SUFFIX}",
  "notes": "Venda criada pelo smoke test",
  "dueDate": "2030-04-01T00:00:00.000Z",
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

CUSTOMER_ID="$CUSTOMER_ID" SALE_RESPONSE="$SALE_RESPONSE" STORE_ID="$STORE_ID" python3 - <<'PYVALIDATION'
import json
import os
from decimal import Decimal

customer_id = os.environ["CUSTOMER_ID"]
store_id = os.environ["STORE_ID"]
payload = json.loads(os.environ["SALE_RESPONSE"])
sale = payload["data"]

assert sale["customerId"] == customer_id, (
    f"customerId da venda deveria ser {customer_id}, veio {sale.get('customerId')}"
)

customer = sale.get("customer")
assert customer is not None, "Venda deveria retornar objeto customer"
assert customer["id"] == customer_id, (
    f"customer.id da venda deveria ser {customer_id}, veio {customer.get('id')}"
)

account_receivable = sale.get("accountReceivable")
assert account_receivable is not None, "Venda deveria gerar accountReceivable"
assert account_receivable["status"] == "OPEN", "Conta a receber deveria iniciar OPEN"
assert Decimal(str(account_receivable["amount"])) == Decimal(str(sale["total"])), (
    "Conta a receber deveria ter amount igual ao total da venda"
)
assert account_receivable["dueDate"].startswith("2030-04-01"), "dueDate da conta a receber não bate"
assert account_receivable["receivedAt"] is None, "Conta a receber nova não deveria ter receivedAt"
assert account_receivable["canceledAt"] is None, "Conta a receber nova não deveria ter canceledAt"
PYVALIDATION

SALE_MOVEMENTS_RESPONSE="$(json_request GET "/api/v1/stock-movements?saleId=${SALE_ID}&page=1&pageSize=10" "200" "" )"

SALE_ID="$SALE_ID" SALE_MOVEMENTS_RESPONSE="$SALE_MOVEMENTS_RESPONSE" python3 - <<'PYVALIDATION'
import json
import os

sale_id = os.environ["SALE_ID"]
payload = json.loads(os.environ["SALE_MOVEMENTS_RESPONSE"])
data = payload["data"]

assert len(data) >= 1, "Venda não gerou movimentação de estoque"

movement = data[0]

assert movement["saleId"] == sale_id, (
    f"saleId da movimentação diferente da venda: {movement.get('saleId')} != {sale_id}"
)

assert movement["type"] == "OUT", (
    f"Movimentação da venda deveria ser OUT, veio {movement.get('type')}"
)

assert float(movement["quantity"]) == 2.0, (
    f"Quantidade da movimentação da venda deveria ser 2, veio {movement.get('quantity')}"
)
PYVALIDATION

ACCOUNT_RECEIVABLE_ID="$(printf '%s' "$SALE_RESPONSE" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["accountReceivable"]["id"])')"
ACCOUNTS_RECEIVABLE_SEARCH_RESPONSE="$(json_request GET "/api/v1/accounts-receivable?page=1&pageSize=10&search=SMOKE-SALE" "200" "" )"
ACCOUNT_RECEIVABLE_BY_ID_RESPONSE="$(json_request GET "/api/v1/accounts-receivable/${ACCOUNT_RECEIVABLE_ID}" "200" "" )"
ACCOUNTS_RECEIVABLE_BY_SALE_RESPONSE="$(json_request GET "/api/v1/accounts-receivable?saleId=${SALE_ID}&page=1&pageSize=10" "200" "" )"
ACCOUNTS_RECEIVABLE_BY_STATUS_OPEN_RESPONSE="$(json_request GET "/api/v1/accounts-receivable?status=OPEN&saleId=${SALE_ID}&page=1&pageSize=10" "200" "" )"
ACCOUNTS_RECEIVABLE_BY_STATUS_CANCELED_BEFORE_RESPONSE="$(json_request GET "/api/v1/accounts-receivable?status=CANCELED&saleId=${SALE_ID}&page=1&pageSize=10" "200" "" )"
ACCOUNTS_RECEIVABLE_BY_STATUS_RECEIVED_BEFORE_RESPONSE="$(json_request GET "/api/v1/accounts-receivable?status=RECEIVED&saleId=${SALE_ID}&page=1&pageSize=10" "200" "" )"
ACCOUNTS_RECEIVABLE_BY_CUSTOMER_RESPONSE="$(json_request GET "/api/v1/accounts-receivable?customerId=${CUSTOMER_ID}&search=SMOKE-SALE&page=1&pageSize=10" "200" "" )"
ACCOUNTS_RECEIVABLE_BY_STORE_RESPONSE="$(json_request GET "/api/v1/accounts-receivable?storeId=${STORE_ID}&search=SMOKE-SALE&page=1&pageSize=10" "200" "" )"
ACCOUNTS_RECEIVABLE_BY_DUE_DATE_RESPONSE="$(json_request GET "/api/v1/accounts-receivable?dueDateFrom=2030-04-01T00:00:00.000Z&dueDateTo=2030-04-02T00:00:00.000Z&search=SMOKE-SALE&page=1&pageSize=10" "200" "" )"
ACCOUNTS_RECEIVABLE_BY_DUE_DATE_EMPTY_RESPONSE="$(json_request GET "/api/v1/accounts-receivable?dueDateFrom=2030-04-03T00:00:00.000Z&dueDateTo=2030-04-04T00:00:00.000Z&saleId=${SALE_ID}&page=1&pageSize=10" "200" "" )"
ACCOUNTS_RECEIVABLE_BY_UNKNOWN_CUSTOMER_RESPONSE="$(json_request GET "/api/v1/accounts-receivable?customerId=00000000-0000-0000-0000-000000009999&saleId=${SALE_ID}&page=1&pageSize=10" "200" "" )"

SALE_RESPONSE="$SALE_RESPONSE" ACCOUNTS_RECEIVABLE_SEARCH_RESPONSE="$ACCOUNTS_RECEIVABLE_SEARCH_RESPONSE" ACCOUNT_RECEIVABLE_BY_ID_RESPONSE="$ACCOUNT_RECEIVABLE_BY_ID_RESPONSE" ACCOUNTS_RECEIVABLE_BY_SALE_RESPONSE="$ACCOUNTS_RECEIVABLE_BY_SALE_RESPONSE" ACCOUNTS_RECEIVABLE_BY_STATUS_OPEN_RESPONSE="$ACCOUNTS_RECEIVABLE_BY_STATUS_OPEN_RESPONSE" ACCOUNTS_RECEIVABLE_BY_STATUS_CANCELED_BEFORE_RESPONSE="$ACCOUNTS_RECEIVABLE_BY_STATUS_CANCELED_BEFORE_RESPONSE" ACCOUNTS_RECEIVABLE_BY_STATUS_RECEIVED_BEFORE_RESPONSE="$ACCOUNTS_RECEIVABLE_BY_STATUS_RECEIVED_BEFORE_RESPONSE" ACCOUNTS_RECEIVABLE_BY_CUSTOMER_RESPONSE="$ACCOUNTS_RECEIVABLE_BY_CUSTOMER_RESPONSE" ACCOUNTS_RECEIVABLE_BY_STORE_RESPONSE="$ACCOUNTS_RECEIVABLE_BY_STORE_RESPONSE" ACCOUNTS_RECEIVABLE_BY_DUE_DATE_RESPONSE="$ACCOUNTS_RECEIVABLE_BY_DUE_DATE_RESPONSE" ACCOUNTS_RECEIVABLE_BY_DUE_DATE_EMPTY_RESPONSE="$ACCOUNTS_RECEIVABLE_BY_DUE_DATE_EMPTY_RESPONSE" ACCOUNTS_RECEIVABLE_BY_UNKNOWN_CUSTOMER_RESPONSE="$ACCOUNTS_RECEIVABLE_BY_UNKNOWN_CUSTOMER_RESPONSE" ACCOUNT_RECEIVABLE_ID="$ACCOUNT_RECEIVABLE_ID" SALE_ID="$SALE_ID" CUSTOMER_ID="$CUSTOMER_ID" STORE_ID="$STORE_ID" python3 - <<'PYVALIDATION'
import json
import os
from decimal import Decimal

sale = json.loads(os.environ["SALE_RESPONSE"])["data"]
search_data = json.loads(os.environ["ACCOUNTS_RECEIVABLE_SEARCH_RESPONSE"])["data"]
by_id = json.loads(os.environ["ACCOUNT_RECEIVABLE_BY_ID_RESPONSE"])["data"]
by_sale = json.loads(os.environ["ACCOUNTS_RECEIVABLE_BY_SALE_RESPONSE"])["data"]
by_status_open = json.loads(os.environ["ACCOUNTS_RECEIVABLE_BY_STATUS_OPEN_RESPONSE"])["data"]
by_status_canceled_before = json.loads(os.environ["ACCOUNTS_RECEIVABLE_BY_STATUS_CANCELED_BEFORE_RESPONSE"])["data"]
by_status_received_before = json.loads(os.environ["ACCOUNTS_RECEIVABLE_BY_STATUS_RECEIVED_BEFORE_RESPONSE"])["data"]
by_customer = json.loads(os.environ["ACCOUNTS_RECEIVABLE_BY_CUSTOMER_RESPONSE"])["data"]
by_store = json.loads(os.environ["ACCOUNTS_RECEIVABLE_BY_STORE_RESPONSE"])["data"]
by_due_date = json.loads(os.environ["ACCOUNTS_RECEIVABLE_BY_DUE_DATE_RESPONSE"])["data"]
by_due_date_empty = json.loads(os.environ["ACCOUNTS_RECEIVABLE_BY_DUE_DATE_EMPTY_RESPONSE"])["data"]
by_unknown_customer = json.loads(os.environ["ACCOUNTS_RECEIVABLE_BY_UNKNOWN_CUSTOMER_RESPONSE"])["data"]
account_receivable_id = os.environ["ACCOUNT_RECEIVABLE_ID"]
sale_id = os.environ["SALE_ID"]
customer_id = os.environ["CUSTOMER_ID"]
store_id = os.environ["STORE_ID"]

for receivable in [by_id, sale["accountReceivable"]]:
    assert receivable["id"] == account_receivable_id, "Conta a receber retornou id incorreto"
    assert receivable["saleId"] == sale_id, "Conta a receber retornou saleId incorreto"
    assert receivable["customerId"] == customer_id, "Conta a receber retornou customerId incorreto"
    assert receivable["storeId"] == store_id, "Conta a receber retornou storeId incorreto"
    assert receivable["status"] == "OPEN", f"Conta a receber deveria estar OPEN, veio {receivable['status']}"
    assert Decimal(str(receivable["amount"])) == Decimal(str(sale["total"])), (
        "amount da conta a receber deveria bater com total da venda"
    )
    assert receivable["dueDate"].startswith("2030-04-01"), "dueDate da conta a receber não bate"

assert any(item["id"] == account_receivable_id for item in search_data), "Busca por SMOKE-SALE não encontrou a conta"
assert len(by_sale) == 1 and by_sale[0]["id"] == account_receivable_id, "Filtro saleId não retornou a conta correta"
assert len(by_status_open) == 1 and by_status_open[0]["id"] == account_receivable_id, "Filtro OPEN não retornou a conta correta"
assert len(by_status_canceled_before) == 0, "Filtro CANCELED antes do cancelamento deveria retornar 0"
assert len(by_status_received_before) == 0, "Filtro RECEIVED antes do recebimento deveria retornar 0"
assert any(item["id"] == account_receivable_id for item in by_customer), "Filtro customerId não encontrou a conta"
assert any(item["id"] == account_receivable_id for item in by_store), "Filtro storeId não encontrou a conta"
assert any(item["id"] == account_receivable_id for item in by_due_date), "Filtro dueDate não encontrou a conta"
assert len(by_due_date_empty) == 0, f"Filtro dueDate fora do vencimento deveria retornar 0, veio {len(by_due_date_empty)}"
assert len(by_unknown_customer) == 0, f"Filtro com customerId desconhecido deveria retornar 0, veio {len(by_unknown_customer)}"
PYVALIDATION

SALE_BY_ID_RESPONSE="$(json_request GET "/api/v1/sales/${SALE_ID}" "200" "" )"

SALE_BY_ID_RESPONSE="$SALE_BY_ID_RESPONSE" ACCOUNT_RECEIVABLE_ID="$ACCOUNT_RECEIVABLE_ID" SALE_ID="$SALE_ID" CUSTOMER_ID="$CUSTOMER_ID" STORE_ID="$STORE_ID" python3 - <<'PYVALIDATION'
import json
import os

sale = json.loads(os.environ["SALE_BY_ID_RESPONSE"])["data"]
account_receivable = sale.get("accountReceivable")
assert account_receivable is not None, "GET /sales/:id deveria retornar accountReceivable"
assert account_receivable["id"] == os.environ["ACCOUNT_RECEIVABLE_ID"], "accountReceivable da venda veio com id incorreto"
assert account_receivable["saleId"] == os.environ["SALE_ID"], "accountReceivable da venda veio com saleId incorreto"
assert account_receivable["customerId"] == os.environ["CUSTOMER_ID"], "accountReceivable da venda veio com customerId incorreto"
assert account_receivable["storeId"] == os.environ["STORE_ID"], "accountReceivable da venda veio com storeId incorreto"
assert account_receivable["status"] == "OPEN", "accountReceivable da venda deveria estar OPEN antes do cancelamento"
assert account_receivable["receivedAt"] is None, "accountReceivable da venda não deveria ter receivedAt antes do recebimento"
PYVALIDATION

PRODUCT_AFTER_SALE_RESPONSE="$(json_request GET "/api/v1/products/${PRODUCT_ID}" "200" "" )"

printf '%s' "$PRODUCT_AFTER_SALE_RESPONSE" | python3 -c 'import sys,json; payload=json.load(sys.stdin); current=float(payload["data"]["currentStock"]); assert current == 12.0, f"Estoque final esperado após venda era 12, veio {current}"'

json_request GET "/api/v1/sales?page=1&pageSize=10" "200" "" >/dev/null

CANCEL_SALE_PAYLOAD="$(cat <<JSON
{
  "reason": "Cancelamento pelo smoke test"
}
JSON
)"

CANCELED_SALE_RESPONSE="$(json_request PATCH "/api/v1/sales/${SALE_ID}/cancel" "200" "$CANCEL_SALE_PAYLOAD")"

CANCELED_SALE_RESPONSE="$CANCELED_SALE_RESPONSE" ACCOUNT_RECEIVABLE_ID="$ACCOUNT_RECEIVABLE_ID" python3 - <<'PYVALIDATION'
import json
import os

payload = json.loads(os.environ["CANCELED_SALE_RESPONSE"])
sale = payload["data"]
account_receivable_id = os.environ["ACCOUNT_RECEIVABLE_ID"]

assert sale["status"] == "CANCELED", f"Status esperado CANCELED, veio {sale.get('status')}"
assert sale["canceledAt"] is not None, "canceledAt deveria estar preenchido"
assert sale["canceledByUserId"] is not None, "canceledByUserId deveria estar preenchido"
assert sale["cancellationReason"] == "Cancelamento pelo smoke test", (
    f"cancellationReason inesperado: {sale.get('cancellationReason')}"
)

account_receivable = sale.get("accountReceivable")
assert account_receivable is not None, "Venda cancelada deveria retornar accountReceivable"
assert account_receivable["id"] == account_receivable_id, "Conta a receber cancelada retornou id incorreto"
assert account_receivable["status"] == "CANCELED", "Conta a receber deveria ser cancelada junto com a venda"
assert account_receivable["canceledAt"] is not None, "Conta a receber deveria ter canceledAt"
assert account_receivable["canceledByUserId"] is not None, "Conta a receber deveria ter canceledByUserId"
assert account_receivable["cancellationReason"] == "Cancelamento pelo smoke test", (
    "Conta a receber deveria manter o mesmo motivo de cancelamento da venda"
)
PYVALIDATION

ACCOUNT_RECEIVABLE_AFTER_CANCEL_RESPONSE="$(json_request GET "/api/v1/accounts-receivable?saleId=${SALE_ID}&page=1&pageSize=10" "200" "" )"
ACCOUNT_RECEIVABLE_STATUS_CANCELED_AFTER_RESPONSE="$(json_request GET "/api/v1/accounts-receivable?status=CANCELED&saleId=${SALE_ID}&page=1&pageSize=10" "200" "" )"
ACCOUNT_RECEIVABLE_STATUS_OPEN_AFTER_RESPONSE="$(json_request GET "/api/v1/accounts-receivable?status=OPEN&saleId=${SALE_ID}&page=1&pageSize=10" "200" "" )"
ACCOUNT_RECEIVABLE_STATUS_RECEIVED_AFTER_RESPONSE="$(json_request GET "/api/v1/accounts-receivable?status=RECEIVED&saleId=${SALE_ID}&page=1&pageSize=10" "200" "" )"

ACCOUNT_RECEIVABLE_AFTER_CANCEL_RESPONSE="$ACCOUNT_RECEIVABLE_AFTER_CANCEL_RESPONSE" ACCOUNT_RECEIVABLE_STATUS_CANCELED_AFTER_RESPONSE="$ACCOUNT_RECEIVABLE_STATUS_CANCELED_AFTER_RESPONSE" ACCOUNT_RECEIVABLE_STATUS_OPEN_AFTER_RESPONSE="$ACCOUNT_RECEIVABLE_STATUS_OPEN_AFTER_RESPONSE" ACCOUNT_RECEIVABLE_STATUS_RECEIVED_AFTER_RESPONSE="$ACCOUNT_RECEIVABLE_STATUS_RECEIVED_AFTER_RESPONSE" ACCOUNT_RECEIVABLE_ID="$ACCOUNT_RECEIVABLE_ID" python3 - <<'PYVALIDATION'
import json
import os

account_receivable_id = os.environ["ACCOUNT_RECEIVABLE_ID"]
after_cancel = json.loads(os.environ["ACCOUNT_RECEIVABLE_AFTER_CANCEL_RESPONSE"])["data"]
status_canceled = json.loads(os.environ["ACCOUNT_RECEIVABLE_STATUS_CANCELED_AFTER_RESPONSE"])["data"]
status_open = json.loads(os.environ["ACCOUNT_RECEIVABLE_STATUS_OPEN_AFTER_RESPONSE"])["data"]
status_received = json.loads(os.environ["ACCOUNT_RECEIVABLE_STATUS_RECEIVED_AFTER_RESPONSE"])["data"]

assert len(after_cancel) == 1, f"Filtro saleId após cancelamento deveria retornar 1 conta, veio {len(after_cancel)}"
assert after_cancel[0]["id"] == account_receivable_id, "Conta a receber após cancelamento veio com id incorreto"
assert after_cancel[0]["status"] == "CANCELED", "Conta a receber deveria estar CANCELED após cancelar venda"
assert after_cancel[0]["canceledAt"] is not None, "Conta a receber deveria ter canceledAt após cancelar venda"
assert after_cancel[0]["canceledByUserId"] is not None, "Conta a receber deveria ter canceledByUserId após cancelar venda"
assert after_cancel[0]["cancellationReason"] == "Cancelamento pelo smoke test", (
    "Conta a receber deveria manter o mesmo motivo de cancelamento da venda"
)
assert len(status_canceled) == 1, f"Filtro status=CANCELED após cancelamento deveria retornar 1, veio {len(status_canceled)}"
assert status_canceled[0]["id"] == account_receivable_id, "Filtro CANCELED retornou conta incorreta"
assert len(status_open) == 0, f"Filtro status=OPEN após cancelamento deveria retornar 0, veio {len(status_open)}"
assert len(status_received) == 0, f"Filtro status=RECEIVED após cancelamento deveria retornar 0, veio {len(status_received)}"
PYVALIDATION

SALE_MOVEMENTS_AFTER_CANCEL_RESPONSE="$(json_request GET "/api/v1/stock-movements?saleId=${SALE_ID}&page=1&pageSize=10" "200" "" )"

SALE_ID="$SALE_ID" SALE_MOVEMENTS_AFTER_CANCEL_RESPONSE="$SALE_MOVEMENTS_AFTER_CANCEL_RESPONSE" python3 - <<'PYVALIDATION'
import json
import os

sale_id = os.environ["SALE_ID"]
payload = json.loads(os.environ["SALE_MOVEMENTS_AFTER_CANCEL_RESPONSE"])
data = payload["data"]

assert len(data) >= 2, f"Cancelamento deveria deixar pelo menos 2 movimentações da venda, veio {len(data)}"

types = [movement["type"] for movement in data]
assert "OUT" in types, f"Movimentação OUT original não encontrada. Tipos: {types}"
assert "IN" in types, f"Movimentação IN de estorno não encontrada. Tipos: {types}"

for movement in data:
    assert movement["saleId"] == sale_id, (
        f"saleId da movimentação diferente da venda: {movement.get('saleId')} != {sale_id}"
    )

in_movements = [
    movement for movement in data
    if movement["type"] == "IN" and float(movement["quantity"]) == 2.0
]

assert len(in_movements) >= 1, "Movimentação IN de estorno com quantidade 2 não encontrada"
PYVALIDATION

PRODUCT_AFTER_CANCEL_RESPONSE="$(json_request GET "/api/v1/products/${PRODUCT_ID}" "200" "" )"

PRODUCT_AFTER_CANCEL_RESPONSE="$PRODUCT_AFTER_CANCEL_RESPONSE" python3 - <<'PYVALIDATION'
import json
import os

payload = json.loads(os.environ["PRODUCT_AFTER_CANCEL_RESPONSE"])
current = float(payload["data"]["currentStock"])

assert current == 14.0, f"Estoque final esperado após cancelamento era 14, veio {current}"
PYVALIDATION

json_request PATCH "/api/v1/sales/${SALE_ID}/cancel" "400" "$CANCEL_SALE_PAYLOAD" >/dev/null

RECEIVE_CANCELED_ACCOUNT_RECEIVABLE_PAYLOAD="$(cat <<JSON
{
  "receiptMethod": "PIX",
  "receivedAt": "2030-05-02T12:00:00.000Z",
  "receiptNotes": "Tentativa de receber conta cancelada pelo smoke test"
}
JSON
)"

json_request PATCH "/api/v1/accounts-receivable/${ACCOUNT_RECEIVABLE_ID}/receive" "400" "$RECEIVE_CANCELED_ACCOUNT_RECEIVABLE_PAYLOAD" >/dev/null

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

PRODUCT_BEFORE_PURCHASE_RESPONSE="$(json_request GET "/api/v1/products/${PRODUCT_ID}" "200" "" )"

PURCHASE_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "supplierId": "${SUPPLIER_ID}",
  "document": "SMOKE-PURCHASE-${SMOKE_SUFFIX}",
  "notes": "Compra criada pelo smoke test",
  "dueDate": "2030-01-31T00:00:00.000Z",
  "items": [
    {
      "productId": "${PRODUCT_ID}",
      "quantity": 4,
      "unitCost": 11.25,
      "discount": 0
    }
  ],
  "discount": 0
}
JSON
)"

PURCHASE_RESPONSE="$(json_request POST "/api/v1/purchases" "201" "$PURCHASE_PAYLOAD")"

PURCHASE_ID="$(printf '%s' "$PURCHASE_RESPONSE" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["id"])')"
ACCOUNT_PAYABLE_ID="$(printf '%s' "$PURCHASE_RESPONSE" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["accountPayable"]["id"])')"

json_request GET "/api/v1/purchases?page=1&pageSize=10&search=SMOKE-PURCHASE" "200" "" >/dev/null
ACCOUNTS_PAYABLE_SEARCH_RESPONSE="$(json_request GET "/api/v1/accounts-payable?page=1&pageSize=10&search=SMOKE-PURCHASE" "200" "" )"
ACCOUNT_PAYABLE_BY_ID_RESPONSE="$(json_request GET "/api/v1/accounts-payable/${ACCOUNT_PAYABLE_ID}" "200" "" )"
ACCOUNTS_PAYABLE_BY_PURCHASE_RESPONSE="$(json_request GET "/api/v1/accounts-payable?purchaseId=${PURCHASE_ID}&page=1&pageSize=10" "200" "" )"
ACCOUNTS_PAYABLE_BY_STATUS_OPEN_RESPONSE="$(json_request GET "/api/v1/accounts-payable?status=OPEN&purchaseId=${PURCHASE_ID}&page=1&pageSize=10" "200" "" )"
ACCOUNTS_PAYABLE_BY_STATUS_CANCELED_BEFORE_RESPONSE="$(json_request GET "/api/v1/accounts-payable?status=CANCELED&purchaseId=${PURCHASE_ID}&page=1&pageSize=10" "200" "" )"
ACCOUNTS_PAYABLE_BY_SUPPLIER_RESPONSE="$(json_request GET "/api/v1/accounts-payable?supplierId=${SUPPLIER_ID}&search=SMOKE-PURCHASE&page=1&pageSize=10" "200" "" )"
ACCOUNTS_PAYABLE_BY_STORE_RESPONSE="$(json_request GET "/api/v1/accounts-payable?storeId=${STORE_ID}&search=SMOKE-PURCHASE&page=1&pageSize=10" "200" "" )"
ACCOUNTS_PAYABLE_BY_DUE_DATE_RESPONSE="$(json_request GET "/api/v1/accounts-payable?dueDateFrom=2030-01-01T00:00:00.000Z&dueDateTo=2030-02-01T00:00:00.000Z&search=SMOKE-PURCHASE&page=1&pageSize=10" "200" "" )"
json_request GET "/api/v1/purchases/${PURCHASE_ID}" "200" "" >/dev/null

PURCHASE_MOVEMENTS_RESPONSE="$(json_request GET "/api/v1/stock-movements?purchaseId=${PURCHASE_ID}&page=1&pageSize=10" "200" "" )"

PRODUCT_AFTER_PURCHASE_RESPONSE="$(json_request GET "/api/v1/products/${PRODUCT_ID}" "200" "" )"

PURCHASE_RESPONSE="$PURCHASE_RESPONSE" PURCHASE_MOVEMENTS_RESPONSE="$PURCHASE_MOVEMENTS_RESPONSE" ACCOUNTS_PAYABLE_SEARCH_RESPONSE="$ACCOUNTS_PAYABLE_SEARCH_RESPONSE" ACCOUNT_PAYABLE_BY_ID_RESPONSE="$ACCOUNT_PAYABLE_BY_ID_RESPONSE" ACCOUNTS_PAYABLE_BY_PURCHASE_RESPONSE="$ACCOUNTS_PAYABLE_BY_PURCHASE_RESPONSE" ACCOUNTS_PAYABLE_BY_STATUS_OPEN_RESPONSE="$ACCOUNTS_PAYABLE_BY_STATUS_OPEN_RESPONSE" ACCOUNTS_PAYABLE_BY_STATUS_CANCELED_BEFORE_RESPONSE="$ACCOUNTS_PAYABLE_BY_STATUS_CANCELED_BEFORE_RESPONSE" ACCOUNTS_PAYABLE_BY_SUPPLIER_RESPONSE="$ACCOUNTS_PAYABLE_BY_SUPPLIER_RESPONSE" ACCOUNTS_PAYABLE_BY_STORE_RESPONSE="$ACCOUNTS_PAYABLE_BY_STORE_RESPONSE" ACCOUNTS_PAYABLE_BY_DUE_DATE_RESPONSE="$ACCOUNTS_PAYABLE_BY_DUE_DATE_RESPONSE" ACCOUNT_PAYABLE_ID="$ACCOUNT_PAYABLE_ID" PRODUCT_BEFORE_PURCHASE_RESPONSE="$PRODUCT_BEFORE_PURCHASE_RESPONSE" PRODUCT_AFTER_PURCHASE_RESPONSE="$PRODUCT_AFTER_PURCHASE_RESPONSE" PURCHASE_ID="$PURCHASE_ID" SUPPLIER_ID="$SUPPLIER_ID" PRODUCT_ID="$PRODUCT_ID" STORE_ID="$STORE_ID" python3 - <<'PYVALIDATION'
import json
import os

purchase = json.loads(os.environ["PURCHASE_RESPONSE"])["data"]
purchase_movements_payload = json.loads(os.environ["PURCHASE_MOVEMENTS_RESPONSE"])
purchase_movements = purchase_movements_payload["data"]
accounts_payable_search = json.loads(os.environ["ACCOUNTS_PAYABLE_SEARCH_RESPONSE"])["data"]
account_payable_by_id = json.loads(os.environ["ACCOUNT_PAYABLE_BY_ID_RESPONSE"])["data"]
accounts_payable_by_purchase = json.loads(os.environ["ACCOUNTS_PAYABLE_BY_PURCHASE_RESPONSE"])["data"]
accounts_payable_by_status_open = json.loads(os.environ["ACCOUNTS_PAYABLE_BY_STATUS_OPEN_RESPONSE"])["data"]
accounts_payable_by_status_canceled_before = json.loads(os.environ["ACCOUNTS_PAYABLE_BY_STATUS_CANCELED_BEFORE_RESPONSE"])["data"]
accounts_payable_by_supplier = json.loads(os.environ["ACCOUNTS_PAYABLE_BY_SUPPLIER_RESPONSE"])["data"]
accounts_payable_by_store = json.loads(os.environ["ACCOUNTS_PAYABLE_BY_STORE_RESPONSE"])["data"]
accounts_payable_by_due_date = json.loads(os.environ["ACCOUNTS_PAYABLE_BY_DUE_DATE_RESPONSE"])["data"]
account_payable_id = os.environ["ACCOUNT_PAYABLE_ID"]
before_product = json.loads(os.environ["PRODUCT_BEFORE_PURCHASE_RESPONSE"])["data"]
after_product = json.loads(os.environ["PRODUCT_AFTER_PURCHASE_RESPONSE"])["data"]

purchase_id = os.environ["PURCHASE_ID"]
supplier_id = os.environ["SUPPLIER_ID"]
product_id = os.environ["PRODUCT_ID"]
store_id = os.environ["STORE_ID"]

assert purchase["id"] == purchase_id, "ID da compra retornado não bate"
assert purchase["supplierId"] == supplier_id, "supplierId da compra não bate"
assert purchase["supplier"]["id"] == supplier_id, "supplier.id da compra não bate"
assert purchase["status"] == "RECEIVED", "Compra deveria ser RECEIVED"

account_payable = purchase.get("accountPayable")
assert account_payable is not None, "Compra deveria retornar accountPayable"
assert account_payable["id"] == account_payable_id, "accountPayable.id da compra não bate"
assert account_payable["status"] == "OPEN", "Conta a pagar da compra deveria iniciar OPEN"
assert account_payable["amount"] == purchase["total"], "Conta a pagar deveria ter amount igual ao total da compra"
assert account_payable["document"] == purchase["document"], "Documento da conta a pagar deveria bater com a compra"
assert account_payable["dueDate"].startswith("2030-01-31"), "dueDate da conta a pagar deveria ser 2030-01-31"

assert account_payable_by_id["id"] == account_payable_id, "Busca de conta por ID retornou id incorreto"
assert account_payable_by_id["purchaseId"] == purchase_id, "Busca de conta por ID retornou purchaseId incorreto"
assert account_payable_by_id["supplierId"] == supplier_id, "Busca de conta por ID retornou supplierId incorreto"
assert account_payable_by_id["storeId"] == store_id, "Busca de conta por ID retornou storeId incorreto"
assert account_payable_by_id["amount"] == purchase["total"], "Busca de conta por ID retornou amount incorreto"
assert account_payable_by_id["status"] == "OPEN", "Busca de conta por ID deveria estar OPEN"
assert account_payable_by_id["dueDate"].startswith("2030-01-31"), "Busca de conta por ID deveria retornar dueDate da compra"

assert any(account["id"] == account_payable_id for account in accounts_payable_search), (
    "Filtro de contas por search deveria conter a conta gerada pela compra"
)

assert len(accounts_payable_by_purchase) == 1, "Filtro de contas a pagar por purchaseId deveria retornar 1 registro"
filtered_payable = accounts_payable_by_purchase[0]
assert filtered_payable["id"] == account_payable_id, "Conta filtrada por purchaseId veio com id incorreto"
assert filtered_payable["purchaseId"] == purchase_id, "Conta filtrada por purchaseId veio com purchaseId incorreto"
assert filtered_payable["status"] == "OPEN", "Conta filtrada por purchaseId deveria estar OPEN"

assert len(accounts_payable_by_status_open) == 1, "Filtro status=OPEN por compra deveria retornar 1 registro"
assert accounts_payable_by_status_open[0]["id"] == account_payable_id, "Filtro status=OPEN retornou conta incorreta"
assert accounts_payable_by_status_open[0]["status"] == "OPEN", "Filtro status=OPEN retornou status incorreto"

assert len(accounts_payable_by_status_canceled_before) == 0, (
    "Filtro status=CANCELED antes do cancelamento deveria retornar 0 registros"
)

assert any(account["id"] == account_payable_id for account in accounts_payable_by_supplier), (
    "Filtro supplierId deveria conter a conta gerada pela compra"
)
assert all(account["supplierId"] == supplier_id for account in accounts_payable_by_supplier), (
    "Filtro supplierId retornou conta de outro fornecedor"
)

assert any(account["id"] == account_payable_id for account in accounts_payable_by_store), (
    "Filtro storeId deveria conter a conta gerada pela compra"
)
assert all(account["storeId"] == store_id for account in accounts_payable_by_store), (
    "Filtro storeId retornou conta de outra loja"
)

assert any(account["id"] == account_payable_id for account in accounts_payable_by_due_date), (
    "Filtro por intervalo de vencimento deveria conter a conta gerada pela compra"
)
assert all(account["dueDate"].startswith("2030-01-31") for account in accounts_payable_by_due_date), (
    "Filtro por intervalo de vencimento retornou conta fora da data esperada"
)

assert len(purchase["items"]) == 1, "Compra deveria ter 1 item"

item = purchase["items"][0]
assert item["productId"] == product_id, "productId do item da compra não bate"
assert item["quantity"] == 4, "Quantidade do item da compra deveria ser 4"
assert item["unitCost"] == 11.25, "unitCost do item da compra deveria ser 11.25"

movements = purchase["stockMovements"]
assert len(movements) == 1, "Compra deveria gerar 1 movimentação de estoque"

movement = movements[0]
assert movement["purchaseId"] == purchase_id, "Movimento deveria estar vinculado à compra"
assert movement["saleId"] is None, "Movimento de compra não deveria ter saleId"
assert movement["type"] == "IN", "Movimento de compra deveria ser IN"
assert movement["productId"] == product_id, "productId do movimento da compra não bate"
assert movement["quantity"] == 4, "Quantidade do movimento deveria ser 4"

assert len(purchase_movements) == 1, "Filtro por purchaseId deveria retornar 1 movimentação"
purchase_movement = purchase_movements[0]
assert purchase_movement["purchaseId"] == purchase_id, "Filtro purchaseId retornou movimento com purchaseId incorreto"
assert purchase_movement["saleId"] is None, "Movimento filtrado por purchaseId não deveria ter saleId"
assert purchase_movement["type"] == "IN", "Movimento filtrado por purchaseId deveria ser IN"
assert purchase_movement["productId"] == product_id, "Movimento filtrado por purchaseId veio com produto incorreto"
assert purchase_movement["quantity"] == 4, "Movimento filtrado por purchaseId deveria ter quantidade 4"

from decimal import Decimal

before_stock = Decimal(str(before_product["currentStock"]))
after_stock = Decimal(str(after_product["currentStock"]))

expected_after_stock = before_stock + Decimal("4")
assert after_stock == expected_after_stock, (
    f"Estoque após compra deveria ser {expected_after_stock}, veio {after_stock}"
)

after_cost_price = Decimal(str(after_product["costPrice"]))
assert after_cost_price == Decimal("11.25"), (
    f"costPrice após compra deveria ser 11.25, veio {after_cost_price}"
)
PYVALIDATION

CANCEL_PURCHASE_PAYLOAD="$(cat <<JSON
{
  "reason": "Cancelamento de compra pelo smoke test"
}
JSON
)"

CANCELED_PURCHASE_RESPONSE="$(json_request PATCH "/api/v1/purchases/${PURCHASE_ID}/cancel" "200" "$CANCEL_PURCHASE_PAYLOAD")"

CANCELED_PURCHASE_RESPONSE="$CANCELED_PURCHASE_RESPONSE" PURCHASE_ID="$PURCHASE_ID" python3 - <<'PYVALIDATION'
import json
import os

payload = json.loads(os.environ["CANCELED_PURCHASE_RESPONSE"])
purchase = payload["data"]
purchase_id = os.environ["PURCHASE_ID"]

assert purchase["id"] == purchase_id, "ID da compra cancelada não bate"
assert purchase["status"] == "CANCELED", f"Status esperado CANCELED, veio {purchase.get('status')}"
assert purchase["canceledAt"] is not None, "canceledAt deveria estar preenchido"
assert purchase["canceledByUserId"] is not None, "canceledByUserId deveria estar preenchido"
assert purchase["cancellationReason"] == "Cancelamento de compra pelo smoke test", (
    f"cancellationReason inesperado: {purchase.get('cancellationReason')}"
)

account_payable = purchase.get("accountPayable")
assert account_payable is not None, "Compra cancelada deveria retornar accountPayable"
assert account_payable["status"] == "CANCELED", "Conta a pagar deveria ser cancelada junto com a compra"
assert account_payable["canceledAt"] is not None, "Conta a pagar cancelada deveria ter canceledAt"
assert account_payable["canceledByUserId"] is not None, "Conta a pagar cancelada deveria ter canceledByUserId"
assert account_payable["cancellationReason"] == "Cancelamento de compra pelo smoke test", (
    f"Motivo de cancelamento da conta inesperado: {account_payable.get('cancellationReason')}"
)

movements = purchase["stockMovements"]
assert len(movements) >= 2, f"Compra cancelada deveria ter pelo menos 2 movimentos, veio {len(movements)}"

types = [movement["type"] for movement in movements]
assert "IN" in types, f"Movimento IN original não encontrado. Tipos: {types}"
assert "OUT" in types, f"Movimento OUT de reversão não encontrado. Tipos: {types}"

for movement in movements:
    assert movement["purchaseId"] == purchase_id, (
        f"purchaseId da movimentação diferente da compra: {movement.get('purchaseId')} != {purchase_id}"
    )
    assert movement["saleId"] is None, "Movimento de compra não deveria ter saleId"

out_movements = [
    movement for movement in movements
    if movement["type"] == "OUT" and float(movement["quantity"]) == 4.0
]

assert len(out_movements) >= 1, "Movimento OUT de reversão com quantidade 4 não encontrado"
PYVALIDATION

PURCHASE_MOVEMENTS_AFTER_CANCEL_RESPONSE="$(json_request GET "/api/v1/stock-movements?purchaseId=${PURCHASE_ID}&page=1&pageSize=10" "200" "" )"
ACCOUNT_PAYABLE_AFTER_CANCEL_RESPONSE="$(json_request GET "/api/v1/accounts-payable?purchaseId=${PURCHASE_ID}&page=1&pageSize=10" "200" "" )"
ACCOUNT_PAYABLE_STATUS_CANCELED_AFTER_RESPONSE="$(json_request GET "/api/v1/accounts-payable?status=CANCELED&purchaseId=${PURCHASE_ID}&page=1&pageSize=10" "200" "" )"
ACCOUNT_PAYABLE_STATUS_OPEN_AFTER_RESPONSE="$(json_request GET "/api/v1/accounts-payable?status=OPEN&purchaseId=${PURCHASE_ID}&page=1&pageSize=10" "200" "" )"

ACCOUNT_PAYABLE_AFTER_CANCEL_RESPONSE="$ACCOUNT_PAYABLE_AFTER_CANCEL_RESPONSE" ACCOUNT_PAYABLE_STATUS_CANCELED_AFTER_RESPONSE="$ACCOUNT_PAYABLE_STATUS_CANCELED_AFTER_RESPONSE" ACCOUNT_PAYABLE_STATUS_OPEN_AFTER_RESPONSE="$ACCOUNT_PAYABLE_STATUS_OPEN_AFTER_RESPONSE" ACCOUNT_PAYABLE_ID="$ACCOUNT_PAYABLE_ID" PURCHASE_MOVEMENTS_AFTER_CANCEL_RESPONSE="$PURCHASE_MOVEMENTS_AFTER_CANCEL_RESPONSE" PURCHASE_ID="$PURCHASE_ID" python3 - <<'PYVALIDATION'
import json
import os

purchase_id = os.environ["PURCHASE_ID"]
payload = json.loads(os.environ["PURCHASE_MOVEMENTS_AFTER_CANCEL_RESPONSE"])
data = payload["data"]
account_payables = json.loads(os.environ["ACCOUNT_PAYABLE_AFTER_CANCEL_RESPONSE"])["data"]
account_payables_status_canceled = json.loads(os.environ["ACCOUNT_PAYABLE_STATUS_CANCELED_AFTER_RESPONSE"])["data"]
account_payables_status_open = json.loads(os.environ["ACCOUNT_PAYABLE_STATUS_OPEN_AFTER_RESPONSE"])["data"]
account_payable_id = os.environ["ACCOUNT_PAYABLE_ID"]

assert len(account_payables) == 1, f"Filtro de contas por compra deveria retornar 1 registro, veio {len(account_payables)}"
account_payable = account_payables[0]
assert account_payable["id"] == account_payable_id, "Conta a pagar filtrada após cancelamento veio com id incorreto"
assert account_payable["status"] == "CANCELED", "Conta a pagar deveria estar CANCELED após cancelar compra"
assert account_payable["canceledAt"] is not None, "Conta a pagar deveria ter canceledAt após cancelar compra"
assert account_payable["canceledByUserId"] is not None, "Conta a pagar deveria ter canceledByUserId após cancelar compra"
assert account_payable["cancellationReason"] == "Cancelamento de compra pelo smoke test", (
    "Conta a pagar deveria manter o mesmo motivo de cancelamento da compra"
)

assert len(account_payables_status_canceled) == 1, (
    f"Filtro status=CANCELED após cancelamento deveria retornar 1 registro, veio {len(account_payables_status_canceled)}"
)
assert account_payables_status_canceled[0]["id"] == account_payable_id, (
    "Filtro status=CANCELED após cancelamento retornou conta incorreta"
)
assert account_payables_status_canceled[0]["status"] == "CANCELED", (
    "Filtro status=CANCELED após cancelamento retornou status incorreto"
)

assert len(account_payables_status_open) == 0, (
    f"Filtro status=OPEN após cancelamento deveria retornar 0 registros, veio {len(account_payables_status_open)}"
)

assert len(data) >= 2, f"Filtro por purchaseId deveria retornar pelo menos 2 movimentações, veio {len(data)}"

types = [movement["type"] for movement in data]
assert "IN" in types, f"Movimento IN da compra não encontrado no filtro. Tipos: {types}"
assert "OUT" in types, f"Movimento OUT do cancelamento não encontrado no filtro. Tipos: {types}"

for movement in data:
    assert movement["purchaseId"] == purchase_id, (
        f"purchaseId do movimento filtrado não bate: {movement.get('purchaseId')} != {purchase_id}"
    )
    assert movement["saleId"] is None, "Movimento filtrado por purchaseId não deveria ter saleId"
PYVALIDATION

PAY_CANCELED_ACCOUNT_PAYABLE_PAYLOAD="$(cat <<JSON
{
  "paymentMethod": "PIX",
  "paidAt": "2030-02-01T12:00:00.000Z",
  "paymentNotes": "Tentativa de baixa de conta cancelada pelo smoke test"
}
JSON
)"

json_request PATCH "/api/v1/accounts-payable/${ACCOUNT_PAYABLE_ID}/pay" "400" "$PAY_CANCELED_ACCOUNT_PAYABLE_PAYLOAD" >/dev/null

PRODUCT_AFTER_PURCHASE_CANCEL_RESPONSE="$(json_request GET "/api/v1/products/${PRODUCT_ID}" "200" "" )"

PRODUCT_BEFORE_PURCHASE_RESPONSE="$PRODUCT_BEFORE_PURCHASE_RESPONSE" PRODUCT_AFTER_PURCHASE_CANCEL_RESPONSE="$PRODUCT_AFTER_PURCHASE_CANCEL_RESPONSE" python3 - <<'PYVALIDATION'
import json
import os
from decimal import Decimal

before_product = json.loads(os.environ["PRODUCT_BEFORE_PURCHASE_RESPONSE"])["data"]
after_cancel_product = json.loads(os.environ["PRODUCT_AFTER_PURCHASE_CANCEL_RESPONSE"])["data"]

before_stock = Decimal(str(before_product["currentStock"]))
after_cancel_stock = Decimal(str(after_cancel_product["currentStock"]))

assert after_cancel_stock == before_stock, (
    f"Estoque após cancelar compra deveria voltar para {before_stock}, veio {after_cancel_stock}"
)

after_cancel_cost_price = Decimal(str(after_cancel_product["costPrice"]))
assert after_cancel_cost_price == Decimal("11.25"), (
    f"costPrice após cancelar compra deveria permanecer 11.25, veio {after_cancel_cost_price}"
)
PYVALIDATION

json_request PATCH "/api/v1/purchases/${PURCHASE_ID}/cancel" "400" "$CANCEL_PURCHASE_PAYLOAD" >/dev/null


STOCK_AUDIT_RESPONSE="$(json_request GET "/api/v1/stock-audit/products/${PRODUCT_ID}" "200" "" )"

STOCK_AUDIT_RESPONSE="$STOCK_AUDIT_RESPONSE" PRODUCT_ID="$PRODUCT_ID" python3 - <<'PYVALIDATION'
import json
import os
from decimal import Decimal

payload = json.loads(os.environ["STOCK_AUDIT_RESPONSE"])
audit = payload["data"]
product_id = os.environ["PRODUCT_ID"]

assert audit["productId"] == product_id, "productId da auditoria não bate"
assert audit["product"]["id"] == product_id, "product.id da auditoria não bate"
assert audit["isConsistent"] is True, "Auditoria de estoque deveria estar consistente"
assert audit["isCurrentStockConsistent"] is True, "currentStock deveria bater com calculatedStock"
assert audit["isMovementChainConsistent"] is True, "Cadeia de movimentações deveria estar consistente"
assert audit["totalMovements"] == 6, f"Auditoria deveria encontrar 6 movimentações, veio {audit['totalMovements']}"
assert audit["brokenTransitions"] == [], f"Não deveria haver quebras na cadeia: {audit['brokenTransitions']}"

current_stock = Decimal(str(audit["currentStock"]))
calculated_stock = Decimal(str(audit["calculatedStock"]))
assert current_stock == calculated_stock, (
    f"currentStock deveria ser igual ao calculatedStock: {current_stock} != {calculated_stock}"
)

latest = audit["latestMovement"]
assert latest is not None, "latestMovement deveria estar preenchido"
assert latest["productId"] == product_id, "latestMovement.productId não bate"
assert latest["purchaseId"] is not None, "latestMovement deveria estar vinculado à compra"
assert latest["saleId"] is None, "latestMovement de compra não deveria ter saleId"
assert latest["type"] == "OUT", f"latestMovement deveria ser OUT após cancelamento da compra, veio {latest['type']}"
assert Decimal(str(latest["quantity"])) == Decimal("4"), "latestMovement deveria ter quantidade 4"
PYVALIDATION

STOCK_AUDIT_STORE_SUMMARY_RESPONSE="$(json_request GET "/api/v1/stock-audit/stores/${STORE_ID}/summary" "200" "" )"

STOCK_AUDIT_STORE_SUMMARY_RESPONSE="$STOCK_AUDIT_STORE_SUMMARY_RESPONSE" STORE_ID="$STORE_ID" PRODUCT_ID="$PRODUCT_ID" PRODUCT_NO_MOVEMENTS_ID="$PRODUCT_NO_MOVEMENTS_ID" python3 - <<'PYVALIDATION'
import json
import os
from decimal import Decimal

payload = json.loads(os.environ["STOCK_AUDIT_STORE_SUMMARY_RESPONSE"])
summary = payload["data"]
store_id = os.environ["STORE_ID"]
product_id = os.environ["PRODUCT_ID"]
product_no_movements_id = os.environ["PRODUCT_NO_MOVEMENTS_ID"]

assert summary["storeId"] == store_id, "storeId do resumo da auditoria não bate"
assert summary["store"]["id"] == store_id, "store.id do resumo da auditoria não bate"
assert summary["totalProducts"] >= 2, f"Resumo deveria auditar pelo menos 2 produtos, veio {summary['totalProducts']}"
assert summary["consistentProducts"] + summary["inconsistentProducts"] == summary["totalProducts"], (
    "consistentProducts + inconsistentProducts deveria bater com totalProducts"
)
assert isinstance(summary["items"], list), "Resumo deveria retornar items como lista"
assert isinstance(summary["inconsistentItems"], list), "Resumo deveria retornar inconsistentItems como lista"

items_by_product = {item["productId"]: item for item in summary["items"]}
assert product_id in items_by_product, "Produto principal do smoke não apareceu no resumo da auditoria"
assert product_no_movements_id in items_by_product, "Produto sem movimentação não apareceu no resumo da auditoria"

main_item = items_by_product[product_id]
assert main_item["isConsistent"] is True, "Produto principal deveria estar consistente no resumo"
assert main_item["totalMovements"] == 6, f"Produto principal deveria ter 6 movimentos no resumo, veio {main_item['totalMovements']}"
assert main_item["latestMovement"] is not None, "Produto principal deveria ter latestMovement no resumo"
assert main_item["latestMovement"]["type"] == "OUT", "latestMovement do produto principal deveria ser OUT"
assert main_item["latestMovement"]["purchaseId"] is not None, "latestMovement do produto principal deveria ter purchaseId"
assert main_item["latestMovement"]["saleId"] is None, "latestMovement do produto principal não deveria ter saleId"

no_movement_item = items_by_product[product_no_movements_id]
assert no_movement_item["isConsistent"] is True, "Produto sem movimento deveria estar consistente no resumo"
assert no_movement_item["totalMovements"] == 0, f"Produto sem movimento deveria ter 0 movimentos no resumo, veio {no_movement_item['totalMovements']}"
assert no_movement_item["latestMovement"] is None, "Produto sem movimento não deveria ter latestMovement no resumo"
assert no_movement_item["brokenTransitions"] == [], "Produto sem movimento não deveria ter brokenTransitions no resumo"
assert Decimal(str(no_movement_item["currentStock"])) == Decimal("5"), "currentStock do produto sem movimento deveria ser 5 no resumo"
assert Decimal(str(no_movement_item["calculatedStock"])) == Decimal("5"), "calculatedStock do produto sem movimento deveria ser 5 no resumo"
PYVALIDATION

PAID_PURCHASE_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "supplierId": "${SUPPLIER_ID}",
  "document": "SMOKE-PURCHASE-PAID-${SMOKE_SUFFIX}",
  "notes": "Compra para baixa de conta a pagar pelo smoke test",
  "dueDate": "2030-03-01T00:00:00.000Z",
  "items": [
    {
      "productId": "${PRODUCT_ID}",
      "quantity": 1,
      "unitCost": 12.5,
      "discount": 0
    }
  ],
  "discount": 0
}
JSON
)"

PAID_PURCHASE_RESPONSE="$(json_request POST "/api/v1/purchases" "201" "$PAID_PURCHASE_PAYLOAD")"
PAID_PURCHASE_ID="$(printf '%s' "$PAID_PURCHASE_RESPONSE" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["id"])')"
PAID_ACCOUNT_PAYABLE_ID="$(printf '%s' "$PAID_PURCHASE_RESPONSE" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["accountPayable"]["id"])')"

PAY_ACCOUNT_PAYABLE_PARTIAL_PAYLOAD="$(cat <<JSON
{
  "paymentMethod": "PIX",
  "paidAmount": 1,
  "paidAt": "2030-03-02T12:00:00.000Z",
  "paymentNotes": "Tentativa de baixa parcial pelo smoke test"
}
JSON
)"

PAY_ACCOUNT_PAYABLE_ZERO_PAYLOAD="$(cat <<JSON
{
  "paymentMethod": "PIX",
  "paidAmount": 0,
  "paidAt": "2030-03-02T12:00:00.000Z",
  "paymentNotes": "Tentativa de baixa zerada pelo smoke test"
}
JSON
)"

PAY_ACCOUNT_PAYABLE_NEGATIVE_PAYLOAD="$(cat <<JSON
{
  "paymentMethod": "PIX",
  "paidAmount": -1,
  "paidAt": "2030-03-02T12:00:00.000Z",
  "paymentNotes": "Tentativa de baixa negativa pelo smoke test"
}
JSON
)"

PAY_ACCOUNT_PAYABLE_GREATER_PAYLOAD="$(cat <<JSON
{
  "paymentMethod": "PIX",
  "paidAmount": 999999,
  "paidAt": "2030-03-02T12:00:00.000Z",
  "paymentNotes": "Tentativa de baixa acima do valor pelo smoke test"
}
JSON
)"

PAY_ACCOUNT_PAYABLE_INVALID_EXISTING_METHOD_PAYLOAD="$(cat <<JSON
{
  "paymentMethod": "CHEQUE",
  "paidAt": "2030-03-02T12:00:00.000Z",
  "paymentNotes": "Tentativa com método inválido pelo smoke test"
}
JSON
)"

json_request PATCH "/api/v1/accounts-payable/${PAID_ACCOUNT_PAYABLE_ID}/pay" "400" "$PAY_ACCOUNT_PAYABLE_PARTIAL_PAYLOAD" >/dev/null
json_request PATCH "/api/v1/accounts-payable/${PAID_ACCOUNT_PAYABLE_ID}/pay" "400" "$PAY_ACCOUNT_PAYABLE_ZERO_PAYLOAD" >/dev/null
json_request PATCH "/api/v1/accounts-payable/${PAID_ACCOUNT_PAYABLE_ID}/pay" "400" "$PAY_ACCOUNT_PAYABLE_NEGATIVE_PAYLOAD" >/dev/null
json_request PATCH "/api/v1/accounts-payable/${PAID_ACCOUNT_PAYABLE_ID}/pay" "400" "$PAY_ACCOUNT_PAYABLE_GREATER_PAYLOAD" >/dev/null
json_request PATCH "/api/v1/accounts-payable/${PAID_ACCOUNT_PAYABLE_ID}/pay" "400" "$PAY_ACCOUNT_PAYABLE_INVALID_EXISTING_METHOD_PAYLOAD" >/dev/null

PAY_ACCOUNT_PAYABLE_PAYLOAD="$(cat <<JSON
{
  "paymentMethod": "PIX",
  "paidAt": "2030-03-02T12:00:00.000Z",
  "paymentNotes": "Baixa realizada pelo smoke test"
}
JSON
)"

PAID_ACCOUNT_PAYABLE_RESPONSE="$(json_request PATCH "/api/v1/accounts-payable/${PAID_ACCOUNT_PAYABLE_ID}/pay" "200" "$PAY_ACCOUNT_PAYABLE_PAYLOAD")"
PAID_ACCOUNT_PAYABLE_BY_ID_RESPONSE="$(json_request GET "/api/v1/accounts-payable/${PAID_ACCOUNT_PAYABLE_ID}" "200" "" )"
PAID_ACCOUNT_PAYABLE_BY_STATUS_RESPONSE="$(json_request GET "/api/v1/accounts-payable?status=PAID&purchaseId=${PAID_PURCHASE_ID}&page=1&pageSize=10" "200" "" )"
PAID_ACCOUNT_PAYABLE_OPEN_AFTER_PAY_RESPONSE="$(json_request GET "/api/v1/accounts-payable?status=OPEN&purchaseId=${PAID_PURCHASE_ID}&page=1&pageSize=10" "200" "" )"
PAID_ACCOUNT_PAYABLE_BY_METHOD_SEARCH_RESPONSE="$(json_request GET "/api/v1/accounts-payable?search=PIX&purchaseId=${PAID_PURCHASE_ID}&page=1&pageSize=10" "200" "" )"
PAID_ACCOUNT_PAYABLE_BY_PAID_AT_RESPONSE="$(json_request GET "/api/v1/accounts-payable?paidAtFrom=2030-03-02T00:00:00.000Z&paidAtTo=2030-03-03T00:00:00.000Z&purchaseId=${PAID_PURCHASE_ID}&page=1&pageSize=10" "200" "" )"
PAID_ACCOUNT_PAYABLE_OUTSIDE_PAID_AT_RESPONSE="$(json_request GET "/api/v1/accounts-payable?paidAtFrom=2030-03-03T00:00:00.000Z&paidAtTo=2030-03-04T00:00:00.000Z&purchaseId=${PAID_PURCHASE_ID}&page=1&pageSize=10" "200" "" )"
PAID_PURCHASE_AFTER_PAY_RESPONSE="$(json_request GET "/api/v1/purchases/${PAID_PURCHASE_ID}" "200" "" )"
PAID_CASH_MOVEMENTS_BY_ACCOUNT_RESPONSE="$(json_request GET "/api/v1/cash-movements?accountPayableId=${PAID_ACCOUNT_PAYABLE_ID}&page=1&pageSize=10" "200" "" )"
PAID_CASH_MOVEMENTS_BY_TYPE_SOURCE_RESPONSE="$(json_request GET "/api/v1/cash-movements?type=OUTFLOW&source=ACCOUNT_PAYABLE&accountPayableId=${PAID_ACCOUNT_PAYABLE_ID}&page=1&pageSize=10" "200" "" )"
PAID_CASH_MOVEMENTS_BY_OCCURRED_AT_RESPONSE="$(json_request GET "/api/v1/cash-movements?occurredAtFrom=2030-03-02T00:00:00.000Z&occurredAtTo=2030-03-03T00:00:00.000Z&accountPayableId=${PAID_ACCOUNT_PAYABLE_ID}&page=1&pageSize=10" "200" "" )"
PAID_CASH_MOVEMENT_ID="$(printf '%s' "$PAID_CASH_MOVEMENTS_BY_ACCOUNT_RESPONSE" | python3 -c 'import sys,json; data=json.load(sys.stdin)["data"]; print(data[0]["id"] if data else "")')"
PAID_CASH_MOVEMENT_BY_ID_RESPONSE="$(json_request GET "/api/v1/cash-movements/${PAID_CASH_MOVEMENT_ID}" "200" "" )"

PAID_CASH_MOVEMENTS_BY_ACCOUNT_RESPONSE="$PAID_CASH_MOVEMENTS_BY_ACCOUNT_RESPONSE" PAID_CASH_MOVEMENTS_BY_TYPE_SOURCE_RESPONSE="$PAID_CASH_MOVEMENTS_BY_TYPE_SOURCE_RESPONSE" PAID_CASH_MOVEMENTS_BY_OCCURRED_AT_RESPONSE="$PAID_CASH_MOVEMENTS_BY_OCCURRED_AT_RESPONSE" PAID_CASH_MOVEMENT_BY_ID_RESPONSE="$PAID_CASH_MOVEMENT_BY_ID_RESPONSE" PAID_CASH_MOVEMENT_ID="$PAID_CASH_MOVEMENT_ID" PAID_PURCHASE_RESPONSE="$PAID_PURCHASE_RESPONSE" PAID_ACCOUNT_PAYABLE_RESPONSE="$PAID_ACCOUNT_PAYABLE_RESPONSE" PAID_ACCOUNT_PAYABLE_BY_ID_RESPONSE="$PAID_ACCOUNT_PAYABLE_BY_ID_RESPONSE" PAID_ACCOUNT_PAYABLE_BY_STATUS_RESPONSE="$PAID_ACCOUNT_PAYABLE_BY_STATUS_RESPONSE" PAID_ACCOUNT_PAYABLE_OPEN_AFTER_PAY_RESPONSE="$PAID_ACCOUNT_PAYABLE_OPEN_AFTER_PAY_RESPONSE" PAID_ACCOUNT_PAYABLE_BY_METHOD_SEARCH_RESPONSE="$PAID_ACCOUNT_PAYABLE_BY_METHOD_SEARCH_RESPONSE" PAID_ACCOUNT_PAYABLE_BY_PAID_AT_RESPONSE="$PAID_ACCOUNT_PAYABLE_BY_PAID_AT_RESPONSE" PAID_ACCOUNT_PAYABLE_OUTSIDE_PAID_AT_RESPONSE="$PAID_ACCOUNT_PAYABLE_OUTSIDE_PAID_AT_RESPONSE" PAID_PURCHASE_AFTER_PAY_RESPONSE="$PAID_PURCHASE_AFTER_PAY_RESPONSE" PAID_PURCHASE_ID="$PAID_PURCHASE_ID" PAID_ACCOUNT_PAYABLE_ID="$PAID_ACCOUNT_PAYABLE_ID" SUPPLIER_ID="$SUPPLIER_ID" STORE_ID="$STORE_ID" python3 - <<'PYVALIDATION'
import json
import os
from decimal import Decimal

paid_purchase = json.loads(os.environ["PAID_PURCHASE_RESPONSE"])["data"]
paid_response = json.loads(os.environ["PAID_ACCOUNT_PAYABLE_RESPONSE"])["data"]
paid_by_id = json.loads(os.environ["PAID_ACCOUNT_PAYABLE_BY_ID_RESPONSE"])["data"]
paid_by_status = json.loads(os.environ["PAID_ACCOUNT_PAYABLE_BY_STATUS_RESPONSE"])["data"]
open_after_pay = json.loads(os.environ["PAID_ACCOUNT_PAYABLE_OPEN_AFTER_PAY_RESPONSE"])["data"]
method_search = json.loads(os.environ["PAID_ACCOUNT_PAYABLE_BY_METHOD_SEARCH_RESPONSE"])["data"]
paid_at_range = json.loads(os.environ["PAID_ACCOUNT_PAYABLE_BY_PAID_AT_RESPONSE"])["data"]
outside_paid_at_range = json.loads(os.environ["PAID_ACCOUNT_PAYABLE_OUTSIDE_PAID_AT_RESPONSE"])["data"]
paid_purchase_after_pay = json.loads(os.environ["PAID_PURCHASE_AFTER_PAY_RESPONSE"])["data"]
paid_cash_by_account = json.loads(os.environ["PAID_CASH_MOVEMENTS_BY_ACCOUNT_RESPONSE"])["data"]
paid_cash_by_type_source = json.loads(os.environ["PAID_CASH_MOVEMENTS_BY_TYPE_SOURCE_RESPONSE"])["data"]
paid_cash_by_occurred_at = json.loads(os.environ["PAID_CASH_MOVEMENTS_BY_OCCURRED_AT_RESPONSE"])["data"]
paid_cash_by_id = json.loads(os.environ["PAID_CASH_MOVEMENT_BY_ID_RESPONSE"])["data"]

paid_purchase_id = os.environ["PAID_PURCHASE_ID"]
paid_account_payable_id = os.environ["PAID_ACCOUNT_PAYABLE_ID"]
paid_cash_movement_id = os.environ["PAID_CASH_MOVEMENT_ID"]
supplier_id = os.environ["SUPPLIER_ID"]
store_id = os.environ["STORE_ID"]

purchase_payable = paid_purchase["accountPayable"]
assert purchase_payable["id"] == paid_account_payable_id, "Compra paga deveria retornar accountPayable correto"
assert purchase_payable["status"] == "OPEN", "Conta da compra para pagamento deveria iniciar OPEN"

for payable in [paid_response, paid_by_id]:
    assert payable["id"] == paid_account_payable_id, "Conta paga retornou id incorreto"
    assert payable["purchaseId"] == paid_purchase_id, "Conta paga retornou purchaseId incorreto"
    assert payable["supplierId"] == supplier_id, "Conta paga retornou supplierId incorreto"
    assert payable["storeId"] == store_id, "Conta paga retornou storeId incorreto"
    assert payable["status"] == "PAID", f"Conta deveria estar PAID, veio {payable['status']}"
    assert payable["paidAt"] is not None, "Conta paga deveria ter paidAt"
    assert payable["paidAt"].startswith("2030-03-02"), "paidAt deveria respeitar a data enviada"
    assert payable["paidByUserId"] is not None, "Conta paga deveria ter paidByUserId"
    assert payable["paidBy"] is not None, "Conta paga deveria retornar paidBy"
    assert payable["paidBy"]["id"] == payable["paidByUserId"], "paidBy.id deveria bater com paidByUserId"
    assert payable["paymentMethod"] == "PIX", "paymentMethod deveria ser PIX"
    assert payable["paymentNotes"] == "Baixa realizada pelo smoke test", "paymentNotes não bate"
    assert payable["paidAmount"] == payable["amount"], "paidAmount deveria ser igual ao amount"
    assert Decimal(str(payable["paidAmount"])) == Decimal(str(paid_purchase["total"])), (
        "paidAmount deveria ser igual ao total da compra"
    )

assert len(paid_by_status) == 1, f"Filtro status=PAID deveria retornar 1 registro, veio {len(paid_by_status)}"
assert paid_by_status[0]["id"] == paid_account_payable_id, "Filtro status=PAID retornou conta incorreta"
assert paid_by_status[0]["status"] == "PAID", "Filtro status=PAID retornou status incorreto"

assert len(open_after_pay) == 0, f"Filtro status=OPEN após baixa deveria retornar 0, veio {len(open_after_pay)}"

assert any(account["id"] == paid_account_payable_id for account in method_search), (
    "Busca por paymentMethod deveria encontrar a conta paga"
)

assert len(paid_at_range) == 1, f"Filtro por paidAt deveria retornar 1 registro, veio {len(paid_at_range)}"
assert paid_at_range[0]["id"] == paid_account_payable_id, "Filtro por paidAt retornou conta incorreta"
assert paid_at_range[0]["paidAt"].startswith("2030-03-02"), "Filtro por paidAt retornou baixa fora do período"
assert len(outside_paid_at_range) == 0, (
    f"Filtro paidAt fora do período deveria retornar 0, veio {len(outside_paid_at_range)}"
)

paid_purchase_payable = paid_purchase_after_pay["accountPayable"]
assert paid_purchase_after_pay["id"] == paid_purchase_id, "Busca da compra paga retornou id incorreto"
assert paid_purchase_payable["id"] == paid_account_payable_id, "Compra paga deveria retornar conta correta"
assert paid_purchase_payable["status"] == "PAID", "Compra paga deveria retornar accountPayable PAID"
assert paid_purchase_payable["paidAt"] is not None, "Compra paga deveria retornar paidAt na conta"
assert paid_purchase_payable["paidByUserId"] is not None, "Compra paga deveria retornar paidByUserId na conta"
assert paid_purchase_payable["paidAmount"] == paid_purchase_payable["amount"], (
    "Compra paga deveria retornar paidAmount igual ao amount da conta"
)

assert paid_response["cashMovement"] is not None, "Baixa de conta a pagar deveria retornar cashMovement"
assert paid_response["cashMovement"]["id"] == paid_cash_movement_id, "cashMovement da conta paga veio com id incorreto"

for movements in [paid_cash_by_account, paid_cash_by_type_source, paid_cash_by_occurred_at]:
    assert len(movements) == 1, f"Movimento de caixa da baixa deveria retornar 1 registro, veio {len(movements)}"
    movement = movements[0]
    assert movement["id"] == paid_cash_movement_id, "Movimento de caixa da baixa retornou id incorreto"
    assert movement["accountPayableId"] == paid_account_payable_id, "Movimento de caixa deveria apontar accountPayableId"
    assert movement["accountReceivableId"] is None, "Movimento de pagamento não deveria ter accountReceivableId"
    assert movement["type"] == "OUTFLOW", "Pagamento de conta a pagar deveria gerar OUTFLOW"
    assert movement["source"] == "ACCOUNT_PAYABLE", "Pagamento de conta a pagar deveria ter source ACCOUNT_PAYABLE"
    assert movement["occurredAt"].startswith("2030-03-02"), "Movimento de caixa deveria respeitar paidAt"
    assert Decimal(str(movement["amount"])) == Decimal(str(paid_response["paidAmount"])), "Valor do movimento de caixa deveria bater com paidAmount"

assert paid_cash_by_id["id"] == paid_cash_movement_id, "GET cash movement por id retornou id incorreto"
assert paid_cash_by_id["accountPayableId"] == paid_account_payable_id, "GET cash movement deveria retornar accountPayableId"
assert paid_cash_by_id["accountPayable"]["id"] == paid_account_payable_id, "GET cash movement deveria retornar accountPayable relacionado"
assert paid_cash_by_id["user"] is not None, "GET cash movement deveria retornar usuário"
PYVALIDATION

json_request PATCH "/api/v1/accounts-payable/${PAID_ACCOUNT_PAYABLE_ID}/pay" "400" "$PAY_ACCOUNT_PAYABLE_PAYLOAD" >/dev/null
json_request PATCH "/api/v1/purchases/${PAID_PURCHASE_ID}/cancel" "400" "$CANCEL_PURCHASE_PAYLOAD" >/dev/null

RECEIVED_SALE_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "customerId": "${CUSTOMER_ID}",
  "paymentMethod": "PIX",
  "document": "SMOKE-RECEIVED-SALE-${SMOKE_SUFFIX}",
  "dueDate": "2030-05-01T00:00:00.000Z",
  "items": [
    {
      "productId": "${PRODUCT_ID}",
      "quantity": 1,
      "unitPrice": 17.5,
      "discount": 0
    }
  ],
  "discount": 0,
  "notes": "Venda para recebimento smoke"
}
JSON
)"

RECEIVED_SALE_RESPONSE="$(json_request POST "/api/v1/sales" "201" "$RECEIVED_SALE_PAYLOAD")"
RECEIVED_SALE_ID="$(printf '%s' "$RECEIVED_SALE_RESPONSE" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["id"])')"
RECEIVED_ACCOUNT_RECEIVABLE_ID="$(printf '%s' "$RECEIVED_SALE_RESPONSE" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["accountReceivable"]["id"])')"

RECEIVE_ACCOUNT_RECEIVABLE_PARTIAL_PAYLOAD="$(cat <<JSON
{
  "receiptMethod": "PIX",
  "receivedAmount": 1,
  "receivedAt": "2030-05-02T12:00:00.000Z",
  "receiptNotes": "Tentativa de recebimento parcial pelo smoke test"
}
JSON
)"

RECEIVE_ACCOUNT_RECEIVABLE_ZERO_PAYLOAD="$(cat <<JSON
{
  "receiptMethod": "PIX",
  "receivedAmount": 0,
  "receivedAt": "2030-05-02T12:00:00.000Z",
  "receiptNotes": "Tentativa de recebimento zero pelo smoke test"
}
JSON
)"

RECEIVE_ACCOUNT_RECEIVABLE_NEGATIVE_PAYLOAD="$(cat <<JSON
{
  "receiptMethod": "PIX",
  "receivedAmount": -1,
  "receivedAt": "2030-05-02T12:00:00.000Z",
  "receiptNotes": "Tentativa de recebimento negativo pelo smoke test"
}
JSON
)"

RECEIVE_ACCOUNT_RECEIVABLE_GREATER_PAYLOAD="$(cat <<JSON
{
  "receiptMethod": "PIX",
  "receivedAmount": 999999,
  "receivedAt": "2030-05-02T12:00:00.000Z",
  "receiptNotes": "Tentativa de recebimento acima do valor pelo smoke test"
}
JSON
)"

RECEIVE_ACCOUNT_RECEIVABLE_INVALID_EXISTING_METHOD_PAYLOAD="$(cat <<JSON
{
  "receiptMethod": "CHEQUE",
  "receivedAt": "2030-05-02T12:00:00.000Z",
  "receiptNotes": "Tentativa com método inválido pelo smoke test"
}
JSON
)"

json_request PATCH "/api/v1/accounts-receivable/${RECEIVED_ACCOUNT_RECEIVABLE_ID}/receive" "400" "$RECEIVE_ACCOUNT_RECEIVABLE_PARTIAL_PAYLOAD" >/dev/null
json_request PATCH "/api/v1/accounts-receivable/${RECEIVED_ACCOUNT_RECEIVABLE_ID}/receive" "400" "$RECEIVE_ACCOUNT_RECEIVABLE_ZERO_PAYLOAD" >/dev/null
json_request PATCH "/api/v1/accounts-receivable/${RECEIVED_ACCOUNT_RECEIVABLE_ID}/receive" "400" "$RECEIVE_ACCOUNT_RECEIVABLE_NEGATIVE_PAYLOAD" >/dev/null
json_request PATCH "/api/v1/accounts-receivable/${RECEIVED_ACCOUNT_RECEIVABLE_ID}/receive" "400" "$RECEIVE_ACCOUNT_RECEIVABLE_GREATER_PAYLOAD" >/dev/null
json_request PATCH "/api/v1/accounts-receivable/${RECEIVED_ACCOUNT_RECEIVABLE_ID}/receive" "400" "$RECEIVE_ACCOUNT_RECEIVABLE_INVALID_EXISTING_METHOD_PAYLOAD" >/dev/null

RECEIVE_ACCOUNT_RECEIVABLE_PAYLOAD="$(cat <<JSON
{
  "receiptMethod": "PIX",
  "receivedAt": "2030-05-02T12:00:00.000Z",
  "receiptNotes": "Recebimento realizado pelo smoke test"
}
JSON
)"

RECEIVED_ACCOUNT_RECEIVABLE_RESPONSE="$(json_request PATCH "/api/v1/accounts-receivable/${RECEIVED_ACCOUNT_RECEIVABLE_ID}/receive" "200" "$RECEIVE_ACCOUNT_RECEIVABLE_PAYLOAD")"
RECEIVED_ACCOUNT_RECEIVABLE_BY_ID_RESPONSE="$(json_request GET "/api/v1/accounts-receivable/${RECEIVED_ACCOUNT_RECEIVABLE_ID}" "200" "" )"
RECEIVED_ACCOUNT_RECEIVABLE_BY_STATUS_RESPONSE="$(json_request GET "/api/v1/accounts-receivable?status=RECEIVED&saleId=${RECEIVED_SALE_ID}&page=1&pageSize=10" "200" "" )"
RECEIVED_ACCOUNT_RECEIVABLE_OPEN_AFTER_RECEIVE_RESPONSE="$(json_request GET "/api/v1/accounts-receivable?status=OPEN&saleId=${RECEIVED_SALE_ID}&page=1&pageSize=10" "200" "" )"
RECEIVED_ACCOUNT_RECEIVABLE_BY_METHOD_SEARCH_RESPONSE="$(json_request GET "/api/v1/accounts-receivable?search=PIX&saleId=${RECEIVED_SALE_ID}&page=1&pageSize=10" "200" "" )"
RECEIVED_ACCOUNT_RECEIVABLE_BY_RECEIVED_AT_RESPONSE="$(json_request GET "/api/v1/accounts-receivable?receivedAtFrom=2030-05-02T00:00:00.000Z&receivedAtTo=2030-05-03T00:00:00.000Z&saleId=${RECEIVED_SALE_ID}&page=1&pageSize=10" "200" "" )"
RECEIVED_ACCOUNT_RECEIVABLE_OUTSIDE_RECEIVED_AT_RESPONSE="$(json_request GET "/api/v1/accounts-receivable?receivedAtFrom=2030-05-03T00:00:00.000Z&receivedAtTo=2030-05-04T00:00:00.000Z&saleId=${RECEIVED_SALE_ID}&page=1&pageSize=10" "200" "" )"
RECEIVED_SALE_AFTER_RECEIVE_RESPONSE="$(json_request GET "/api/v1/sales/${RECEIVED_SALE_ID}" "200" "" )"
RECEIVED_CASH_MOVEMENTS_BY_ACCOUNT_RESPONSE="$(json_request GET "/api/v1/cash-movements?accountReceivableId=${RECEIVED_ACCOUNT_RECEIVABLE_ID}&page=1&pageSize=10" "200" "" )"
RECEIVED_CASH_MOVEMENTS_BY_TYPE_SOURCE_RESPONSE="$(json_request GET "/api/v1/cash-movements?type=INFLOW&source=ACCOUNT_RECEIVABLE&accountReceivableId=${RECEIVED_ACCOUNT_RECEIVABLE_ID}&page=1&pageSize=10" "200" "" )"
RECEIVED_CASH_MOVEMENTS_BY_OCCURRED_AT_RESPONSE="$(json_request GET "/api/v1/cash-movements?occurredAtFrom=2030-05-02T00:00:00.000Z&occurredAtTo=2030-05-03T00:00:00.000Z&accountReceivableId=${RECEIVED_ACCOUNT_RECEIVABLE_ID}&page=1&pageSize=10" "200" "" )"
RECEIVED_CASH_MOVEMENT_ID="$(printf '%s' "$RECEIVED_CASH_MOVEMENTS_BY_ACCOUNT_RESPONSE" | python3 -c 'import sys,json; data=json.load(sys.stdin)["data"]; print(data[0]["id"] if data else "")')"
RECEIVED_CASH_MOVEMENT_BY_ID_RESPONSE="$(json_request GET "/api/v1/cash-movements/${RECEIVED_CASH_MOVEMENT_ID}" "200" "" )"
CASH_MOVEMENTS_STORE_SUMMARY_RESPONSE="$(json_request GET "/api/v1/cash-movements/stores/${STORE_ID}/summary" "200" "" )"

RECEIVED_CASH_MOVEMENTS_BY_ACCOUNT_RESPONSE="$RECEIVED_CASH_MOVEMENTS_BY_ACCOUNT_RESPONSE" RECEIVED_CASH_MOVEMENTS_BY_TYPE_SOURCE_RESPONSE="$RECEIVED_CASH_MOVEMENTS_BY_TYPE_SOURCE_RESPONSE" RECEIVED_CASH_MOVEMENTS_BY_OCCURRED_AT_RESPONSE="$RECEIVED_CASH_MOVEMENTS_BY_OCCURRED_AT_RESPONSE" RECEIVED_CASH_MOVEMENT_BY_ID_RESPONSE="$RECEIVED_CASH_MOVEMENT_BY_ID_RESPONSE" RECEIVED_CASH_MOVEMENT_ID="$RECEIVED_CASH_MOVEMENT_ID" CASH_MOVEMENTS_STORE_SUMMARY_RESPONSE="$CASH_MOVEMENTS_STORE_SUMMARY_RESPONSE" PAID_CASH_MOVEMENT_ID="$PAID_CASH_MOVEMENT_ID" PAID_ACCOUNT_PAYABLE_ID="$PAID_ACCOUNT_PAYABLE_ID" RECEIVED_SALE_RESPONSE="$RECEIVED_SALE_RESPONSE" RECEIVED_ACCOUNT_RECEIVABLE_RESPONSE="$RECEIVED_ACCOUNT_RECEIVABLE_RESPONSE" RECEIVED_ACCOUNT_RECEIVABLE_BY_ID_RESPONSE="$RECEIVED_ACCOUNT_RECEIVABLE_BY_ID_RESPONSE" RECEIVED_ACCOUNT_RECEIVABLE_BY_STATUS_RESPONSE="$RECEIVED_ACCOUNT_RECEIVABLE_BY_STATUS_RESPONSE" RECEIVED_ACCOUNT_RECEIVABLE_OPEN_AFTER_RECEIVE_RESPONSE="$RECEIVED_ACCOUNT_RECEIVABLE_OPEN_AFTER_RECEIVE_RESPONSE" RECEIVED_ACCOUNT_RECEIVABLE_BY_METHOD_SEARCH_RESPONSE="$RECEIVED_ACCOUNT_RECEIVABLE_BY_METHOD_SEARCH_RESPONSE" RECEIVED_ACCOUNT_RECEIVABLE_BY_RECEIVED_AT_RESPONSE="$RECEIVED_ACCOUNT_RECEIVABLE_BY_RECEIVED_AT_RESPONSE" RECEIVED_ACCOUNT_RECEIVABLE_OUTSIDE_RECEIVED_AT_RESPONSE="$RECEIVED_ACCOUNT_RECEIVABLE_OUTSIDE_RECEIVED_AT_RESPONSE" RECEIVED_SALE_AFTER_RECEIVE_RESPONSE="$RECEIVED_SALE_AFTER_RECEIVE_RESPONSE" RECEIVED_SALE_ID="$RECEIVED_SALE_ID" RECEIVED_ACCOUNT_RECEIVABLE_ID="$RECEIVED_ACCOUNT_RECEIVABLE_ID" CUSTOMER_ID="$CUSTOMER_ID" STORE_ID="$STORE_ID" python3 - <<'PYVALIDATION'
import json
import os
from decimal import Decimal

received_sale = json.loads(os.environ["RECEIVED_SALE_RESPONSE"])["data"]
received_response = json.loads(os.environ["RECEIVED_ACCOUNT_RECEIVABLE_RESPONSE"])["data"]
received_by_id = json.loads(os.environ["RECEIVED_ACCOUNT_RECEIVABLE_BY_ID_RESPONSE"])["data"]
received_by_status = json.loads(os.environ["RECEIVED_ACCOUNT_RECEIVABLE_BY_STATUS_RESPONSE"])["data"]
open_after_receive = json.loads(os.environ["RECEIVED_ACCOUNT_RECEIVABLE_OPEN_AFTER_RECEIVE_RESPONSE"])["data"]
method_search = json.loads(os.environ["RECEIVED_ACCOUNT_RECEIVABLE_BY_METHOD_SEARCH_RESPONSE"])["data"]
received_at_range = json.loads(os.environ["RECEIVED_ACCOUNT_RECEIVABLE_BY_RECEIVED_AT_RESPONSE"])["data"]
outside_received_at_range = json.loads(os.environ["RECEIVED_ACCOUNT_RECEIVABLE_OUTSIDE_RECEIVED_AT_RESPONSE"])["data"]
received_sale_after_receive = json.loads(os.environ["RECEIVED_SALE_AFTER_RECEIVE_RESPONSE"])["data"]
received_cash_by_account = json.loads(os.environ["RECEIVED_CASH_MOVEMENTS_BY_ACCOUNT_RESPONSE"])["data"]
received_cash_by_type_source = json.loads(os.environ["RECEIVED_CASH_MOVEMENTS_BY_TYPE_SOURCE_RESPONSE"])["data"]
received_cash_by_occurred_at = json.loads(os.environ["RECEIVED_CASH_MOVEMENTS_BY_OCCURRED_AT_RESPONSE"])["data"]
received_cash_by_id = json.loads(os.environ["RECEIVED_CASH_MOVEMENT_BY_ID_RESPONSE"])["data"]
cash_summary = json.loads(os.environ["CASH_MOVEMENTS_STORE_SUMMARY_RESPONSE"])["data"]

received_sale_id = os.environ["RECEIVED_SALE_ID"]
received_account_receivable_id = os.environ["RECEIVED_ACCOUNT_RECEIVABLE_ID"]
received_cash_movement_id = os.environ["RECEIVED_CASH_MOVEMENT_ID"]
paid_cash_movement_id = os.environ["PAID_CASH_MOVEMENT_ID"]
paid_account_payable_id = os.environ["PAID_ACCOUNT_PAYABLE_ID"]
customer_id = os.environ["CUSTOMER_ID"]
store_id = os.environ["STORE_ID"]

sale_receivable = received_sale["accountReceivable"]
assert sale_receivable["id"] == received_account_receivable_id, "Venda para recebimento deveria retornar accountReceivable correto"
assert sale_receivable["status"] == "OPEN", "Conta da venda para recebimento deveria iniciar OPEN"

for receivable in [received_response, received_by_id]:
    assert receivable["id"] == received_account_receivable_id, "Conta recebida retornou id incorreto"
    assert receivable["saleId"] == received_sale_id, "Conta recebida retornou saleId incorreto"
    assert receivable["customerId"] == customer_id, "Conta recebida retornou customerId incorreto"
    assert receivable["storeId"] == store_id, "Conta recebida retornou storeId incorreto"
    assert receivable["status"] == "RECEIVED", f"Conta deveria estar RECEIVED, veio {receivable['status']}"
    assert receivable["receivedAt"] is not None, "Conta recebida deveria ter receivedAt"
    assert receivable["receivedAt"].startswith("2030-05-02"), "receivedAt deveria respeitar a data enviada"
    assert receivable["receivedByUserId"] is not None, "Conta recebida deveria ter receivedByUserId"
    assert receivable["receivedBy"] is not None, "Conta recebida deveria retornar receivedBy"
    assert receivable["receivedBy"]["id"] == receivable["receivedByUserId"], "receivedBy.id deveria bater com receivedByUserId"
    assert receivable["receiptMethod"] == "PIX", "receiptMethod deveria ser PIX"
    assert receivable["receiptNotes"] == "Recebimento realizado pelo smoke test", "receiptNotes não bate"
    assert receivable["receivedAmount"] == receivable["amount"], "receivedAmount deveria ser igual ao amount"
    assert Decimal(str(receivable["receivedAmount"])) == Decimal(str(received_sale["total"])), (
        "receivedAmount deveria ser igual ao total da venda"
    )

assert len(received_by_status) == 1, f"Filtro status=RECEIVED deveria retornar 1 registro, veio {len(received_by_status)}"
assert received_by_status[0]["id"] == received_account_receivable_id, "Filtro status=RECEIVED retornou conta incorreta"
assert received_by_status[0]["status"] == "RECEIVED", "Filtro status=RECEIVED retornou status incorreto"

assert len(open_after_receive) == 0, f"Filtro status=OPEN após recebimento deveria retornar 0, veio {len(open_after_receive)}"

assert any(account["id"] == received_account_receivable_id for account in method_search), (
    "Busca por receiptMethod deveria encontrar a conta recebida"
)

assert len(received_at_range) == 1, f"Filtro por receivedAt deveria retornar 1 registro, veio {len(received_at_range)}"
assert received_at_range[0]["id"] == received_account_receivable_id, "Filtro por receivedAt retornou conta incorreta"
assert received_at_range[0]["receivedAt"].startswith("2030-05-02"), "Filtro por receivedAt retornou baixa fora do período"
assert len(outside_received_at_range) == 0, (
    f"Filtro receivedAt fora do período deveria retornar 0, veio {len(outside_received_at_range)}"
)

received_sale_receivable = received_sale_after_receive["accountReceivable"]
assert received_sale_after_receive["id"] == received_sale_id, "Busca da venda recebida retornou id incorreto"
assert received_sale_receivable["id"] == received_account_receivable_id, "Venda recebida deveria retornar conta correta"
assert received_sale_receivable["status"] == "RECEIVED", "Venda recebida deveria retornar accountReceivable RECEIVED"
assert received_sale_receivable["receivedAt"] is not None, "Venda recebida deveria retornar receivedAt na conta"
assert received_sale_receivable["receivedByUserId"] is not None, "Venda recebida deveria retornar receivedByUserId na conta"
assert received_sale_receivable["receivedAmount"] == received_sale_receivable["amount"], (
    "Venda recebida deveria retornar receivedAmount igual ao amount da conta"
)

assert received_response["cashMovement"] is not None, "Recebimento deveria retornar cashMovement"
assert received_response["cashMovement"]["id"] == received_cash_movement_id, "cashMovement da conta recebida veio com id incorreto"

for movements in [received_cash_by_account, received_cash_by_type_source, received_cash_by_occurred_at]:
    assert len(movements) == 1, f"Movimento de caixa do recebimento deveria retornar 1 registro, veio {len(movements)}"
    movement = movements[0]
    assert movement["id"] == received_cash_movement_id, "Movimento de caixa do recebimento retornou id incorreto"
    assert movement["accountReceivableId"] == received_account_receivable_id, "Movimento de caixa deveria apontar accountReceivableId"
    assert movement["accountPayableId"] is None, "Movimento de recebimento não deveria ter accountPayableId"
    assert movement["type"] == "INFLOW", "Recebimento de conta a receber deveria gerar INFLOW"
    assert movement["source"] == "ACCOUNT_RECEIVABLE", "Recebimento de conta a receber deveria ter source ACCOUNT_RECEIVABLE"
    assert movement["occurredAt"].startswith("2030-05-02"), "Movimento de caixa deveria respeitar receivedAt"
    assert Decimal(str(movement["amount"])) == Decimal(str(received_response["receivedAmount"])), "Valor do movimento de caixa deveria bater com receivedAmount"

assert received_cash_by_id["id"] == received_cash_movement_id, "GET cash movement por id retornou id incorreto"
assert received_cash_by_id["accountReceivableId"] == received_account_receivable_id, "GET cash movement deveria retornar accountReceivableId"
assert received_cash_by_id["accountReceivable"]["id"] == received_account_receivable_id, "GET cash movement deveria retornar accountReceivable relacionado"
assert received_cash_by_id["user"] is not None, "GET cash movement deveria retornar usuário"

assert cash_summary["storeId"] == store_id, "Resumo de caixa deveria retornar storeId correto"
assert cash_summary["isConsistent"] is True, "Resumo de caixa deveria estar consistente"
assert cash_summary["inflow"]["count"] >= 1, "Resumo de caixa deveria ter pelo menos uma entrada"
assert cash_summary["outflow"]["count"] >= 1, "Resumo de caixa deveria ter pelo menos uma saída"
assert cash_summary["bySource"]["accountPayable"]["count"] >= 1, "Resumo de caixa deveria ter origem accountPayable"
assert cash_summary["bySource"]["accountReceivable"]["count"] >= 1, "Resumo de caixa deveria ter origem accountReceivable"
assert Decimal(str(cash_summary["inflow"]["amount"])) >= Decimal(str(received_response["receivedAmount"])), "Entradas deveriam contemplar o recebimento"
assert Decimal(str(cash_summary["outflow"]["amount"])) >= Decimal(str(received_response["receivedAmount"])) or cash_summary["outflow"]["count"] >= 1, "Saídas deveriam contemplar pagamento"
assert Decimal(str(cash_summary["balance"])) == Decimal(str(cash_summary["inflow"]["amount"])) - Decimal(str(cash_summary["outflow"]["amount"])), "Saldo de caixa deveria ser entrada menos saída"
PYVALIDATION

json_request PATCH "/api/v1/accounts-receivable/${RECEIVED_ACCOUNT_RECEIVABLE_ID}/receive" "400" "$RECEIVE_ACCOUNT_RECEIVABLE_PAYLOAD" >/dev/null
json_request PATCH "/api/v1/sales/${RECEIVED_SALE_ID}/cancel" "400" "$CANCEL_SALE_PAYLOAD" >/dev/null

FINANCIAL_AUDIT_STORE_SUMMARY_RESPONSE="$(json_request GET "/api/v1/financial-audit/stores/${STORE_ID}/summary" "200" "" )"

FINANCIAL_AUDIT_STORE_SUMMARY_RESPONSE="$FINANCIAL_AUDIT_STORE_SUMMARY_RESPONSE" CASH_MOVEMENTS_STORE_SUMMARY_RESPONSE="$CASH_MOVEMENTS_STORE_SUMMARY_RESPONSE" RECEIVED_ACCOUNT_RECEIVABLE_RESPONSE="$RECEIVED_ACCOUNT_RECEIVABLE_RESPONSE" PAID_ACCOUNT_PAYABLE_RESPONSE="$PAID_ACCOUNT_PAYABLE_RESPONSE" SALE_RESPONSE="$SALE_RESPONSE" RECEIVED_SALE_RESPONSE="$RECEIVED_SALE_RESPONSE" PURCHASE_RESPONSE="$PURCHASE_RESPONSE" PAID_PURCHASE_RESPONSE="$PAID_PURCHASE_RESPONSE" STORE_ID="$STORE_ID" python3 - <<'PYVALIDATION'
import json
import os
from decimal import Decimal

summary = json.loads(os.environ["FINANCIAL_AUDIT_STORE_SUMMARY_RESPONSE"])["data"]
cash_summary = json.loads(os.environ["CASH_MOVEMENTS_STORE_SUMMARY_RESPONSE"])["data"]
received_account = json.loads(os.environ["RECEIVED_ACCOUNT_RECEIVABLE_RESPONSE"])["data"]
paid_account = json.loads(os.environ["PAID_ACCOUNT_PAYABLE_RESPONSE"])["data"]
sale = json.loads(os.environ["SALE_RESPONSE"])["data"]
received_sale = json.loads(os.environ["RECEIVED_SALE_RESPONSE"])["data"]
canceled_purchase = json.loads(os.environ["PURCHASE_RESPONSE"])["data"]
paid_purchase = json.loads(os.environ["PAID_PURCHASE_RESPONSE"])["data"]
store_id = os.environ["STORE_ID"]

assert summary["storeId"] == store_id, "storeId do resumo financeiro não bate"
assert summary["store"]["id"] == store_id, "store.id do resumo financeiro não bate"
assert summary["isConsistent"] is True, "Resumo financeiro deveria estar consistente"
assert summary["checks"]["accountsPayableStatusBreakdownMatchesTotal"] is True, (
    "Resumo de contas a pagar deveria bater com total"
)
assert summary["checks"]["accountsReceivableStatusBreakdownMatchesTotal"] is True, (
    "Resumo de contas a receber deveria bater com total"
)
assert summary["checks"]["cashMovementBreakdownMatchesTotal"] is True, (
    "Resumo de movimentações de caixa deveria bater com total"
)
assert summary["checks"]["cashBalanceMatchesInflowMinusOutflow"] is True, (
    "Saldo de caixa deveria bater com entradas menos saídas"
)

accounts_payable = summary["accountsPayable"]
accounts_receivable = summary["accountsReceivable"]

for group_name, group in [("accountsPayable", accounts_payable), ("accountsReceivable", accounts_receivable)]:
    assert "open" in group, f"{group_name} deveria ter open"
    assert "canceled" in group, f"{group_name} deveria ter canceled"
    assert "total" in group, f"{group_name} deveria ter total"
    for bucket_name, bucket in group.items():
        assert "count" in bucket, f"{group_name}.{bucket_name} deveria ter count"
        assert "amount" in bucket, f"{group_name}.{bucket_name} deveria ter amount"
        assert bucket["count"] >= 0, f"{group_name}.{bucket_name}.count não pode ser negativo"
        Decimal(str(bucket["amount"]))

expected_canceled_receivable_amount = Decimal(str(sale["total"]))
expected_received_receivable_amount = Decimal(str(received_sale["total"]))
expected_canceled_payable_amount = Decimal(str(canceled_purchase["total"]))
expected_paid_payable_amount = Decimal(str(paid_purchase["total"]))

assert accounts_receivable["canceled"]["count"] >= 1, (
    "Resumo deveria ter pelo menos 1 conta a receber cancelada"
)
assert Decimal(str(accounts_receivable["canceled"]["amount"])) >= expected_canceled_receivable_amount, (
    "Valor cancelado de contas a receber deveria contemplar a venda cancelada do smoke"
)

assert accounts_receivable["received"]["count"] >= 1, (
    "Resumo deveria ter pelo menos 1 conta a receber recebida"
)
assert Decimal(str(accounts_receivable["received"]["amount"])) >= expected_received_receivable_amount, (
    "Valor recebido de contas a receber deveria contemplar a venda recebida do smoke"
)

assert accounts_payable["canceled"]["count"] >= 1, (
    "Resumo deveria ter pelo menos 1 conta a pagar cancelada"
)
assert Decimal(str(accounts_payable["canceled"]["amount"])) >= expected_canceled_payable_amount, (
    "Valor cancelado de contas a pagar deveria contemplar a compra cancelada do smoke"
)

assert accounts_payable["paid"]["count"] >= 1, (
    "Resumo deveria ter pelo menos 1 conta a pagar paga"
)
assert Decimal(str(accounts_payable["paid"]["amount"])) >= expected_paid_payable_amount, (
    "Valor pago de contas a pagar deveria contemplar a compra paga do smoke"
)

assert Decimal(str(summary["netOpenAmount"])) == (
    Decimal(str(accounts_receivable["open"]["amount"])) - Decimal(str(accounts_payable["open"]["amount"]))
), "netOpenAmount deveria ser recebíveis em aberto menos pagáveis em aberto"

assert "cashMovements" in summary, "Resumo financeiro deveria retornar cashMovements"
assert summary["cashMovements"]["inflow"]["count"] >= 1, "Resumo financeiro deveria ter entrada de caixa"
assert summary["cashMovements"]["outflow"]["count"] >= 1, "Resumo financeiro deveria ter saída de caixa"
assert Decimal(str(summary["cashMovements"]["inflow"]["amount"])) >= Decimal(str(received_account["receivedAmount"])), "Entradas financeiras deveriam contemplar recebimento"
assert Decimal(str(summary["cashMovements"]["outflow"]["amount"])) >= Decimal(str(paid_account["paidAmount"])), "Saídas financeiras deveriam contemplar pagamento"
assert Decimal(str(summary["cashBalance"])) == Decimal(str(summary["cashMovements"]["balance"])), "cashBalance deveria bater com resumo de caixa"
assert Decimal(str(cash_summary["balance"])) == Decimal(str(summary["cashMovements"]["balance"])), "Resumo de caixa dedicado e financeiro deveriam bater"
PYVALIDATION

json_request GET "/api/v1/stock-audit/products/00000000-0000-0000-0000-000000009999" "404" "" >/dev/null

PURCHASE_WITH_DUPLICATED_PRODUCTS_PAYLOAD="$(cat <<JSON
{
  "storeId": "${STORE_ID}",
  "supplierId": "${SUPPLIER_ID}",
  "document": "SMOKE-PURCHASE-DUPLICATED-${SMOKE_SUFFIX}",
  "items": [
    {
      "productId": "${PRODUCT_ID}",
      "quantity": 1,
      "unitCost": 10,
      "discount": 0
    },
    {
      "productId": "${PRODUCT_ID}",
      "quantity": 1,
      "unitCost": 10,
      "discount": 0
    }
  ],
  "discount": 0
}
JSON
)"

json_request POST "/api/v1/purchases" "400" "$PURCHASE_WITH_DUPLICATED_PRODUCTS_PAYLOAD" >/dev/null


echo "Smoke test concluído com sucesso."
