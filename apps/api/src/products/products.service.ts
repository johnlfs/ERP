import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ParsedPagination } from '../common/pagination';
import { DatabaseService } from '../database/database.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const productInclude = {
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
      name: true,
      isActive: true
    }
  }
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

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

  private formatProduct(product: ProductWithRelations) {
    return {
      id: product.id,
      storeId: product.storeId,
      categoryId: product.categoryId,
      internalCode: product.internalCode,
      barcode: product.barcode,
      name: product.name,
      description: product.description,
      costPrice: product.costPrice,
      salePrice: product.salePrice,
      ncm: product.ncm,
      unit: product.unit,
      status: product.status,
      minStock: product.minStock,
      currentStock: product.currentStock,
      store: product.store,
      category: product.category,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };
  }

  private async ensureStoreExists(storeId: string) {
    const store = await this.database.store.findUnique({
      where: {
        id: storeId
      },
      select: {
        id: true
      }
    });

    if (!store) {
      throw new NotFoundException('Loja não encontrada');
    }
  }

  private async ensureCategoryBelongsToStore(categoryId: string, storeId: string) {
    const category = await this.database.category.findUnique({
      where: {
        id: categoryId
      },
      select: {
        id: true,
        storeId: true
      }
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    if (category.storeId !== storeId) {
      throw new BadRequestException({
        code: 'CATEGORY_STORE_MISMATCH',
        message: 'Categoria não pertence à loja informada'
      });
    }
  }

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
        include: productInclude
      })
    ]);

    return {
      total,
      data: products.map((product) => this.formatProduct(product))
    };
  }

  async findById(id: string) {
    const product = await this.database.product.findUnique({
      where: {
        id
      },
      include: productInclude
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return this.formatProduct(product);
  }

  async create(input: CreateProductDto) {
    await this.ensureStoreExists(input.storeId);
    await this.ensureCategoryBelongsToStore(input.categoryId, input.storeId);

    const product = await this.database.product.create({
      data: {
        storeId: input.storeId,
        categoryId: input.categoryId,
        internalCode: input.internalCode,
        barcode: input.barcode,
        name: input.name,
        description: input.description,
        costPrice: input.costPrice,
        salePrice: input.salePrice,
        ncm: input.ncm,
        unit: input.unit,
        minStock: input.minStock,
        currentStock: input.currentStock
      },
      include: productInclude
    });

    return this.formatProduct(product);
  }

  async update(id: string, input: UpdateProductDto) {
    const hasUpdate =
      input.categoryId !== undefined ||
      input.internalCode !== undefined ||
      input.barcode !== undefined ||
      input.name !== undefined ||
      input.description !== undefined ||
      input.costPrice !== undefined ||
      input.salePrice !== undefined ||
      input.ncm !== undefined ||
      input.unit !== undefined ||
      input.minStock !== undefined ||
      input.currentStock !== undefined;

    if (!hasUpdate) {
      throw new BadRequestException({
        code: 'EMPTY_UPDATE_BODY',
        message: 'Informe pelo menos um campo para atualizar'
      });
    }

    const currentProduct = await this.database.product.findUnique({
      where: {
        id
      },
      select: {
        id: true,
        storeId: true
      }
    });

    if (!currentProduct) {
      throw new NotFoundException('Produto não encontrado');
    }

    if (input.categoryId !== undefined) {
      await this.ensureCategoryBelongsToStore(
        input.categoryId,
        currentProduct.storeId
      );
    }

    const product = await this.database.product.update({
      where: {
        id
      },
      data: {
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.internalCode !== undefined ? { internalCode: input.internalCode } : {}),
        ...(input.barcode !== undefined ? { barcode: input.barcode } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.costPrice !== undefined ? { costPrice: input.costPrice } : {}),
        ...(input.salePrice !== undefined ? { salePrice: input.salePrice } : {}),
        ...(input.ncm !== undefined ? { ncm: input.ncm } : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        ...(input.minStock !== undefined ? { minStock: input.minStock } : {}),
        ...(input.currentStock !== undefined ? { currentStock: input.currentStock } : {})
      },
      include: productInclude
    });

    return this.formatProduct(product);
  }

  async updateStatus(id: string, input: UpdateProductStatusDto) {
    await this.findById(id);

    const product = await this.database.product.update({
      where: {
        id
      },
      data: {
        status: input.status
      },
      include: productInclude
    });

    return this.formatProduct(product);
  }
}
