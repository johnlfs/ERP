import {
  BadRequestException,
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

  private formatMovement(movement: StockMovementWithRelations) {
    return {
      id: movement.id,
      storeId: movement.storeId,
      productId: movement.productId,
      userId: movement.userId,
      type: movement.type,
      quantity: this.decimalToNumber(movement.quantity),
      beforeStock: this.decimalToNumber(movement.beforeStock),
      afterStock: this.decimalToNumber(movement.afterStock),
      reason: movement.reason,
      document: movement.document,
      store: movement.store,
      product: {
        ...movement.product,
        currentStock: this.decimalToNumber(movement.product.currentStock)
      },
      user: movement.user,
      createdAt: movement.createdAt
    };
  }

  private getAllowedStoreIds(user: AuthenticatedUser) {
    return user.stores.map((store) => store.id);
  }

  async findAll(params: FindAllStockMovementsParams) {
    const allowedStoreIds = this.getAllowedStoreIds(params.user);

    if (allowedStoreIds.length === 0) {
      return {
        total: 0,
        data: []
      };
    }

    if (params.storeId && !allowedStoreIds.includes(params.storeId)) {
      throw new BadRequestException({
        code: 'STORE_ACCESS_DENIED',
        message: 'Usuário não possui acesso à loja informada'
      });
    }

    const where: Prisma.StockMovementWhereInput = {
      storeId: params.storeId
        ? params.storeId
        : {
            in: allowedStoreIds
          },
      ...(params.productId ? { productId: params.productId } : {}),
      ...(params.type ? { type: params.type } : {})
    };

    const [total, movements] = await this.database.$transaction([
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
      data: movements.map((movement) => this.formatMovement(movement))
    };
  }

  async create(input: CreateStockMovementDto, user: AuthenticatedUser) {
    ensureUserCanWriteStore(user, input.storeId);

    const quantity = new Prisma.Decimal(input.quantity);

    return this.database.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: {
          id: input.productId
        },
        select: {
          id: true,
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
      let afterStock: Prisma.Decimal;

      if (input.type === StockMovementType.IN) {
        afterStock = beforeStock.plus(quantity);
      } else if (input.type === StockMovementType.OUT) {
        afterStock = beforeStock.minus(quantity);

        if (afterStock.lessThan(0)) {
          throw new BadRequestException({
            code: 'INSUFFICIENT_STOCK',
            message: 'Estoque insuficiente para saída'
          });
        }
      } else {
        afterStock = quantity;
      }

      const movement = await tx.stockMovement.create({
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

      return this.formatMovement(movement);
    });
  }
}
