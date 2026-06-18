import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class StoresService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService
  ) {}

  async findAll() {
    const stores = await this.database.store.findMany({
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
    });

    return stores.map((store) => ({
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
    }));
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
