# RetailFlow Pro

**RetailFlow Pro** é uma plataforma ERP/POS moderna para varejo, construída em arquitetura modular, com foco em multi-loja, controle operacional, estoque, vendas, compras e financeiro.

O objetivo do projeto é oferecer uma base sólida para pequenos negócios, redes varejistas e operações com múltiplas filiais, permitindo evolução incremental para PDV, dashboard gerencial, relatórios, integrações e módulos fiscais.

---

## Visão geral

O sistema está sendo desenvolvido como um monorepo com API backend, banco de dados versionado, scripts de validação e arquitetura preparada para expansão.

Atualmente, o projeto já possui uma base funcional de backend para:

- autenticação e controle de acesso;
- contexto multi-loja;
- cadastro de produtos e categorias;
- cadastro de clientes e fornecedores;
- movimentações de estoque;
- vendas com baixa automática de estoque;
- cancelamento de vendas com reversão de estoque;
- compras com entrada automática de estoque;
- cancelamento de compras com reversão de estoque;
- contas a pagar geradas por compras;
- baixa/pagamento de contas a pagar;
- contas a receber geradas por vendas;
- baixa/recebimento de contas a receber;
- caixa/movimentações financeiras automáticas;
- movimentações manuais de caixa;
- auditoria de estoque;
- auditoria financeira;
- smoke test cobrindo os principais fluxos críticos.

---

## Stack principal

- **Node.js**
- **TypeScript**
- **NestJS**
- **Prisma ORM**
- **PostgreSQL**
- **Redis**
- **Kafka**
- **Docker**
- **pnpm workspaces**
- **JWT Auth**
- **Swagger/OpenAPI**

---

## Estrutura do monorepo

```txt
ERP/
├── apps/
│   ├── api/                # API NestJS
│   ├── web/                # Aplicação web
│   └── pdv/                # Aplicação PDV
├── packages/
│   └── database/           # Prisma, schema, migrations e seed
├── scripts/                # Scripts utilitários e smoke tests
├── docker-compose.yml
├── package.json
└── README.md
```

---

## Módulos implementados na API

### Autenticação

A API possui autenticação baseada em JWT, usuário autenticado e proteção de rotas sensíveis.

Funcionalidades principais:

- login;
- rota `/auth/me`;
- proteção de endpoints privados;
- validação de usuário ativo;
- contexto de loja vinculado ao usuário;
- base para controle de permissões por perfil.

---

### Lojas e contexto multi-loja

O sistema foi preparado para operar com múltiplas lojas/filiais.

Cada operação sensível usa `storeId` para manter isolamento lógico entre unidades, permitindo que uma mesma instalação atenda diferentes filiais.

---

### Categorias e produtos

O módulo de catálogo permite o cadastro e consulta de categorias e produtos.

Funcionalidades principais:

- criação de categorias;
- listagem paginada;
- criação de produtos;
- atualização de produtos;
- ativação/inativação;
- filtros por loja;
- busca textual;
- validações de integridade.

---

### Clientes

O módulo de clientes permite registrar e consultar consumidores ou empresas associadas às vendas.

Funcionalidades principais:

- cadastro de cliente;
- listagem paginada;
- busca;
- atualização;
- ativação/inativação;
- validação de duplicidade documental;
- integração com vendas e contas a receber.

---

### Fornecedores

O módulo de fornecedores permite registrar empresas ou pessoas associadas às compras.

Funcionalidades principais:

- cadastro de fornecedor;
- listagem paginada;
- busca;
- atualização;
- ativação/inativação;
- validação de duplicidade documental;
- integração com compras e contas a pagar.

---

### Estoque

O módulo de estoque registra entradas, saídas e ajustes de produtos por loja.

Funcionalidades principais:

- movimentações manuais de estoque;
- entradas;
- saídas;
- ajuste de saldo;
- histórico de movimentações;
- vínculo com vendas;
- vínculo com compras;
- cálculo de estoque anterior e posterior;
- auditoria de consistência.

---

### Vendas

O módulo de vendas registra operações comerciais e realiza baixa automática de estoque.

Funcionalidades principais:

- criação de venda;
- itens de venda;
- cálculo de subtotal, desconto e total;
- baixa automática de estoque;
- geração automática de conta a receber;
- vínculo com cliente;
- consulta de venda;
- listagem paginada;
- cancelamento de venda;
- reversão de estoque no cancelamento;
- bloqueio de cancelamento quando a conta a receber já foi recebida.

---

### Compras

O módulo de compras registra entrada de mercadorias e realiza entrada automática de estoque.

Funcionalidades principais:

