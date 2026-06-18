import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { ensureUserCanWriteStore } from '../auth/store-access';
import { ParsedPagination } from '../common/pagination';
import { DatabaseService } from '../database/database.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';

const stockMovementInclude = {
  store: {
    select: {
      id: true,
      name: true,
      tradeName: true
    }
  },
  product: {
    select: {
      id: true,
      name: true,
      internalCode: true,
      barcode: true,
      currentStock: true
    }
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true
    }
  }
} satisfies Prisma.StockMovementInclude;

type StockMovementWithRelations = Prisma.StockMovementGetPayload<{
  include: typeof stockMovementInclude;
}>;

type FindAllStockMovementsParams = {
  storeId?: string;
  productId?: string;
  saleId?: string;
  type?: StockMovementType;
  pagination: ParsedPagination;
  user: AuthenticatedUser;
};

@Injectable()
export class StockMovementsService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService
  ) {}

  private decimalToNumber(value: Prisma.Decimal | number) {
    return Number(value);
  }

  private formatStockMovement(stockMovement: StockMovementWithRelations) {
    return {
      id: stockMovement.id,
      storeId: stockMovement.storeId,
      productId: stockMovement.productId,
      userId: stockMovement.userId,
      saleId: stockMovement.saleId,
      type: stockMovement.type,
      quantity: this.decimalToNumber(stockMovement.quantity),
      beforeStock: this.decimalToNumber(stockMovement.beforeStock),
      afterStock: this.decimalToNumber(stockMovement.afterStock),
      reason: stockMovement.reason,
      document: stockMovement.document,
      store: stockMovement.store,
      product: {
        ...stockMovement.product,
        currentStock: this.decimalToNumber(stockMovement.product.currentStock)
      },
      user: stockMovement.user,
      createdAt: stockMovement.createdAt
    };
  }

  private getAllowedStoreIds(user: AuthenticatedUser) {
    return user.stores.map((store) => store.id);
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

  async findAll(params: FindAllStockMovementsParams) {
    const allowedStoreIds = this.getAllowedStoreIds(params.user);

    if (allowedStoreIds.length === 0) {
      return {
        total: 0,
        data: []
      };
    }

    if (params.storeId) {
      this.ensureUserCanReadStore(params.user, params.storeId);
    }

    const where: Prisma.StockMovementWhereInput = {
      storeId: params.storeId
        ? params.storeId
        : {
            in: allowedStoreIds
          },
      ...(params.productId ? { productId: params.productId } : {}),
      ...(params.saleId ? { saleId: params.saleId } : {}),
      ...(params.type ? { type: params.type } : {})
    };

    const [total, stockMovements] = await this.database.$transaction([
      this.database.stockMovement.count({
        where
      }),
      this.database.stockMovement.findMany({
        where,
        skip: params.pagination.skip,
        take: params.pagination.take,
        orderBy: {
          createdAt: 'desc'
        },
        include: stockMovementInclude
      })
    ]);

    return {
      total,
      data: stockMovements.map((stockMovement) =>
        this.formatStockMovement(stockMovement)
      )
    };
  }

  async create(input: CreateStockMovementDto, user: AuthenticatedUser) {
    ensureUserCanWriteStore(user, input.storeId);

    return this.database.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: {
          id: input.productId
        },
        select: {
          id: true,
          name: true,
          storeId: true,
          currentStock: true
        }
      });

      if (!product) {
        throw new NotFoundException('Produto não encontrado');
      }

      if (product.storeId !== input.storeId) {
        throw new BadRequestException({
          code: 'PRODUCT_STORE_MISMATCH',
          message: 'Produto não pertence à loja informada'
        });
      }

      const beforeStock = new Prisma.Decimal(product.currentStock);
      const quantity = new Prisma.Decimal(input.quantity);

      let afterStock: Prisma.Decimal;

      if (input.type === StockMovementType.IN) {
        afterStock = beforeStock.plus(quantity);
      } else if (input.type === StockMovementType.OUT) {
        afterStock = beforeStock.minus(quantity);

        if (afterStock.lessThan(0)) {
          throw new BadRequestException({
            code: 'INSUFFICIENT_STOCK',
            message: 'Estoque insuficiente para realizar a saída'
          });
        }
      } else {
        afterStock = quantity;
      }

      const stockMovement = await tx.stockMovement.create({
        data: {
          storeId: input.storeId,
          productId: input.productId,
          userId: user.id,
          type: input.type,
          quantity,
          beforeStock,
          afterStock,
          reason: input.reason,
          document: input.document
        },
        include: stockMovementInclude
      });

      await tx.product.update({
        where: {
          id: input.productId
        },
        data: {
          currentStock: afterStock
        }
      });

      return this.formatStockMovement(stockMovement);
    });
  }
}
