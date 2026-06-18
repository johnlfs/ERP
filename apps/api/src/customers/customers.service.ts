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
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpdateCustomerStatusDto } from './dto/update-customer-status.dto';

const customerInclude = {
  store: {
    select: {
      id: true,
      name: true,
      tradeName: true
    }
  }
} satisfies Prisma.CustomerInclude;

type CustomerWithRelations = Prisma.CustomerGetPayload<{
  include: typeof customerInclude;
}>;

type FindAllCustomersParams = {
  storeId?: string;
  isActive?: boolean;
  search?: string;
  pagination: ParsedPagination;
  user: AuthenticatedUser;
};

@Injectable()
export class CustomersService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService
  ) {}

  private formatCustomer(customer: CustomerWithRelations) {
    return {
      id: customer.id,
      storeId: customer.storeId,
      name: customer.name,
      document: customer.document,
      email: customer.email,
      phone: customer.phone,
      notes: customer.notes,
      isActive: customer.isActive,
      store: customer.store,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt
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

  async findAll(params: FindAllCustomersParams) {
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

    const where: Prisma.CustomerWhereInput = {
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
              }
            ]
          }
        : {})
    };

    const [total, customers] = await this.database.$transaction([
      this.database.customer.count({
        where
      }),
      this.database.customer.findMany({
        where,
        skip: params.pagination.skip,
        take: params.pagination.take,
        orderBy: {
          createdAt: 'desc'
        },
        include: customerInclude
      })
    ]);

    return {
      total,
      data: customers.map((customer) => this.formatCustomer(customer))
    };
  }

  async findById(id: string, user: AuthenticatedUser) {
    const customer = await this.database.customer.findUnique({
      where: {
        id
      },
      include: customerInclude
    });

    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }

    this.ensureUserCanReadStore(user, customer.storeId);

    return this.formatCustomer(customer);
  }

  async create(input: CreateCustomerDto, user: AuthenticatedUser) {
    ensureUserCanWriteStore(user, input.storeId);

    const customer = await this.database.customer.create({
      data: {
        storeId: input.storeId,
        name: input.name,
        document: input.document,
        email: input.email,
        phone: input.phone,
        notes: input.notes
      },
      include: customerInclude
    });

    return this.formatCustomer(customer);
  }

  async update(id: string, input: UpdateCustomerDto, user: AuthenticatedUser) {
    const customer = await this.database.customer.findUnique({
      where: {
        id
      },
      select: {
        id: true,
        storeId: true
      }
    });

    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }

    ensureUserCanWriteStore(user, customer.storeId);

    const updateData: Prisma.CustomerUpdateInput = {};

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

    if (typeof input.notes !== 'undefined') {
      updateData.notes = input.notes;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException({
        code: 'EMPTY_UPDATE_BODY',
        message: 'Informe ao menos um campo para atualizar'
      });
    }

    const updatedCustomer = await this.database.customer.update({
      where: {
        id
      },
      data: updateData,
      include: customerInclude
    });

    return this.formatCustomer(updatedCustomer);
  }

  async updateStatus(
    id: string,
    input: UpdateCustomerStatusDto,
    user: AuthenticatedUser
  ) {
    const customer = await this.database.customer.findUnique({
      where: {
        id
      },
      select: {
        id: true,
        storeId: true
      }
    });

    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }

    ensureUserCanWriteStore(user, customer.storeId);

    const updatedCustomer = await this.database.customer.update({
      where: {
        id
      },
      data: {
        isActive: input.isActive
      },
      include: customerInclude
    });

    return this.formatCustomer(updatedCustomer);
  }
}
