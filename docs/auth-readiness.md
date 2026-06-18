# RetailFlow Pro — Auth Readiness

Esta documentação registra a preparação feita antes da Fase 1.16 — Auth + contexto de usuário/loja.

## Estado atual

A base da API já possui:

- API versionada em `/api/v1`
- Swagger em `/api/docs`
- Prisma migrations versionadas
- DTOs de query
- ValidationPipe global
- Filtro global de erros
- CRUD básico de categories
- CRUD básico de products
- Product com category obrigatória
- Smoke test com escrita e limpeza automática

## Variáveis de ambiente atuais

As variáveis mínimas para o ambiente atual são:

```env
NODE_ENV=development
API_PORT=53001
API_URL=http://localhost:53001
WEB_URL=http://localhost:53000
PDV_URL=http://localhost:53002

DATABASE_URL=postgresql://retailflow:change-me@localhost:5434/retailflow_db?schema=public
DB_USER=retailflow
DB_PASSWORD=change-me
DB_NAME=retailflow_db

REDIS_PASSWORD=change-me
```

## Variáveis previstas para Auth

A partir da Fase 1.16, a autenticação deve usar:

```env
JWT_SECRET=change-me-super-secret-jwt-key-with-at-least-32-chars
JWT_EXPIRES_IN=1d
APP_ENCRYPTION_KEY=change-me-32-chars-minimum-secret-key
BCRYPT_SALT_ROUNDS=12
```

## Comandos úteis

Validar ambiente:

```bash
pnpm check:env
```

Validar API:

```bash
cd apps/api
pnpm typecheck
pnpm build
```

Rodar smoke test:

```bash
pnpm smoke:api
```

Validar migrations:

```bash
cd packages/database
pnpm db:status
```

## Próxima fase

A próxima etapa recomendada é:

```txt
Fase 1.16 — Auth + contexto de usuário/loja
```

Escopo inicial recomendado:

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- hash de senha
- JWT
- AuthGuard
- decorator `CurrentUser`
- validação de usuário ativo
- validação de vínculo usuário/loja
- proteção inicial das rotas de escrita
