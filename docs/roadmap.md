# Roadmap — RetailFlow Pro

## Fase 0 — Planejamento Técnico e Escopo

Objetivo:

Definir visão, escopo, limites, stack, entidades principais e roadmap.

Entregas:

- docs/vision.md;
- docs/scope.md;
- docs/non-goals.md;
- docs/roadmap.md.

Status:

Em andamento.

---

## Fase 1 — Monorepo e Infraestrutura Base

Objetivo:

Criar a fundação técnica do projeto.

Entregas:

- monorepo;
- workspaces;
- apps/web;
- apps/pdv;
- apps/api;
- packages compartilhados;
- TypeScript strict;
- ESLint;
- Prettier;
- Docker Compose;
- PostgreSQL;
- Redis;
- Prisma;
- healthcheck da API.

Critério de conclusão:

O projeto deve subir localmente com banco, API e pelo menos uma aplicação Next.js funcionando.

---

## Fase 2 — Design System e Identidade Visual

Objetivo:

Criar base visual profissional e reutilizável.

Entregas:

- Tailwind CSS;
- shadcn/ui;
- tema claro;
- tema escuro;
- layout base;
- sidebar;
- topbar;
- componentes reutilizáveis.

---

## Fase 3 — Autenticação, Lojas e Permissões

Objetivo:

Criar a base de segurança do sistema.

Entregas:

- cadastro;
- login;
- logout;
- sessão;
- criação de loja;
- vínculo usuário-loja;
- perfis ADMIN, MANAGER e CASHIER;
- proteção de rotas;
- guards na API.

---

## Fase 4 — Produtos e Categorias

Objetivo:

Criar o catálogo de produtos.

Entregas:

- CRUD de categorias;
- CRUD de produtos;
- código interno;
- código de barras;
- preço de custo;
- preço de venda;
- margem;
- NCM;
- unidade;
- status;
- busca;
- paginação;
- filtros;
- importação CSV simples.

---

## Fase 5 — Clientes

Objetivo:

Criar base de clientes.

Entregas:

- CRUD de clientes;
- CPF/CNPJ;
- nome;
- telefone;
- e-mail;
- endereço opcional;
- histórico de compras;
- busca rápida no PDV.

---

## Fase 6 — Estoque

Objetivo:

Controlar estoque com rastreabilidade.

Entregas:

- saldo por produto;
- entrada manual;
- saída manual;
- ajuste;
- baixa automática por venda;
- estorno por cancelamento;
- histórico de movimentações;
- estoque mínimo;
- alerta de estoque baixo.

---

## Fase 7 — Caixa

Objetivo:

Criar operação financeira básica do PDV.

Entregas:

- abrir caixa;
- fechar caixa;
- fundo inicial;
- sangria;
- suprimento;
- resumo por forma de pagamento;
- diferença de caixa.

---

## Fase 8 — PDV Online

Objetivo:

Criar venda presencial online.

Entregas:

- tela de PDV;
- busca de produto;
- carrinho;
- descontos;
- cliente;
- forma de pagamento;
- finalização da venda;
- cupom simplificado;
- baixa de estoque;
- financeiro.

---

## Fase 9 — Vendas e Cancelamentos

Objetivo:

Gerenciar ciclo de vida das vendas.

Entregas:

- listagem de vendas;
- detalhes;
- filtros;
- cancelamento;
- estorno de estoque;
- estorno financeiro;
- auditoria.

---

## Fase 10 — Financeiro Básico

Objetivo:

Criar contas a receber e fluxo financeiro simples.

Entregas:

- geração de título a partir da venda;
- pagamento à vista;
- parcelamento simples;
- baixa manual;
- baixa automática;
- títulos em aberto;
- títulos pagos;
- títulos vencidos;
- fluxo de caixa simples.

---

## Fase 11 — Mercado Pago: Configuração de Credenciais

Objetivo:

Permitir que cada loja configure suas próprias credenciais do Mercado Pago.

Entregas:

- tela de integração;
- Public Key;
- Access Token;
- Client ID;
- Client Secret;
- ambiente sandbox/produção;
- criptografia;
- teste de credenciais;
- ativar/desativar integração.

---

## Fase 12 — Mercado Pago: Checkout Pro

Objetivo:

Gerar cobranças reais ou de teste via link de pagamento.

Entregas:

- endpoint para gerar cobrança;
- criação de preferência;
- checkout_url;
- external_reference;
- vínculo com venda;
- vínculo com financeiro.

---

## Fase 13 — Mercado Pago: Webhooks

Objetivo:

Atualizar pagamentos automaticamente.

Entregas:

- endpoint público de webhook;
- registro de payload;
- consulta do pagamento;
- atualização da cobrança;
- baixa financeira;
- logs;
- reprocessamento.

---

## Fase 14 — Tela de Cobranças

Objetivo:

Permitir acompanhamento operacional das cobranças.

Entregas:

- lista;
- filtros;
- detalhes;
- histórico;
- consultar status;
- reenviar cobrança;
- cancelar cobrança quando aplicável.

---

## Fase 15 — Payment Brick Opcional

Objetivo:

Adicionar checkout embutido dentro da aplicação.

Status:

Opcional após Checkout Pro e Webhooks.

---

## Fase 16 — PDV Offline-First

Objetivo:

Permitir operação de PDV sem internet.

Entregas:

- IndexedDB;
- Dexie;
- cache local;
- venda offline;
- fila de sincronização;
- retry;
- tratamento de conflito.

---

## Fase 17 — Fiscal Simulado

Objetivo:

Simular fluxo fiscal brasileiro sem emissão real.

Entregas:

- documento fiscal mockado;
- chave fictícia;
- autorização simulada;
- rejeição simulada;
- DANFE simplificado.

---

## Fase 18 — Dashboard Gerencial

Objetivo:

Criar visão gerencial forte.

Entregas:

- vendas do dia;
- vendas do mês;
- ticket médio;
- produtos mais vendidos;
- estoque baixo;
- cobranças Mercado Pago;
- fluxo de caixa;
- gráficos.

---

## Fase 19 — Auditoria e Logs

Objetivo:

Demonstrar maturidade corporativa.

Entregas:

- log de login;
- log de alterações;
- log de cancelamento;
- log de estoque;
- log de caixa;
- log de credenciais;
- log de webhooks;
- log de erro de integração.

---

## Fase 20 — Testes Automatizados

Objetivo:

Garantir qualidade.

Entregas:

- testes unitários;
- testes de domínio;
- testes de API;
- testes de componentes;
- testes E2E;
- mock de Mercado Pago;
- testes de webhook;
- testes de venda offline.

---

## Fase 21 — CI/CD

Objetivo:

Automatizar validação.

Entregas:

- GitHub Actions;
- lint;
- typecheck;
- testes;
- build;
- coverage;
- badge no README.

---

## Fase 22 — Deploy

Objetivo:

Publicar o sistema.

Entregas:

- deploy web;
- deploy pdv;
- deploy api;
- banco cloud;
- Redis cloud se necessário;
- variáveis de ambiente;
- URL pública de webhook.

---

## Fase 23 — Documentação Final

Objetivo:

Transformar o projeto em portfólio profissional.

Entregas:

- README completo;
- documentação técnica;
- prints;
- vídeo demo;
- roadmap futuro.
