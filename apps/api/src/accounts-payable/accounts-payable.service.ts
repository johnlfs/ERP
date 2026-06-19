import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  AccountPayableStatus,
  CashMovementSource,
  CashMovementType,
  Prisma
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { ensureUserCanWriteStore } from '../auth/store-access';
import { ParsedPagination } from '../common/pagination';
import { DatabaseService } from '../database/database.service';
import { PayAccountPayableDto } from './dto/pay-account-payable.dto';

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
  cashMovement: {
    select: {
      id: true,
      type: true,
      source: true,
      amount: true,
      occurredAt: true,
      description: true,
      document: true,
      notes: true
    }
  },
  paidBy: {
    select: {
      id: true,
      name: true,
      email: true
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
  paidAtFrom?: string;
  paidAtTo?: string;
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

  private ensureValidDateRange(
    fromValue: string | undefined,
    toValue: string | undefined,
    code: string,
    message: string
  ) {
    if (!fromValue || !toValue) {
      return;
    }

    const from = new Date(fromValue);
    const to = new Date(toValue);

    if (from.getTime() > to.getTime()) {
      throw new BadRequestException({
        code,
        message
      });
    }
  }

  private ensureAccountCanBePaid(accountPayable: { status: AccountPayableStatus }) {
    if (accountPayable.status === AccountPayableStatus.PAID) {
      throw new BadRequestException({
        code: 'ACCOUNT_PAYABLE_ALREADY_PAID',
        message: 'Conta a pagar já foi quitada'
      });
    }

    if (accountPayable.status === AccountPayableStatus.CANCELED) {
      throw new BadRequestException({
        code: 'ACCOUNT_PAYABLE_CANCELED',
        message: 'Conta a pagar cancelada não pode ser quitada'
      });
    }
  }

  private isUniqueConstraintError(error: unknown, fieldName: string) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    if (error.code !== 'P2002') {
      return false;
    }

    const target = error.meta?.target;

    if (Array.isArray(target)) {
      return target.includes(fieldName);
    }

    return String(target ?? '').includes(fieldName);
  }

  private resolvePaidAmount(
    accountAmount: Prisma.Decimal,
    paidAmount?: number
  ) {
    const resolvedPaidAmount = paidAmount === undefined
      ? new Prisma.Decimal(accountAmount)
      : new Prisma.Decimal(paidAmount);

    if (resolvedPaidAmount.lte(0)) {
      throw new BadRequestException({
        code: 'ACCOUNT_PAYABLE_INVALID_PAID_AMOUNT',
        message: 'paidAmount deve ser maior que zero'
      });
    }

    if (resolvedPaidAmount.gt(accountAmount)) {
      throw new BadRequestException({
        code: 'ACCOUNT_PAYABLE_PAYMENT_AMOUNT_EXCEEDS_AMOUNT',
        message: 'paidAmount não pode ser maior que o valor da conta a pagar'
      });
    }

    if (resolvedPaidAmount.lt(accountAmount)) {
      throw new BadRequestException({
        code: 'ACCOUNT_PAYABLE_PARTIAL_PAYMENT_NOT_SUPPORTED',
        message: 'Nesta fase, apenas baixa total da conta a pagar é permitida'
      });
    }

    return resolvedPaidAmount;
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
      paidByUserId: accountPayable.paidByUserId,
      paidAmount: accountPayable.paidAmount === null
        ? null
        : this.decimalToNumber(accountPayable.paidAmount),
      paymentMethod: accountPayable.paymentMethod,
      paymentNotes: accountPayable.paymentNotes,
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
      cashMovement: accountPayable.cashMovement
        ? {
            ...accountPayable.cashMovement,
            amount: this.decimalToNumber(accountPayable.cashMovement.amount)
          }
        : null,
      paidBy: accountPayable.paidBy,
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

    this.ensureValidDateRange(
      params.dueDateFrom,
      params.dueDateTo,
      'ACCOUNT_PAYABLE_INVALID_DUE_DATE_RANGE',
      'dueDateFrom não pode ser maior que dueDateTo'
    );
    this.ensureValidDateRange(
      params.paidAtFrom,
      params.paidAtTo,
      'ACCOUNT_PAYABLE_INVALID_PAID_AT_RANGE',
      'paidAtFrom não pode ser maior que paidAtTo'
    );

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
      ...(params.paidAtFrom || params.paidAtTo
        ? {
            paidAt: {
              ...(params.paidAtFrom ? { gte: new Date(params.paidAtFrom) } : {}),
              ...(params.paidAtTo ? { lte: new Date(params.paidAtTo) } : {})
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
                paymentMethod: {
                  contains: search,
                  mode: 'insensitive'
                }
              },
              {
                paymentNotes: {
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

  async pay(id: string, input: PayAccountPayableDto, user: AuthenticatedUser) {
    return this.database.$transaction(async (tx) => {
      const accountPayable = await tx.accountPayable.findUnique({
        where: {
          id
        },
        select: {
          id: true,
          storeId: true,
          status: true,
          amount: true,
          description: true,
          document: true
        }
      });

      if (!accountPayable) {
        throw new NotFoundException('Conta a pagar não encontrada');
      }

      ensureUserCanWriteStore(user, accountPayable.storeId);
      this.ensureAccountCanBePaid(accountPayable);

      const paidAmount = this.resolvePaidAmount(
        accountPayable.amount,
        input.paidAmount
      );

      const paidAt = input.paidAt ? new Date(input.paidAt) : new Date();

      await tx.accountPayable.update({
        where: {
          id: accountPayable.id
        },
        data: {
          status: AccountPayableStatus.PAID,
          paidAt,
          paidByUserId: user.id,
          paidAmount,
          paymentMethod: input.paymentMethod.trim(),
          paymentNotes: input.paymentNotes?.trim()
        }
      });

      await tx.cashMovement.create({
        data: {
          storeId: accountPayable.storeId,
          userId: user.id,
          accountPayableId: accountPayable.id,
          type: CashMovementType.OUTFLOW,
          source: CashMovementSource.ACCOUNT_PAYABLE,
          amount: paidAmount,
          occurredAt: paidAt,
          description: `Pagamento de conta a pagar: ${accountPayable.description}`,
          document: accountPayable.document,
          notes: input.paymentNotes?.trim()
        }
      });

      const paidAccountPayable = await tx.accountPayable.findUnique({
        where: {
          id: accountPayable.id
        },
        include: accountPayableInclude
      });

      if (!paidAccountPayable) {
        throw new NotFoundException('Conta a pagar não encontrada após baixa');
      }

      return this.formatAccountPayable(paidAccountPayable);
    }).catch((error) => {
      if (this.isUniqueConstraintError(error, 'accountPayableId')) {
        throw new BadRequestException({
          code: 'ACCOUNT_PAYABLE_CASH_MOVEMENT_ALREADY_EXISTS',
          message: 'Movimento de caixa desta conta a pagar já existe'
        });
      }

      throw error;
    });
  }
}
