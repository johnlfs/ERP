# RetailFlow Pro — Auth

Documentação da autenticação inicial da API.

## Estado atual

A API possui autenticação JWT para rotas de escrita do catálogo.

Rotas públicas atuais:

- GET /health
- GET /api/v1/database/status
- GET /api/v1/stores
- GET /api/v1/categories
- GET /api/v1/categories/:id
- GET /api/v1/products
- GET /api/v1/products/:id

Rotas de autenticação:

- POST /api/v1/auth/login
- GET /api/v1/auth/me

Rotas protegidas por autenticação e role:

- POST /api/v1/categories
- PATCH /api/v1/categories/:id
- PATCH /api/v1/categories/:id/status
- POST /api/v1/products
- PATCH /api/v1/products/:id
- PATCH /api/v1/products/:id/status

## Login

Endpoint:

    POST /api/v1/auth/login

Body:

    {
      "email": "admin@retailflow.local",
      "password": "senha-local"
    }

Resposta esperada:

    {
      "status": "ok",
      "data": {
        "accessToken": "jwt-token",
        "tokenType": "Bearer",
        "user": {
          "id": "uuid",
          "name": "Administrador Demo",
          "email": "admin@retailflow.local",
          "stores": [
            {
              "id": "uuid",
              "name": "Loja Demonstração",
              "tradeName": "RetailFlow Demo",
              "role": "ADMIN",
              "status": "ACTIVE"
            }
          ]
        }
      }
    }

## Envio do token

As rotas protegidas usam o header:

    Authorization: Bearer <accessToken>

## Contexto de usuário e loja

O token identifica o usuário.

O endpoint /api/v1/auth/me retorna o usuário autenticado e as lojas ativas vinculadas a ele.

As escritas em categories e products validam:

1. Token JWT válido.
2. Usuário ativo.
3. Usuário com vínculo ativo na loja.
4. Usuário com role permitida para escrita na loja.

## Roles

A role inicial permitida para escrita é:

    ADMIN

A validação acontece em duas camadas:

1. RolesGuard, usando @Roles(UserRole.ADMIN).
2. Validação por loja nos services, usando ensureUserCanWriteStore.

Isso evita que um usuário com permissão em uma loja consiga escrever em outra loja sem vínculo válido.

## Usuário demo local

O usuário demo é criado ou atualizado por:

    cd packages/database
    pnpm db:auth:demo

O script não deve imprimir senha no terminal.

A senha local deve ser controlada pelo .env ou pelo fallback local do script.

O .env real não deve ser commitado.

## Validação

Comandos recomendados depois de alterar Auth:

    cd apps/api
    pnpm typecheck
    pnpm build

    cd ../..
    pnpm check:env
    pnpm smoke:api

O smoke test valida:

- endpoints públicos básicos
- login
- /auth/me
- escrita sem token retornando 401
- escrita autenticada no catálogo
- cleanup dos dados criados pelo smoke
