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
request GET "/api/v1/stock-audit/products/00000000-0000-0000-0000-000000000001" "401"
request GET "/api/v1/stock-audit/stores/${STORE_ID}/summary" "401"


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

json_request GET "/api/v1/accounts-payable?page=1&pageSize=10&status=INVALID" "400" "" >/dev/null
json_request GET "/api/v1/accounts-payable?page=1&pageSize=10&storeId=abc" "400" "" >/dev/null
json_request GET "/api/v1/accounts-payable?page=1&pageSize=10&dueDateFrom=2030-02-01T00:00:00.000Z&dueDateTo=2030-01-01T00:00:00.000Z" "400" "" >/dev/null
json_request GET "/api/v1/accounts-payable/00000000-0000-0000-0000-000000009999" "404" "" >/dev/null

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

CUSTOMER_ID="$CUSTOMER_ID" SALE_RESPONSE="$SALE_RESPONSE" python3 - <<'PYVALIDATION'
import json
import os

customer_id = os.environ["CUSTOMER_ID"]
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

PRODUCT_AFTER_SALE_RESPONSE="$(json_request GET "/api/v1/products/${PRODUCT_ID}" "200" "" )"

printf '%s' "$PRODUCT_AFTER_SALE_RESPONSE" | python3 -c 'import sys,json; payload=json.load(sys.stdin); current=float(payload["data"]["currentStock"]); assert current == 12.0, f"Estoque final esperado após venda era 12, veio {current}"'

json_request GET "/api/v1/sales?page=1&pageSize=10" "200" "" >/dev/null
json_request GET "/api/v1/sales/${SALE_ID}" "200" "" >/dev/null

CANCEL_SALE_PAYLOAD="$(cat <<JSON
{
  "reason": "Cancelamento pelo smoke test"
}
JSON
)"

CANCELED_SALE_RESPONSE="$(json_request PATCH "/api/v1/sales/${SALE_ID}/cancel" "200" "$CANCEL_SALE_PAYLOAD")"

CANCELED_SALE_RESPONSE="$CANCELED_SALE_RESPONSE" python3 - <<'PYVALIDATION'
import json
import os

payload = json.loads(os.environ["CANCELED_SALE_RESPONSE"])
sale = payload["data"]

assert sale["status"] == "CANCELED", f"Status esperado CANCELED, veio {sale.get('status')}"
assert sale["canceledAt"] is not None, "canceledAt deveria estar preenchido"
assert sale["canceledByUserId"] is not None, "canceledByUserId deveria estar preenchido"
assert sale["cancellationReason"] == "Cancelamento pelo smoke test", (
    f"cancellationReason inesperado: {sale.get('cancellationReason')}"
)
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

json_request PATCH "/api/v1/accounts-payable/${PAID_ACCOUNT_PAYABLE_ID}/pay" "400" "$PAY_ACCOUNT_PAYABLE_PARTIAL_PAYLOAD" >/dev/null

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
PAID_PURCHASE_AFTER_PAY_RESPONSE="$(json_request GET "/api/v1/purchases/${PAID_PURCHASE_ID}" "200" "" )"

PAID_PURCHASE_RESPONSE="$PAID_PURCHASE_RESPONSE" PAID_ACCOUNT_PAYABLE_RESPONSE="$PAID_ACCOUNT_PAYABLE_RESPONSE" PAID_ACCOUNT_PAYABLE_BY_ID_RESPONSE="$PAID_ACCOUNT_PAYABLE_BY_ID_RESPONSE" PAID_ACCOUNT_PAYABLE_BY_STATUS_RESPONSE="$PAID_ACCOUNT_PAYABLE_BY_STATUS_RESPONSE" PAID_ACCOUNT_PAYABLE_OPEN_AFTER_PAY_RESPONSE="$PAID_ACCOUNT_PAYABLE_OPEN_AFTER_PAY_RESPONSE" PAID_ACCOUNT_PAYABLE_BY_METHOD_SEARCH_RESPONSE="$PAID_ACCOUNT_PAYABLE_BY_METHOD_SEARCH_RESPONSE" PAID_PURCHASE_AFTER_PAY_RESPONSE="$PAID_PURCHASE_AFTER_PAY_RESPONSE" PAID_PURCHASE_ID="$PAID_PURCHASE_ID" PAID_ACCOUNT_PAYABLE_ID="$PAID_ACCOUNT_PAYABLE_ID" SUPPLIER_ID="$SUPPLIER_ID" STORE_ID="$STORE_ID" python3 - <<'PYVALIDATION'
import json
import os
from decimal import Decimal

paid_purchase = json.loads(os.environ["PAID_PURCHASE_RESPONSE"])["data"]
paid_response = json.loads(os.environ["PAID_ACCOUNT_PAYABLE_RESPONSE"])["data"]
paid_by_id = json.loads(os.environ["PAID_ACCOUNT_PAYABLE_BY_ID_RESPONSE"])["data"]
paid_by_status = json.loads(os.environ["PAID_ACCOUNT_PAYABLE_BY_STATUS_RESPONSE"])["data"]
open_after_pay = json.loads(os.environ["PAID_ACCOUNT_PAYABLE_OPEN_AFTER_PAY_RESPONSE"])["data"]
method_search = json.loads(os.environ["PAID_ACCOUNT_PAYABLE_BY_METHOD_SEARCH_RESPONSE"])["data"]
paid_purchase_after_pay = json.loads(os.environ["PAID_PURCHASE_AFTER_PAY_RESPONSE"])["data"]

paid_purchase_id = os.environ["PAID_PURCHASE_ID"]
paid_account_payable_id = os.environ["PAID_ACCOUNT_PAYABLE_ID"]
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

paid_purchase_payable = paid_purchase_after_pay["accountPayable"]
assert paid_purchase_after_pay["id"] == paid_purchase_id, "Busca da compra paga retornou id incorreto"
assert paid_purchase_payable["id"] == paid_account_payable_id, "Compra paga deveria retornar conta correta"
assert paid_purchase_payable["status"] == "PAID", "Compra paga deveria retornar accountPayable PAID"
assert paid_purchase_payable["paidAt"] is not None, "Compra paga deveria retornar paidAt na conta"
assert paid_purchase_payable["paidByUserId"] is not None, "Compra paga deveria retornar paidByUserId na conta"
assert paid_purchase_payable["paidAmount"] == paid_purchase_payable["amount"], (
    "Compra paga deveria retornar paidAmount igual ao amount da conta"
)
PYVALIDATION

json_request PATCH "/api/v1/accounts-payable/${PAID_ACCOUNT_PAYABLE_ID}/pay" "400" "$PAY_ACCOUNT_PAYABLE_PAYLOAD" >/dev/null
json_request PATCH "/api/v1/purchases/${PAID_PURCHASE_ID}/cancel" "400" "$CANCEL_PURCHASE_PAYLOAD" >/dev/null

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
