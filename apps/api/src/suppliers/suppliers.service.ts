import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { ensureUserCanWriteStore } from '../auth/store-access';
import { ParsedPagination } from '../common/pagination';
import { DatabaseService } from '../database/database.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { UpdateSupplierStatusDto } from './dto/update-supplier-status.dto';

const supplierInclude = {
  store: {
    select: {
      id: true,
      name: true,
      tradeName: true
    }
  }
} satisfies Prisma.SupplierInclude;

type SupplierWithRelations = Prisma.SupplierGetPayload<{
  include: typeof supplierInclude;
}>;

type FindAllSuppliersParams = {
  storeId?: string;
  isActive?: boolean;
  search?: string;
  pagination: ParsedPagination;
  user: AuthenticatedUser;
};

@Injectable()
export class SuppliersService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService
  ) {}

  private formatSupplier(supplier: SupplierWithRelations) {
    return {
      id: supplier.id,
      storeId: supplier.storeId,
      name: supplier.name,
      document: supplier.document,
      email: supplier.email,
      phone: supplier.phone,
      contactName: supplier.contactName,
      notes: supplier.notes,
      isActive: supplier.isActive,
      store: supplier.store,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt
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

  async findAll(params: FindAllSuppliersParams) {
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

    const where: Prisma.SupplierWhereInput = {
      storeId: params.storeId
        ? params.storeId
        : {
            in: allowedStoreIds
          },
      ...(typeof params.isActive === 'boolean'
        ? {
            isActive: params.isActive
          }
        : {}),
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
                document: {
                  contains: search,
                  mode: 'insensitive'
                }
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive'
                }
              },
              {
                phone: {
                  contains: search,
                  mode: 'insensitive'
                }
              },
              {
                contactName: {
                  contains: search,
                  mode: 'insensitive'
                }
              }
            ]
          }
        : {})
    };

    const [total, suppliers] = await this.database.$transaction([
      this.database.supplier.count({
        where
      }),
      this.database.supplier.findMany({
        where,
        skip: params.pagination.skip,
        take: params.pagination.take,
        orderBy: {
          createdAt: 'desc'
        },
        include: supplierInclude
      })
    ]);

    return {
      total,
      data: suppliers.map((supplier) => this.formatSupplier(supplier))
    };
  }

  async findById(id: string, user: AuthenticatedUser) {
    const supplier = await this.database.supplier.findUnique({
      where: {
        id
      },
      include: supplierInclude
    });

    if (!supplier) {
      throw new NotFoundException('Fornecedor não encontrado');
    }

    this.ensureUserCanReadStore(user, supplier.storeId);

    return this.formatSupplier(supplier);
  }

  async create(input: CreateSupplierDto, user: AuthenticatedUser) {
    ensureUserCanWriteStore(user, input.storeId);

    const supplier = await this.database.supplier.create({
      data: {
        storeId: input.storeId,
        name: input.name,
        document: input.document,
        email: input.email,
        phone: input.phone,
        contactName: input.contactName,
        notes: input.notes
      },
      include: supplierInclude
    });

    return this.formatSupplier(supplier);
  }

  async update(id: string, input: UpdateSupplierDto, user: AuthenticatedUser) {
    const supplier = await this.database.supplier.findUnique({
      where: {
        id
      },
      select: {
        id: true,
        storeId: true
      }
    });

    if (!supplier) {
      throw new NotFoundException('Fornecedor não encontrado');
    }

    ensureUserCanWriteStore(user, supplier.storeId);

    const updateData: Prisma.SupplierUpdateInput = {};

    if (typeof input.name !== 'undefined') {
      updateData.name = input.name;
    }

    if (typeof input.document !== 'undefined') {
      updateData.document = input.document;
    }

    if (typeof input.email !== 'undefined') {
      updateData.email = input.email;
    }

    if (typeof input.phone !== 'undefined') {
      updateData.phone = input.phone;
    }

    if (typeof input.contactName !== 'undefined') {
      updateData.contactName = input.contactName;
    }

    if (typeof input.notes !== 'undefined') {
      updateData.notes = input.notes;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException({
        code: 'EMPTY_UPDATE_BODY',
        message: 'Informe ao menos um campo para atualizar'
      });
    }

    const updatedSupplier = await this.database.supplier.update({
      where: {
        id
      },
      data: updateData,
      include: supplierInclude
    });

    return this.formatSupplier(updatedSupplier);
  }

  async updateStatus(
    id: string,
    input: UpdateSupplierStatusDto,
    user: AuthenticatedUser
  ) {
    const supplier = await this.database.supplier.findUnique({
      where: {
        id
      },
      select: {
        id: true,
        storeId: true
      }
    });

    if (!supplier) {
      throw new NotFoundException('Fornecedor não encontrado');
    }

    ensureUserCanWriteStore(user, supplier.storeId);

    const updatedSupplier = await this.database.supplier.update({
      where: {
        id
      },
      data: {
        isActive: input.isActive
      },
      include: supplierInclude
    });

    return this.formatSupplier(updatedSupplier);
  }
}
