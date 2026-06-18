import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  PaymentMethod,
  Prisma,
  ProductStatus,
  SaleStatus,
  StockMovementType
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { ensureUserCanWriteStore } from '../auth/store-access';
import { ParsedPagination } from '../common/pagination';
import { DatabaseService } from '../database/database.service';
import { CreateSaleDto } from './dto/create-sale.dto';

const saleInclude = {
  store: {
    select: {
      id: true,
      name: true,
      tradeName: true
    }
  },
  user: {
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
  }
} satisfies Prisma.SaleInclude;

type SaleWithRelations = Prisma.SaleGetPayload<{
  include: typeof saleInclude;
}>;

type FindAllSalesParams = {
  storeId?: string;
  status?: SaleStatus;
  paymentMethod?: PaymentMethod;
  pagination: ParsedPagination;
  user: AuthenticatedUser;
};

@Injectable()
export class SalesService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService
  ) {}

  private decimalToNumber(value: Prisma.Decimal | number) {
    return Number(value);
  }

  private formatSale(sale: SaleWithRelations) {
    return {
      id: sale.id,
      storeId: sale.storeId,
      userId: sale.userId,
      status: sale.status,
      paymentMethod: sale.paymentMethod,
      subtotal: this.decimalToNumber(sale.subtotal),
      discount: this.decimalToNumber(sale.discount),
      total: this.decimalToNumber(sale.total),
      document: sale.document,
      notes: sale.notes,
      store: sale.store,
      user: sale.user,
      items: sale.items.map((item) => ({
        id: item.id,
        saleId: item.saleId,
        productId: item.productId,
        quantity: this.decimalToNumber(item.quantity),
        unitPrice: this.decimalToNumber(item.unitPrice),
        discount: this.decimalToNumber(item.discount),
        total: this.decimalToNumber(item.total),
        product: {
          ...item.product,
          currentStock: this.decimalToNumber(item.product.currentStock)
        },
        createdAt: item.createdAt
      })),
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt
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

  async findAll(params: FindAllSalesParams) {
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

    const where: Prisma.SaleWhereInput = {
      storeId: params.storeId
        ? params.storeId
        : {
            in: allowedStoreIds
          },
      ...(params.status ? { status: params.status } : {}),
      ...(params.paymentMethod ? { paymentMethod: params.paymentMethod } : {})
    };

    const [total, sales] = await this.database.$transaction([
      this.database.sale.count({
        where
      }),
      this.database.sale.findMany({
        where,
        skip: params.pagination.skip,
        take: params.pagination.take,
        orderBy: {
          createdAt: 'desc'
        },
        include: saleInclude
      })
    ]);

    return {
      total,
      data: sales.map((sale) => this.formatSale(sale))
    };
  }

  async findById(id: string, user: AuthenticatedUser) {
    const sale = await this.database.sale.findUnique({
      where: {
        id
      },
      include: saleInclude
    });

    if (!sale) {
      throw new NotFoundException('Venda não encontrada');
    }

    this.ensureUserCanReadStore(user, sale.storeId);

    return this.formatSale(sale);
  }

  async create(input: CreateSaleDto, user: AuthenticatedUser) {
    ensureUserCanWriteStore(user, input.storeId);

    const duplicatedProductIds = input.items
      .map((item) => item.productId)
      .filter((productId, index, productIds) => productIds.indexOf(productId) !== index);

    if (duplicatedProductIds.length > 0) {
      throw new BadRequestException({
        code: 'DUPLICATE_PRODUCT_IN_SALE',
        message: 'Não informe o mesmo produto mais de uma vez na venda'
      });
    }

    const productIds = input.items.map((item) => item.productId);

    return this.database.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: {
          id: {
            in: productIds
          },
          storeId: input.storeId
        },
        select: {
          id: true,
          name: true,
          status: true,
          storeId: true,
          currentStock: true
        }
      });

      if (products.length !== productIds.length) {
        throw new NotFoundException('Um ou mais produtos não foram encontrados na loja informada');
      }

      const productById = new Map(products.map((product) => [product.id, product]));

      let subtotal = new Prisma.Decimal(0);
      let itemDiscountTotal = new Prisma.Decimal(0);

      const normalizedItems = input.items.map((item) => {
        const product = productById.get(item.productId);

        if (!product) {
          throw new NotFoundException('Produto não encontrado');
        }

        if (product.status !== ProductStatus.ACTIVE) {
          throw new BadRequestException({
            code: 'PRODUCT_INACTIVE',
            message: `Produto inativo não pode ser vendido: ${product.name}`
          });
        }

        const quantity = new Prisma.Decimal(item.quantity);
        const unitPrice = new Prisma.Decimal(item.unitPrice);
        const discount = new Prisma.Decimal(item.discount ?? 0);
        const grossTotal = quantity.mul(unitPrice);

        if (discount.greaterThan(grossTotal)) {
          throw new BadRequestException({
            code: 'ITEM_DISCOUNT_EXCEEDS_TOTAL',
            message: `Desconto do item não pode ser maior que o total do item: ${product.name}`
          });
        }

        const beforeStock = new Prisma.Decimal(product.currentStock);
        const afterStock = beforeStock.minus(quantity);

        if (afterStock.lessThan(0)) {
          throw new BadRequestException({
            code: 'INSUFFICIENT_STOCK',
            message: `Estoque insuficiente para o produto: ${product.name}`
          });
        }

        const total = grossTotal.minus(discount);

        subtotal = subtotal.plus(grossTotal);
        itemDiscountTotal = itemDiscountTotal.plus(discount);

        return {
          product,
          quantity,
          unitPrice,
          discount,
          total,
          beforeStock,
          afterStock
        };
      });

      const saleDiscount = new Prisma.Decimal(input.discount ?? 0);
      const totalBeforeSaleDiscount = subtotal.minus(itemDiscountTotal);

      if (saleDiscount.greaterThan(totalBeforeSaleDiscount)) {
        throw new BadRequestException({
          code: 'SALE_DISCOUNT_EXCEEDS_TOTAL',
          message: 'Desconto geral não pode ser maior que o total da venda'
        });
      }

      const total = totalBeforeSaleDiscount.minus(saleDiscount);

      const sale = await tx.sale.create({
        data: {
          storeId: input.storeId,
          userId: user.id,
          paymentMethod: input.paymentMethod,
          subtotal,
          discount: saleDiscount.plus(itemDiscountTotal),
          total,
          document: input.document,
          notes: input.notes
        }
      });

      for (const item of normalizedItems) {
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            total: item.total
          }
        });

        await tx.stockMovement.create({
          data: {
            storeId: input.storeId,
            productId: item.product.id,
            userId: user.id,
            saleId: sale.id,
            type: StockMovementType.OUT,
            quantity: item.quantity,
            beforeStock: item.beforeStock,
            afterStock: item.afterStock,
            reason: 'Venda',
            document: input.document ?? `SALE-${sale.id}`
          }
        });

        await tx.product.update({
          where: {
            id: item.product.id
          },
          data: {
            currentStock: item.afterStock
          }
        });
      }

      const createdSale = await tx.sale.findUnique({
        where: {
          id: sale.id
        },
        include: saleInclude
      });

      if (!createdSale) {
        throw new NotFoundException('Venda não encontrada após criação');
      }

      return this.formatSale(createdSale);
    });
  }
}
