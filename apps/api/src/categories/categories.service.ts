import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { ensureUserCanWriteStore } from '../auth/store-access';
import { ParsedPagination } from '../common/pagination';
import { DatabaseService } from '../database/database.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryStatusDto } from './dto/update-category-status.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

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

  private formatCategory(
    category: Prisma.CategoryGetPayload<{
      include: {
        store: {
          select: {
            id: true;
            name: true;
            tradeName: true;
          };
        };
        _count: {
          select: {
            products: true;
          };
        };
      };
    }>
  ) {
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
      data: categories.map((category) => this.formatCategory(category))
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

    return this.formatCategory(category);
  }

  async create(input: CreateCategoryDto, user: AuthenticatedUser) {
    await this.ensureStoreExists(input.storeId);
    ensureUserCanWriteStore(user, input.storeId);

    const category = await this.database.category.create({
      data: {
        storeId: input.storeId,
        name: input.name
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

    return this.formatCategory(category);
  }

  async update(id: string, input: UpdateCategoryDto, user: AuthenticatedUser) {
    if (input.name === undefined) {
      throw new BadRequestException({
        code: 'EMPTY_UPDATE_BODY',
        message: 'Informe pelo menos um campo para atualizar'
      });
    }

    const currentCategory = await this.database.category.findUnique({
      where: {
        id
      },
      select: {
        id: true,
        storeId: true
      }
    });

    if (!currentCategory) {
      throw new NotFoundException('Categoria não encontrada');
    }

    ensureUserCanWriteStore(user, currentCategory.storeId);

    const category = await this.database.category.update({
      where: {
        id
      },
      data: {
        name: input.name
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

    return this.formatCategory(category);
  }

  async updateStatus(
    id: string,
    input: UpdateCategoryStatusDto,
    user: AuthenticatedUser
  ) {
    const currentCategory = await this.database.category.findUnique({
      where: {
        id
      },
      select: {
        id: true,
        storeId: true
      }
    });

    if (!currentCategory) {
      throw new NotFoundException('Categoria não encontrada');
    }

    ensureUserCanWriteStore(user, currentCategory.storeId);

    const category = await this.database.category.update({
      where: {
        id
      },
      data: {
        isActive: input.isActive
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

    return this.formatCategory(category);
  }
}
