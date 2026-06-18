import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ParsedPagination } from '../common/pagination';
import { DatabaseService } from '../database/database.service';

type FindAllCategoriesParams = {
  storeId?: string;
  search?: string;
  pagination: ParsedPagination;
};

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService
  ) {}

  async findAll(params: FindAllCategoriesParams) {
    const search = params.search?.trim();

    const where: Prisma.CategoryWhereInput = {
      ...(params.storeId ? { storeId: params.storeId } : {}),
      ...(search
        ? {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        : {})
    };

    const [total, categories] = await this.database.$transaction([
      this.database.category.count({
        where
      }),
      this.database.category.findMany({
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
          _count: {
            select: {
              products: true
            }
          }
        }
      })
    ]);

    return {
      total,
      data: categories.map((category) => ({
        id: category.id,
        storeId: category.storeId,
        name: category.name,
        isActive: category.isActive,
        store: category.store,
        totals: {
          products: category._count.products
        },
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      }))
    };
  }

  async findById(id: string) {
    const category = await this.database.category.findUnique({
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
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return {
      id: category.id,
      storeId: category.storeId,
      name: category.name,
      isActive: category.isActive,
      store: category.store,
      totals: {
        products: category._count.products
      },
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    };
  }
}
