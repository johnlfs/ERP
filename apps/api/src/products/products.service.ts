import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService
  ) {}

  async findAll(storeId?: string) {
    const products = await this.database.product.findMany({
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
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return products.map((product) => ({
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
    }));
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
