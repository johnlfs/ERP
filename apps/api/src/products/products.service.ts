import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ParsedPagination } from '../common/pagination';
import { DatabaseService } from '../database/database.service';

type FindAllProductsParams = {
  storeId?: string;
  search?: string;
  pagination: ParsedPagination;
};

@Injectable()
export class ProductsService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService
  ) {}

  async findAll(params: FindAllProductsParams) {
    const search = params.search?.trim();

    const where: Prisma.ProductWhereInput = {
      ...(params.storeId ? { storeId: params.storeId } : {}),
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive'
                }
              },
              {
                internalCode: {
                  contains: search,
                  mode: 'insensitive'
                }
              },
              {
                barcode: {
                  contains: search,
                  mode: 'insensitive'
                }
              },
              {
                description: {
                  contains: search,
                  mode: 'insensitive'
                }
              }
            ]
          }
        : {})
    };

    const [total, products] = await this.database.$transaction([
      this.database.product.count({
        where
      }),
      this.database.product.findMany({
        where,
        skip: params.pagination.skip,
        take: params.pagination.take,
        orderBy: {
          name: 'asc'
        },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              tradeName: true
            }
          },
          category: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })
    ]);

    return {
      total,
      data: products.map((product) => ({
        id: product.id,
        storeId: product.storeId,
        categoryId: product.categoryId,
        internalCode: product.internalCode,
        barcode: product.barcode,
        name: product.name,
        description: product.description,
        costPrice: product.costPrice.toString(),
        salePrice: product.salePrice.toString(),
        ncm: product.ncm,
        unit: product.unit,
        status: product.status,
        minStock: product.minStock.toString(),
        currentStock: product.currentStock.toString(),
        store: product.store,
        category: product.category,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      }))
    };
  }

  async findById(id: string) {
    const product = await this.database.product.findUnique({
      where: {
        id
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            tradeName: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return {
      id: product.id,
      storeId: product.storeId,
      categoryId: product.categoryId,
      internalCode: product.internalCode,
      barcode: product.barcode,
      name: product.name,
      description: product.description,
      costPrice: product.costPrice.toString(),
      salePrice: product.salePrice.toString(),
      ncm: product.ncm,
      unit: product.unit,
      status: product.status,
      minStock: product.minStock.toString(),
      currentStock: product.currentStock.toString(),
      store: product.store,
      category: product.category,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };
  }
}
