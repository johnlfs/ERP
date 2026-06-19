import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  Prisma,
  ProductStatus,
  PurchaseStatus,
  StockMovementType
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { ensureUserCanWriteStore } from '../auth/store-access';
import { ParsedPagination } from '../common/pagination';
import { DatabaseService } from '../database/database.service';
import { CancelPurchaseDto } from './dto/cancel-purchase.dto';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

const purchaseInclude = {
  store: {
    select: {
      id: true,
      name: true,
      tradeName: true
    }
  },
  supplier: {
    select: {
      id: true,
      name: true,
      document: true,
      email: true,
      phone: true,
      contactName: true,
      isActive: true
    }
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  canceledBy: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          internalCode: true,
          barcode: true,
          currentStock: true
        }
      }
    }
  },
  stockMovements: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          internalCode: true,
          barcode: true,
          currentStock: true
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  }
} satisfies Prisma.PurchaseInclude;

const purchaseCancellationInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          currentStock: true
        }
      }
    }
  }
} satisfies Prisma.PurchaseInclude;

type PurchaseWithRelations = Prisma.PurchaseGetPayload<{
  include: typeof purchaseInclude;
}>;

type PurchaseForCancellation = Prisma.PurchaseGetPayload<{
  include: typeof purchaseCancellationInclude;
}>;

type FindAllPurchasesParams = {
  storeId?: string;
  supplierId?: string;
  status?: PurchaseStatus;
  search?: string;
  pagination: ParsedPagination;
  user: AuthenticatedUser;
};

