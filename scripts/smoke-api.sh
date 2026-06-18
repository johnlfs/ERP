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

json_request GET "/api/v1/purchases?page=1&pageSize=10&search=SMOKE-PURCHASE" "200" "" >/dev/null
json_request GET "/api/v1/purchases/${PURCHASE_ID}" "200" "" >/dev/null

PURCHASE_MOVEMENTS_RESPONSE="$(json_request GET "/api/v1/stock-movements?purchaseId=${PURCHASE_ID}&page=1&pageSize=10" "200" "" )"

PRODUCT_AFTER_PURCHASE_RESPONSE="$(json_request GET "/api/v1/products/${PRODUCT_ID}" "200" "" )"

PURCHASE_RESPONSE="$PURCHASE_RESPONSE" PURCHASE_MOVEMENTS_RESPONSE="$PURCHASE_MOVEMENTS_RESPONSE" PRODUCT_BEFORE_PURCHASE_RESPONSE="$PRODUCT_BEFORE_PURCHASE_RESPONSE" PRODUCT_AFTER_PURCHASE_RESPONSE="$PRODUCT_AFTER_PURCHASE_RESPONSE" PURCHASE_ID="$PURCHASE_ID" SUPPLIER_ID="$SUPPLIER_ID" PRODUCT_ID="$PRODUCT_ID" python3 - <<'PYVALIDATION'
import json
import os

purchase = json.loads(os.environ["PURCHASE_RESPONSE"])["data"]
purchase_movements_payload = json.loads(os.environ["PURCHASE_MOVEMENTS_RESPONSE"])
purchase_movements = purchase_movements_payload["data"]
before_product = json.loads(os.environ["PRODUCT_BEFORE_PURCHASE_RESPONSE"])["data"]
after_product = json.loads(os.environ["PRODUCT_AFTER_PURCHASE_RESPONSE"])["data"]

purchase_id = os.environ["PURCHASE_ID"]
supplier_id = os.environ["SUPPLIER_ID"]
product_id = os.environ["PRODUCT_ID"]

assert purchase["id"] == purchase_id, "ID da compra retornado não bate"
assert purchase["supplierId"] == supplier_id, "supplierId da compra não bate"
assert purchase["supplier"]["id"] == supplier_id, "supplier.id da compra não bate"
assert purchase["status"] == "RECEIVED", "Compra deveria ser RECEIVED"
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
