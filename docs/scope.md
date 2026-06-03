# Escopo do Projeto — RetailFlow Pro

## Escopo Geral

O RetailFlow Pro será um sistema ERP/POS para varejo com painel administrativo, PDV, estoque, caixa, financeiro, integração com Mercado Pago e simulação fiscal.

## O Sistema Fará de Verdade

O sistema será capaz de:

- autenticar usuários;
- gerenciar lojas;
- controlar permissões;
- cadastrar produtos;
- cadastrar categorias;
- cadastrar clientes;
- controlar estoque;
- registrar movimentações de estoque;
- abrir caixa;
- fechar caixa;
- registrar sangria;
- registrar suprimento;
- realizar vendas no PDV;
- aplicar descontos;
- vincular clientes às vendas;
- gerar contas a receber;
- registrar pagamento manual;
- gerar cobranças Mercado Pago;
- gerar links reais de pagamento;
- receber webhooks do Mercado Pago;
- atualizar status de cobrança;
- baixar financeiro automaticamente após pagamento aprovado;
- cancelar vendas;
- estornar estoque;
- estornar financeiro;
- operar PDV offline-first;
- sincronizar vendas offline;
- gerar dashboard gerencial;
- registrar auditoria de operações críticas;
- rodar testes automatizados;
- ser publicado em ambiente cloud.

## O Sistema Vai Simular

O sistema irá simular:

- operação de loja física;
- frente de caixa;
- internet instável no PDV;
- sincronização offline-first;
- fluxo financeiro básico;
- fechamento de caixa;
- documento fiscal NFC-e mockado;
- autorização fiscal simulada;
- rejeição fiscal simulada;
- reprocessamento fiscal;
- logs técnicos de integração;
- arquitetura corporativa modular.

## Módulos do Sistema

Os módulos previstos são:

1. Autenticação e permissões;
2. Empresas e lojas;
3. Usuários;
4. Produtos;
5. Categorias;
6. Clientes;
7. Estoque;
8. Caixa;
9. PDV online;
10. PDV offline-first;
11. Vendas;
12. Cancelamentos;
13. Financeiro;
14. Mercado Pago;
15. Webhooks;
16. Fiscal simulado;
17. Dashboard;
18. Auditoria;
19. Testes;
20. CI/CD;
21. Deploy;
22. Documentação final.

## Entidades Principais

As entidades principais previstas inicialmente são:

- User;
- Store;
- StoreUser;
- Role;
- Product;
- Category;
- Customer;
- StockMovement;
- CashRegister;
- CashMovement;
- Sale;
- SaleItem;
- PaymentMethod;
- Receivable;
- MercadoPagoCredential;
- MercadoPagoCharge;
- MercadoPagoWebhookEvent;
- FiscalDocumentMock;
- AuditLog.

## Regras Importantes

### Estoque

Nenhuma alteração de saldo de estoque deve acontecer sem uma movimentação correspondente.

### Caixa

Toda venda presencial deve estar vinculada a um caixa aberto.

### Financeiro

Toda venda finalizada deve gerar um registro financeiro.

### Mercado Pago

Credenciais sensíveis do Mercado Pago devem permanecer somente no back-end.

O Access Token nunca deve ser enviado ao front-end.

Tokens e segredos devem ser criptografados em repouso.

### PDV Offline

O PDV poderá registrar vendas offline, mas não poderá confirmar cobranças Mercado Pago offline.

Cobranças Mercado Pago só serão geradas após sincronização com a API.

### Fiscal

O sistema não emitirá NFC-e real. O fluxo fiscal será apenas simulado.
