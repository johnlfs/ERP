import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ParsedPagination } from '../common/pagination';
import { DatabaseService } from '../database/database.service';

type FindAllStoresParams = {
  search?: string;
  pagination: ParsedPagination;
};

@Injectable()
export class StoresService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService
  ) {}

  async findAll(params: FindAllStoresParams) {
    const search = params.search?.trim();

    const where: Prisma.StoreWhereInput = search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: 'insensitive'
              }
            },
            {
              tradeName: {
                contains: search,
                mode: 'insensitive'
              }
            },
            {
              document: {
                contains: search,
                mode: 'insensitive'
              }
            }
          ]
        }
      : {};

    const [total, stores] = await this.database.$transaction([
      this.database.store.count({
        where
      }),
      this.database.store.findMany({
        where,
        skip: params.pagination.skip,
        take: params.pagination.take,
        orderBy: {
          name: 'asc'
        },
        include: {
          _count: {
            select: {
              users: true,
              categories: true,
              products: true
            }
          }
        }
      })
    ]);

    return {
      total,
      data: stores.map((store) => ({
        id: store.id,
        name: store.name,
        tradeName: store.tradeName,
        document: store.document,
        isActive: store.isActive,
        totals: {
          users: store._count.users,
          categories: store._count.categories,
          products: store._count.products
        },
        createdAt: store.createdAt,
        updatedAt: store.updatedAt
      }))
    };
  }

  async findById(id: string) {
    const store = await this.database.store.findUnique({
      where: {
        id
      },
      include: {
        _count: {
          select: {
            users: true,
            categories: true,
            products: true
          }
        }
      }
    });

    if (!store) {
      throw new NotFoundException('Loja não encontrada');
    }

    return {
      id: store.id,
      name: store.name,
      tradeName: store.tradeName,
      document: store.document,
      isActive: store.isActive,
      totals: {
        users: store._count.users,
        categories: store._count.categories,
        products: store._count.products
      },
      createdAt: store.createdAt,
      updatedAt: store.updatedAt
    };
  }
}
