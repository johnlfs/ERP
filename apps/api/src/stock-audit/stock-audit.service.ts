import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { DatabaseService } from '../database/database.service';

const stockAuditMovementSelect = {
  id: true,
  storeId: true,
  productId: true,
  userId: true,
  saleId: true,
  purchaseId: true,
  type: true,
  quantity: true,
  beforeStock: true,
  afterStock: true,
  reason: true,
  document: true,
  createdAt: true
} satisfies Prisma.StockMovementSelect;

const stockAuditProductSelect = {
  id: true,
  storeId: true,
  internalCode: true,
  barcode: true,
  name: true,
  currentStock: true,
  store: {
    select: {
      id: true,
      name: true,
      tradeName: true
    }
  }
} satisfies Prisma.ProductSelect;

type StockAuditMovement = Prisma.StockMovementGetPayload<{
  select: typeof stockAuditMovementSelect;
}>;

type StockAuditProduct = Prisma.ProductGetPayload<{
  select: typeof stockAuditProductSelect;
}>;

@Injectable()
export class StockAuditService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService
  ) {}

  private decimalToNumber(value: Prisma.Decimal | number) {
    return Number(value);
  }

  private ensureUserCanReadStore(user: AuthenticatedUser, storeId: string) {
    const hasAccess = user.stores.some((store) => store.id === storeId);

    if (!hasAccess) {
      throw new ForbiddenException({
        code: 'STORE_ACCESS_DENIED',
        message: 'Usuário não possui acesso à loja informada'
      });
    }
  }

  private formatMovement(movement: StockAuditMovement) {
    return {
      id: movement.id,
      storeId: movement.storeId,
      productId: movement.productId,
      userId: movement.userId,
      saleId: movement.saleId,
      purchaseId: movement.purchaseId,
      type: movement.type,
      quantity: this.decimalToNumber(movement.quantity),
      beforeStock: this.decimalToNumber(movement.beforeStock),
      afterStock: this.decimalToNumber(movement.afterStock),
      reason: movement.reason,
      document: movement.document,
      createdAt: movement.createdAt
    };
  }

  private buildProductAudit(
    product: StockAuditProduct,
    movements: StockAuditMovement[]
  ) {
    const currentStock = new Prisma.Decimal(product.currentStock);
    const latestMovement = movements.at(-1) ?? null;
    const calculatedStock = latestMovement
      ? new Prisma.Decimal(latestMovement.afterStock)
      : currentStock;

    const brokenTransitions: Array<{
      movementId: string;
      previousMovementId: string;
      expectedBeforeStock: number;
      actualBeforeStock: number;
    }> = [];

    for (let index = 1; index < movements.length; index += 1) {
      const previousMovement = movements[index - 1];
      const movement = movements[index];
      const expectedBeforeStock = new Prisma.Decimal(previousMovement.afterStock);
      const actualBeforeStock = new Prisma.Decimal(movement.beforeStock);

      if (!actualBeforeStock.equals(expectedBeforeStock)) {
        brokenTransitions.push({
          movementId: movement.id,
          previousMovementId: previousMovement.id,
          expectedBeforeStock: this.decimalToNumber(expectedBeforeStock),
          actualBeforeStock: this.decimalToNumber(actualBeforeStock)
        });
      }
    }

    const isCurrentStockConsistent = currentStock.equals(calculatedStock);
    const isMovementChainConsistent = brokenTransitions.length === 0;

    return {
      productId: product.id,
      storeId: product.storeId,
      product: {
        id: product.id,
        storeId: product.storeId,
        internalCode: product.internalCode,
        barcode: product.barcode,
        name: product.name,
        currentStock: this.decimalToNumber(product.currentStock)
      },
      store: product.store,
      currentStock: this.decimalToNumber(currentStock),
      calculatedStock: this.decimalToNumber(calculatedStock),
      isConsistent: isCurrentStockConsistent && isMovementChainConsistent,
      isCurrentStockConsistent,
      isMovementChainConsistent,
      totalMovements: movements.length,
      latestMovement: latestMovement ? this.formatMovement(latestMovement) : null,
      brokenTransitions,
      movements: movements.map((movement) => this.formatMovement(movement))
    };
  }

  async auditProduct(productId: string, user: AuthenticatedUser) {
    const product = await this.database.product.findUnique({
      where: {
        id: productId
      },
      select: stockAuditProductSelect
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    this.ensureUserCanReadStore(user, product.storeId);

    const movements = await this.database.stockMovement.findMany({
      where: {
        productId: product.id
      },
      orderBy: {
        createdAt: 'asc'
      },
      select: stockAuditMovementSelect
    });

    return this.buildProductAudit(product, movements);
  }

  async auditStoreSummary(storeId: string, user: AuthenticatedUser) {
    const store = await this.database.store.findUnique({
      where: {
        id: storeId
      },
      select: {
        id: true,
        name: true,
        tradeName: true
      }
    });

    if (!store) {
      throw new NotFoundException('Loja não encontrada');
    }

    this.ensureUserCanReadStore(user, store.id);

    const products = await this.database.product.findMany({
      where: {
        storeId: store.id
      },
      orderBy: {
        name: 'asc'
      },
      select: stockAuditProductSelect
    });

    const productIds = products.map((product) => product.id);

    const movements = productIds.length
      ? await this.database.stockMovement.findMany({
          where: {
            storeId: store.id,
            productId: {
              in: productIds
            }
          },
          orderBy: [
            {
              productId: 'asc'
            },
            {
              createdAt: 'asc'
            }
          ],
          select: stockAuditMovementSelect
        })
      : [];

    const movementsByProductId = new Map<string, StockAuditMovement[]>();

    for (const movement of movements) {
      const productMovements = movementsByProductId.get(movement.productId) ?? [];
      productMovements.push(movement);
      movementsByProductId.set(movement.productId, productMovements);
    }

    const productAudits = products.map((product) =>
      this.buildProductAudit(product, movementsByProductId.get(product.id) ?? [])
    );

    const items = productAudits.map((audit) => ({
      productId: audit.productId,
      storeId: audit.storeId,
      product: audit.product,
      currentStock: audit.currentStock,
      calculatedStock: audit.calculatedStock,
      isConsistent: audit.isConsistent,
      isCurrentStockConsistent: audit.isCurrentStockConsistent,
      isMovementChainConsistent: audit.isMovementChainConsistent,
      totalMovements: audit.totalMovements,
      latestMovement: audit.latestMovement,
      brokenTransitions: audit.brokenTransitions
    }));
    const inconsistentItems = items.filter((item) => !item.isConsistent);

    return {
      storeId: store.id,
      store,
      totalProducts: items.length,
      consistentProducts: items.length - inconsistentItems.length,
      inconsistentProducts: inconsistentItems.length,
      isConsistent: inconsistentItems.length === 0,
      inconsistentItems,
      items
    };
  }
}