- criação de compra;
- itens de compra;
- cálculo de subtotal, desconto e total;
- entrada automática de estoque;
- geração automática de conta a pagar;
- vínculo com fornecedor;
- consulta de compra;
- listagem paginada;
- cancelamento de compra;
- reversão de estoque no cancelamento;
- bloqueio de cancelamento quando a conta a pagar já foi paga.

---

### Contas a pagar

O módulo de contas a pagar nasce a partir das compras.

Funcionalidades principais:

- geração automática ao criar compra;
- listagem paginada;
- filtros por status, loja, fornecedor, compra e datas;
- consulta por ID;
- baixa/pagamento;
- registro de valor pago;
- método de pagamento;
- data de pagamento;
- usuário responsável;
- bloqueio de pagamento duplicado;
- bloqueio de pagamento de conta cancelada;
- geração automática de saída de caixa.

Status disponíveis:

```txt
OPEN
PAID
CANCELED
```

---

### Contas a receber

O módulo de contas a receber nasce a partir das vendas.

Funcionalidades principais:

- geração automática ao criar venda;
- listagem paginada;
- filtros por status, loja, cliente, venda e datas;
- consulta por ID;
- baixa/recebimento;
- registro de valor recebido;
- método de recebimento;
- data de recebimento;
- usuário responsável;
- bloqueio de recebimento duplicado;
- bloqueio de recebimento de conta cancelada;
- geração automática de entrada de caixa.

Status disponíveis:

```txt
OPEN
RECEIVED
CANCELED
```

---

### Caixa e movimentações financeiras

O módulo de caixa centraliza entradas e saídas financeiras.

As movimentações podem ser geradas automaticamente por pagamentos/recebimentos ou lançadas manualmente.

Funcionalidades principais:

- listagem paginada de movimentações;
- consulta por ID;
- resumo por loja;
- filtro por tipo;
- filtro por origem;
- filtro por conta a pagar;
- filtro por conta a receber;
- filtro por período;
- busca textual;
- entrada automática ao receber conta a receber;
- saída automática ao pagar conta a pagar;
- movimentação manual de entrada;
- movimentação manual de saída;
- proteção contra duplicidade de movimento financeiro para a mesma conta.

Tipos:

```txt
INFLOW
OUTFLOW
```

Origens:

```txt
ACCOUNT_PAYABLE
ACCOUNT_RECEIVABLE
MANUAL
```

---

### Auditoria de estoque

A auditoria de estoque verifica se o saldo atual do produto está consistente com as movimentações registradas.

Funcionalidades principais:

- auditoria por produto;
- auditoria resumida por loja;
- validação entre saldo atual e último movimento;
- suporte a análise de divergências.

---

### Auditoria financeira

A auditoria financeira consolida a visão financeira da loja.

Funcionalidades principais:

- resumo de contas a pagar;
- resumo de contas a receber;
- totais por status;
- valores em aberto;
- valores pagos;
- valores recebidos;
- valores cancelados;
- resumo de caixa;
- saldo financeiro consolidado.

---

## Rotas principais

### Auth

```txt
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

### Produtos e categorias

```txt
GET    /api/v1/categories
POST   /api/v1/categories

GET    /api/v1/products
GET    /api/v1/products/:id
POST   /api/v1/products
PATCH  /api/v1/products/:id
PATCH  /api/v1/products/:id/status
```

### Clientes

```txt
GET    /api/v1/customers
GET    /api/v1/customers/:id
POST   /api/v1/customers
PATCH  /api/v1/customers/:id
PATCH  /api/v1/customers/:id/status
```

### Fornecedores

```txt
GET    /api/v1/suppliers
GET    /api/v1/suppliers/:id
POST   /api/v1/suppliers
PATCH  /api/v1/suppliers/:id
PATCH  /api/v1/suppliers/:id/status
```

### Estoque

```txt
GET    /api/v1/stock-movements
POST   /api/v1/stock-movements

GET    /api/v1/stock-audit/products/:productId
GET    /api/v1/stock-audit/stores/:storeId/summary
```

### Vendas

```txt
GET    /api/v1/sales
GET    /api/v1/sales/:id
POST   /api/v1/sales
PATCH  /api/v1/sales/:id/cancel
```

### Compras

```txt
GET    /api/v1/purchases
GET    /api/v1/purchases/:id
POST   /api/v1/purchases
PATCH  /api/v1/purchases/:id/cancel
```

### Financeiro

```txt
GET    /api/v1/accounts-payable
GET    /api/v1/accounts-payable/:id
PATCH  /api/v1/accounts-payable/:id/pay

