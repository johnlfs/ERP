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

type StockAuditMovement = Prisma.StockMovementGetPayload<{
  select: typeof stockAuditMovementSelect;
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

  async auditProduct(productId: string, user: AuthenticatedUser) {
    const product = await this.database.product.findUnique({
      where: {
        id: productId
      },
      select: {
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
      }
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
}