@Injectable()
export class PurchasesService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService
  ) {}

  private decimalToNumber(value: Prisma.Decimal | number) {
    return Number(value);
  }

  private formatPurchase(purchase: PurchaseWithRelations) {
    return {
      id: purchase.id,
      storeId: purchase.storeId,
      supplierId: purchase.supplierId,
      userId: purchase.userId,
      status: purchase.status,
      subtotal: this.decimalToNumber(purchase.subtotal),
      discount: this.decimalToNumber(purchase.discount),
      total: this.decimalToNumber(purchase.total),
      document: purchase.document,
      notes: purchase.notes,
      canceledAt: purchase.canceledAt,
      canceledByUserId: purchase.canceledByUserId,
      cancellationReason: purchase.cancellationReason,
      store: purchase.store,
      supplier: purchase.supplier,
      user: purchase.user,
      canceledBy: purchase.canceledBy,
      items: purchase.items.map((item) => ({
        id: item.id,
        purchaseId: item.purchaseId,
        productId: item.productId,
        quantity: this.decimalToNumber(item.quantity),
        unitCost: this.decimalToNumber(item.unitCost),
        discount: this.decimalToNumber(item.discount),
        total: this.decimalToNumber(item.total),
        product: {
          ...item.product,
          currentStock: this.decimalToNumber(item.product.currentStock)
        },
        createdAt: item.createdAt
      })),
      stockMovements: purchase.stockMovements.map((movement) => ({
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
        product: {
          ...movement.product,
          currentStock: this.decimalToNumber(movement.product.currentStock)
        },
        createdAt: movement.createdAt
      })),
      createdAt: purchase.createdAt,
      updatedAt: purchase.updatedAt
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

  private ensurePurchaseCanBeCanceled(purchase: PurchaseForCancellation) {
    if (purchase.status === PurchaseStatus.CANCELED) {
      throw new BadRequestException({
        code: 'PURCHASE_ALREADY_CANCELED',
        message: 'Compra já está cancelada'
      });
    }
  }

  private async validateSupplierForPurchase(
    tx: Prisma.TransactionClient,
    storeId: string,
    supplierId?: string
  ) {
    if (!supplierId) {
      return;
    }

    const supplier = await tx.supplier.findUnique({
      where: {
        id: supplierId
      },
      select: {
        id: true,
        storeId: true,
        isActive: true
      }
    });

    if (!supplier) {
      throw new NotFoundException('Fornecedor não encontrado');
    }

    if (supplier.storeId !== storeId) {
      throw new BadRequestException({
        code: 'SUPPLIER_STORE_MISMATCH',
        message: 'Fornecedor não pertence à loja informada'
      });
    }

    if (!supplier.isActive) {
      throw new BadRequestException({
        code: 'SUPPLIER_INACTIVE',
        message: 'Fornecedor inativo não pode ser usado na compra'
      });
    }
  }

  async findAll(params: FindAllPurchasesParams) {
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

    const search = params.search?.trim();

    const where: Prisma.PurchaseWhereInput = {
      storeId: params.storeId
        ? params.storeId
        : {
            in: allowedStoreIds
          },
      ...(params.supplierId ? { supplierId: params.supplierId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(search
        ? {
            OR: [
              {
                document: {
                  contains: search,
                  mode: 'insensitive'
                }
              },
              {
                notes: {
                  contains: search,
                  mode: 'insensitive'
                }
              },
              {
                supplier: {
                  is: {
                    name: {
                      contains: search,
                      mode: 'insensitive'
                    }
                  }
                }
              }
            ]
          }
        : {})
    };

    const [total, purchases] = await this.database.$transaction([
      this.database.purchase.count({
        where
      }),
      this.database.purchase.findMany({
        where,
        skip: params.pagination.skip,
        take: params.pagination.take,
        orderBy: {
          createdAt: 'desc'
        },
        include: purchaseInclude
      })
    ]);

    return {
      total,
      data: purchases.map((purchase) => this.formatPurchase(purchase))
    };
  }

  async findById(id: string, user: AuthenticatedUser) {
    const purchase = await this.database.purchase.findUnique({
      where: {
        id
      },
      include: purchaseInclude
    });

    if (!purchase) {
      throw new NotFoundException('Compra não encontrada');
    }

    this.ensureUserCanReadStore(user, purchase.storeId);

    return this.formatPurchase(purchase);
  }

  async create(input: CreatePurchaseDto, user: AuthenticatedUser) {
    ensureUserCanWriteStore(user, input.storeId);

    const duplicatedProductIds = input.items
      .map((item) => item.productId)
      .filter((productId, index, productIds) => productIds.indexOf(productId) !== index);

    if (duplicatedProductIds.length > 0) {
      throw new BadRequestException({
        code: 'DUPLICATED_PRODUCTS',
        message: 'A compra não pode conter o mesmo produto mais de uma vez'
      });
    }

    return this.database.$transaction(async (tx) => {
      await this.validateSupplierForPurchase(
        tx,
        input.storeId,
        input.supplierId
      );

      const productIds = input.items.map((item) => item.productId);

      const products = await tx.product.findMany({
        where: {
          id: {
            in: productIds
          }
        },
        select: {
          id: true,
          storeId: true,
          status: true,
          currentStock: true
        }
      });

      const productsById = new Map(
        products.map((product) => [product.id, product])
      );

      for (const item of input.items) {
        const product = productsById.get(item.productId);

        if (!product) {
          throw new NotFoundException('Produto não encontrado');
        }

        if (product.storeId !== input.storeId) {
          throw new BadRequestException({
            code: 'PRODUCT_STORE_MISMATCH',
            message: 'Produto não pertence à loja informada'
          });
        }

        if (product.status !== ProductStatus.ACTIVE) {
          throw new BadRequestException({
            code: 'PRODUCT_INACTIVE',
            message: 'Produto inativo não pode ser usado na compra'
          });
        }
      }

      const purchaseItems = input.items.map((item) => {
        const quantity = new Prisma.Decimal(item.quantity);
        const unitCost = new Prisma.Decimal(item.unitCost);
        const discount = new Prisma.Decimal(item.discount ?? 0);
        const grossTotal = quantity.mul(unitCost);
        const total = grossTotal.minus(discount);

        if (total.lessThan(0)) {
          throw new BadRequestException({
            code: 'PURCHASE_ITEM_TOTAL_NEGATIVE',
            message: 'Total do item da compra não pode ser negativo'
          });
        }

        return {
          productId: item.productId,
          quantity,
          unitCost,
          discount,
          total
        };
      });

      const subtotal = purchaseItems.reduce(
        (sum, item) => sum.plus(item.total),
        new Prisma.Decimal(0)
      );

      const discount = new Prisma.Decimal(input.discount ?? 0);
      const total = subtotal.minus(discount);

      if (total.lessThan(0)) {
        throw new BadRequestException({
          code: 'PURCHASE_TOTAL_NEGATIVE',
          message: 'Total da compra não pode ser negativo'
        });
      }

      const purchase = await tx.purchase.create({
        data: {
          storeId: input.storeId,
          supplierId: input.supplierId,
          userId: user.id,
          status: PurchaseStatus.RECEIVED,
          subtotal,
          discount,
          total,
          document: input.document,
          notes: input.notes,
          items: {
            create: purchaseItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              discount: item.discount,
              total: item.total
            }))
          }
        },
        select: {
          id: true
        }
      });

      for (const item of purchaseItems) {
        const product = productsById.get(item.productId);

        if (!product) {
          throw new NotFoundException('Produto não encontrado');
        }

        const beforeStock = new Prisma.Decimal(product.currentStock);
        const afterStock = beforeStock.plus(item.quantity);

        await tx.stockMovement.create({
          data: {
            storeId: input.storeId,
            productId: item.productId,
            userId: user.id,
            purchaseId: purchase.id,
            type: StockMovementType.IN,
            quantity: item.quantity,
            beforeStock,
            afterStock,
            reason: 'Entrada por compra recebida',
            document: input.document
          }
        });

        await tx.product.update({
          where: {
            id: item.productId
          },
          data: {
            currentStock: afterStock,
            costPrice: item.unitCost
          }
        });
      }

      const createdPurchase = await tx.purchase.findUnique({
        where: {
          id: purchase.id
        },
        include: purchaseInclude
      });

      if (!createdPurchase) {
        throw new NotFoundException('Compra não encontrada após criação');
      }

      return this.formatPurchase(createdPurchase);
    });
  }

  async cancel(id: string, input: CancelPurchaseDto, user: AuthenticatedUser) {
    return this.database.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: {
          id
        },
        include: purchaseCancellationInclude
      });

      if (!purchase) {
        throw new NotFoundException('Compra não encontrada');
      }

      ensureUserCanWriteStore(user, purchase.storeId);
      this.ensurePurchaseCanBeCanceled(purchase);

      for (const item of purchase.items) {
        const beforeStock = new Prisma.Decimal(item.product.currentStock);
        const quantity = new Prisma.Decimal(item.quantity);
        const afterStock = beforeStock.minus(quantity);

        if (afterStock.lessThan(0)) {
          throw new BadRequestException({
            code: 'INSUFFICIENT_STOCK_TO_CANCEL_PURCHASE',
            message:
              'Estoque insuficiente para cancelar a compra sem deixar saldo negativo'
          });
        }
      }

      await tx.purchase.update({
        where: {
          id: purchase.id
        },
        data: {
          status: PurchaseStatus.CANCELED,
          canceledAt: new Date(),
          canceledByUserId: user.id,
          cancellationReason: input.reason
        }
      });

      for (const item of purchase.items) {
        const beforeStock = new Prisma.Decimal(item.product.currentStock);
        const quantity = new Prisma.Decimal(item.quantity);
        const afterStock = beforeStock.minus(quantity);

        await tx.stockMovement.create({
          data: {
            storeId: purchase.storeId,
            productId: item.productId,
            userId: user.id,
            purchaseId: purchase.id,
            type: StockMovementType.OUT,
            quantity,
            beforeStock,
            afterStock,
            reason: `Cancelamento de compra recebida: ${input.reason}`,
            document: purchase.document
          }
        });

        await tx.product.update({
          where: {
            id: item.productId
          },
          data: {
            currentStock: afterStock
          }
        });
      }

      const canceledPurchase = await tx.purchase.findUnique({
        where: {
          id: purchase.id
        },
        include: purchaseInclude
      });

      if (!canceledPurchase) {
        throw new NotFoundException('Compra não encontrada após cancelamento');
      }

      return this.formatPurchase(canceledPurchase);
    });
  }
}