GET    /api/v1/accounts-receivable
GET    /api/v1/accounts-receivable/:id
PATCH  /api/v1/accounts-receivable/:id/receive
```

### Caixa

```txt
GET    /api/v1/cash-movements
GET    /api/v1/cash-movements/:id
GET    /api/v1/cash-movements/stores/:storeId/summary
POST   /api/v1/cash-movements/manual
```

### Auditoria financeira

```txt
GET /api/v1/financial-audit/stores/:storeId/summary
```

---

## Smoke test

O projeto possui um smoke test completo para validar os principais fluxos da API.

O smoke cobre:

- healthcheck;
- autenticação;
- endpoints protegidos;
- validações 400;
- validações 401;
- validações 404;
- criação de categoria;
- criação de produtos;
- criação de clientes;
- criação de fornecedores;
- movimentação de estoque;
- venda com baixa de estoque;
- cancelamento de venda;
- compra com entrada de estoque;
- cancelamento de compra;
- contas a pagar;
- pagamento de contas a pagar;
- contas a receber;
- recebimento de contas a receber;
- caixa automático;
- caixa manual;
- auditoria de estoque;
- auditoria financeira;
- cleanup dos dados gerados.

Rodar smoke:

```bash
pnpm smoke:api
```

---

## Validações de desenvolvimento

Comandos usados para validar a API:

```bash
pnpm check:env
```

```bash
cd apps/api
pnpm typecheck
pnpm build
```

```bash
cd /home/lugo/projetos/ERP
bash -n scripts/smoke-api.sh
node --check packages/database/scripts/cleanup-smoke-data.js
pnpm smoke:api
git diff --check
```

---

## Banco de dados

O banco é gerenciado com Prisma.

Comandos principais:

```bash
cd packages/database
pnpm exec dotenv -e ../../.env -- prisma validate
pnpm exec dotenv -e ../../.env -- prisma migrate status
pnpm exec dotenv -e ../../.env -- prisma generate
```

Criar migration:

```bash
cd packages/database
pnpm exec dotenv -e ../../.env -- prisma migrate dev --name nome_da_migration
```

---

## Setup local

Instalar dependências:

```bash
pnpm install
```

Subir infraestrutura:

```bash
docker compose up -d
```

Gerar Prisma Client:

```bash
cd packages/database
pnpm exec dotenv -e ../../.env -- prisma generate
```

Rodar migrations:

```bash
cd packages/database
pnpm exec dotenv -e ../../.env -- prisma migrate dev
```

Subir API:

```bash
cd apps/api
pnpm dev
```

A API utiliza por padrão:

```txt
http://localhost:53001
```

---

## Variáveis de ambiente

O projeto usa arquivo `.env` na raiz.

Exemplo de variáveis esperadas:

```env
DATABASE_URL="postgresql://retailflow:retailflow123@localhost:5434/retailflow_db"
JWT_SECRET="change-me"
JWT_EXPIRES_IN="1d"
API_PORT=53001
```

> Não commitar `.env` real no repositório.

---

## Status atual do projeto

O projeto já possui uma base backend robusta para os fluxos centrais de um ERP varejista.

### Já implementado

```txt
Auth
Multi-loja
Produtos
Categorias
Clientes
Fornecedores
Estoque
Vendas
Cancelamento de vendas
Compras
Cancelamento de compras
Contas a pagar
Pagamento de contas a pagar
Contas a receber
Recebimento de contas a receber
Caixa automático
Caixa manual
Auditoria de estoque
Auditoria financeira
Smoke test completo
Cleanup de dados de teste
```

### Próximas evoluções prováveis

```txt
Dashboard gerencial
Relatórios financeiros
Fechamento de caixa
PDV desktop/touchscreen
Interface web administrativa
Controle fiscal
Emissão/integração fiscal
Permissões avançadas
Logs/auditoria de usuário
Importação/exportação
Integrações externas
Observabilidade
Testes automatizados unitários/e2e
CI/CD
```

---

## Estimativa de progresso

Considerando apenas o **backend core operacional**, o projeto está aproximadamente entre:

```txt
65% e 75%
```

Considerando o **produto ERP completo**, incluindo frontend administrativo, PDV, relatórios avançados, fiscal, permissões refinadas, observabilidade, CI/CD e hardening de produção, o projeto está aproximadamente entre:

```txt
30% e 40%
```

Essa diferença existe porque a base de domínio e API avançou bastante, mas ainda falta transformar a aplicação em um produto completo de uso final.

---

## Licença

Projeto privado/em desenvolvimento.

---

## Autor

Desenvolvido por **John Lennon Fabricio Silveira**.
