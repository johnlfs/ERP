import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { AccountPayableStatus, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { ParsedPagination } from '../common/pagination';
import { DatabaseService } from '../database/database.service';

const accountPayableInclude = {
  store: {
    select: {
      id: true,
      name: true,
      tradeName: true
    }
  },
  supplier: {
    select: {
      id: true,
      name: true,
      document: true,
      email: true,
      phone: true,
      contactName: true,
      isActive: true
    }
  },
  purchase: {
    select: {
      id: true,
      document: true,
      status: true,
      total: true,
      createdAt: true
    }
  },
  canceledBy: {
    select: {
      id: true,
      name: true,
      email: true
    }
  }
} satisfies Prisma.AccountPayableInclude;

type AccountPayableWithRelations = Prisma.AccountPayableGetPayload<{
  include: typeof accountPayableInclude;
}>;

type FindAllAccountsPayableParams = {
  storeId?: string;
  supplierId?: string;
  purchaseId?: string;
  status?: AccountPayableStatus;
  search?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  pagination: ParsedPagination;
  user: AuthenticatedUser;
};

@Injectable()
export class AccountsPayableService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService
  ) {}

  private decimalToNumber(value: Prisma.Decimal | number) {
    return Number(value);
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


  private ensureValidDueDateRange(dueDateFrom?: string, dueDateTo?: string) {
    if (!dueDateFrom || !dueDateTo) {
      return;
    }

    const from = new Date(dueDateFrom);
    const to = new Date(dueDateTo);

    if (from.getTime() > to.getTime()) {
      throw new BadRequestException({
        code: 'ACCOUNT_PAYABLE_INVALID_DUE_DATE_RANGE',
        message: 'dueDateFrom não pode ser maior que dueDateTo'
      });
    }
  }

  private formatAccountPayable(accountPayable: AccountPayableWithRelations) {
    return {
      id: accountPayable.id,
      storeId: accountPayable.storeId,
      supplierId: accountPayable.supplierId,
      purchaseId: accountPayable.purchaseId,
      status: accountPayable.status,
      description: accountPayable.description,
      document: accountPayable.document,
      amount: this.decimalToNumber(accountPayable.amount),
      dueDate: accountPayable.dueDate,
      paidAt: accountPayable.paidAt,
      canceledAt: accountPayable.canceledAt,
      canceledByUserId: accountPayable.canceledByUserId,
      cancellationReason: accountPayable.cancellationReason,
      notes: accountPayable.notes,
      store: accountPayable.store,
      supplier: accountPayable.supplier,
      purchase: accountPayable.purchase
        ? {
            ...accountPayable.purchase,
            total: this.decimalToNumber(accountPayable.purchase.total)
          }
        : null,
      canceledBy: accountPayable.canceledBy,
      createdAt: accountPayable.createdAt,
      updatedAt: accountPayable.updatedAt
    };
  }

  async findAll(params: FindAllAccountsPayableParams) {
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

    this.ensureValidDueDateRange(params.dueDateFrom, params.dueDateTo);

    const search = params.search?.trim();

    const where: Prisma.AccountPayableWhereInput = {
      storeId: params.storeId
        ? params.storeId
        : {
            in: allowedStoreIds
          },
      ...(params.supplierId ? { supplierId: params.supplierId } : {}),
      ...(params.purchaseId ? { purchaseId: params.purchaseId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.dueDateFrom || params.dueDateTo
        ? {
            dueDate: {
              ...(params.dueDateFrom ? { gte: new Date(params.dueDateFrom) } : {}),
              ...(params.dueDateTo ? { lte: new Date(params.dueDateTo) } : {})
            }
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                description: {
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
                notes: {
                  contains: search,
                  mode: 'insensitive'
                }
              },
              {
                supplier: {
                  is: {
                    name: {
                      contains: search,
                      mode: 'insensitive'
                    }
                  }
                }
              }
            ]
          }
        : {})
    };

    const [total, accountsPayable] = await this.database.$transaction([
      this.database.accountPayable.count({
        where
      }),
      this.database.accountPayable.findMany({
        where,
        skip: params.pagination.skip,
        take: params.pagination.take,
        orderBy: [
          {
            dueDate: 'asc'
          },
          {
            createdAt: 'desc'
          }
        ],
        include: accountPayableInclude
      })
    ]);

    return {
      total,
      data: accountsPayable.map((accountPayable) =>
        this.formatAccountPayable(accountPayable)
      )
    };
  }

  async findById(id: string, user: AuthenticatedUser) {
    const accountPayable = await this.database.accountPayable.findUnique({
      where: {
        id
      },
      include: accountPayableInclude
    });

    if (!accountPayable) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    this.ensureUserCanReadStore(user, accountPayable.storeId);

    return this.formatAccountPayable(accountPayable);
  }
}
