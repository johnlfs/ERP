import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService
  ) {}

  async findAll(storeId?: string) {
    const categories = await this.database.category.findMany({
      where: storeId
        ? {
            storeId
          }
        : undefined,
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
    });

    return categories.map((category) => ({
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
    }));
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
