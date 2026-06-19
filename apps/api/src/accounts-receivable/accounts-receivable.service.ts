import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  AccountReceivableStatus,
  CashMovementSource,
  CashMovementType,
  Prisma
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { ensureUserCanWriteStore } from '../auth/store-access';
import { ParsedPagination } from '../common/pagination';
import { DatabaseService } from '../database/database.service';
import { ReceiveAccountReceivableDto } from './dto/receive-account-receivable.dto';

const accountReceivableInclude = {
  store: {
    select: {
      id: true,
      name: true,
      tradeName: true
    }
  },
  customer: {
    select: {
      id: true,
      name: true,
      document: true,
      email: true,
      phone: true,
      isActive: true
    }
  },
  sale: {
    select: {
      id: true,
      document: true,
      status: true,
      paymentMethod: true,
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
  receivedBy: {
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
} satisfies Prisma.AccountReceivableInclude;

type AccountReceivableWithRelations = Prisma.AccountReceivableGetPayload<{
  include: typeof accountReceivableInclude;
}>;

type FindAllAccountsReceivableParams = {
  storeId?: string;
  customerId?: string;
  saleId?: string;
  status?: AccountReceivableStatus;
  search?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  receivedAtFrom?: string;
  receivedAtTo?: string;
  pagination: ParsedPagination;
  user: AuthenticatedUser;
};

@Injectable()
export class AccountsReceivableService {
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


  private ensureAccountCanBeReceived(accountReceivable: { status: AccountReceivableStatus }) {
    if (accountReceivable.status === AccountReceivableStatus.RECEIVED) {
      throw new BadRequestException({
        code: 'ACCOUNT_RECEIVABLE_ALREADY_RECEIVED',
        message: 'Conta a receber já foi recebida'
      });
    }

    if (accountReceivable.status === AccountReceivableStatus.CANCELED) {
      throw new BadRequestException({
        code: 'ACCOUNT_RECEIVABLE_CANCELED',
        message: 'Conta a receber cancelada não pode ser recebida'
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

  private resolveReceivedAmount(
    accountAmount: Prisma.Decimal,
    receivedAmount?: number
  ) {
    const resolvedReceivedAmount = receivedAmount === undefined
      ? new Prisma.Decimal(accountAmount)
      : new Prisma.Decimal(receivedAmount);

    if (resolvedReceivedAmount.lte(0)) {
      throw new BadRequestException({
        code: 'ACCOUNT_RECEIVABLE_INVALID_RECEIVED_AMOUNT',
        message: 'receivedAmount deve ser maior que zero'
      });
    }

    if (resolvedReceivedAmount.gt(accountAmount)) {
      throw new BadRequestException({
        code: 'ACCOUNT_RECEIVABLE_RECEIVED_AMOUNT_EXCEEDS_AMOUNT',
        message: 'receivedAmount não pode ser maior que o valor da conta a receber'
      });
    }

    if (resolvedReceivedAmount.lt(accountAmount)) {
      throw new BadRequestException({
        code: 'ACCOUNT_RECEIVABLE_PARTIAL_RECEIPT_NOT_SUPPORTED',
        message: 'Nesta fase, apenas recebimento total da conta a receber é permitido'
      });
    }

    return resolvedReceivedAmount;
  }

  private formatAccountReceivable(accountReceivable: AccountReceivableWithRelations) {
    return {
      id: accountReceivable.id,
      storeId: accountReceivable.storeId,
      customerId: accountReceivable.customerId,
      saleId: accountReceivable.saleId,
      status: accountReceivable.status,
      description: accountReceivable.description,
      document: accountReceivable.document,
      amount: this.decimalToNumber(accountReceivable.amount),
      dueDate: accountReceivable.dueDate,
      receivedAt: accountReceivable.receivedAt,
      receivedByUserId: accountReceivable.receivedByUserId,
      receivedAmount: accountReceivable.receivedAmount === null
        ? null
        : this.decimalToNumber(accountReceivable.receivedAmount),
      receiptMethod: accountReceivable.receiptMethod,
      receiptNotes: accountReceivable.receiptNotes,
      canceledAt: accountReceivable.canceledAt,
      canceledByUserId: accountReceivable.canceledByUserId,
      cancellationReason: accountReceivable.cancellationReason,
      notes: accountReceivable.notes,
      store: accountReceivable.store,
      customer: accountReceivable.customer,
      sale: accountReceivable.sale
        ? {
            ...accountReceivable.sale,
            total: this.decimalToNumber(accountReceivable.sale.total)
          }
        : null,
      cashMovement: accountReceivable.cashMovement
        ? {
            ...accountReceivable.cashMovement,
            amount: this.decimalToNumber(accountReceivable.cashMovement.amount)
          }
        : null,
      receivedBy: accountReceivable.receivedBy,
      canceledBy: accountReceivable.canceledBy,
      createdAt: accountReceivable.createdAt,
      updatedAt: accountReceivable.updatedAt
    };
  }

  async findAll(params: FindAllAccountsReceivableParams) {
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
      'ACCOUNT_RECEIVABLE_INVALID_DUE_DATE_RANGE',
      'dueDateFrom não pode ser maior que dueDateTo'
    );
    this.ensureValidDateRange(
      params.receivedAtFrom,
      params.receivedAtTo,
      'ACCOUNT_RECEIVABLE_INVALID_RECEIVED_AT_RANGE',
      'receivedAtFrom não pode ser maior que receivedAtTo'
    );

    const search = params.search?.trim();

    const where: Prisma.AccountReceivableWhereInput = {
      storeId: params.storeId
        ? params.storeId
        : {
            in: allowedStoreIds
          },
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(params.saleId ? { saleId: params.saleId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.dueDateFrom || params.dueDateTo
        ? {
            dueDate: {
              ...(params.dueDateFrom ? { gte: new Date(params.dueDateFrom) } : {}),
              ...(params.dueDateTo ? { lte: new Date(params.dueDateTo) } : {})
            }
          }
        : {}),
      ...(params.receivedAtFrom || params.receivedAtTo
        ? {
            receivedAt: {
              ...(params.receivedAtFrom ? { gte: new Date(params.receivedAtFrom) } : {}),
              ...(params.receivedAtTo ? { lte: new Date(params.receivedAtTo) } : {})
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
                receiptMethod: {
                  contains: search,
                  mode: 'insensitive'
                }
              },
              {
                receiptNotes: {
                  contains: search,
                  mode: 'insensitive'
                }
              },
              {
                customer: {
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

    const [total, accountsReceivable] = await this.database.$transaction([
      this.database.accountReceivable.count({
        where
      }),
      this.database.accountReceivable.findMany({
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
        include: accountReceivableInclude
      })
    ]);

    return {
      total,
      data: accountsReceivable.map((accountReceivable) =>
        this.formatAccountReceivable(accountReceivable)
      )
    };
  }

  async findById(id: string, user: AuthenticatedUser) {
    const accountReceivable = await this.database.accountReceivable.findUnique({
      where: {
        id
      },
      include: accountReceivableInclude
    });

    if (!accountReceivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    this.ensureUserCanReadStore(user, accountReceivable.storeId);

    return this.formatAccountReceivable(accountReceivable);
  }

  async receive(
    id: string,
    input: ReceiveAccountReceivableDto,
    user: AuthenticatedUser
  ) {
    return this.database.$transaction(async (tx) => {
      const accountReceivable = await tx.accountReceivable.findUnique({
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

      if (!accountReceivable) {
        throw new NotFoundException('Conta a receber não encontrada');
      }

      ensureUserCanWriteStore(user, accountReceivable.storeId);
      this.ensureAccountCanBeReceived(accountReceivable);

      const receivedAmount = this.resolveReceivedAmount(
        accountReceivable.amount,
        input.receivedAmount
      );

      const receivedAt = input.receivedAt ? new Date(input.receivedAt) : new Date();

      await tx.accountReceivable.update({
        where: {
          id: accountReceivable.id
        },
        data: {
          status: AccountReceivableStatus.RECEIVED,
          receivedAt,
          receivedByUserId: user.id,
          receivedAmount,
          receiptMethod: input.receiptMethod.trim(),
          receiptNotes: input.receiptNotes?.trim()
        }
      });

      await tx.cashMovement.create({
        data: {
          storeId: accountReceivable.storeId,
          userId: user.id,
          accountReceivableId: accountReceivable.id,
          type: CashMovementType.INFLOW,
          source: CashMovementSource.ACCOUNT_RECEIVABLE,
          amount: receivedAmount,
          occurredAt: receivedAt,
          description: `Recebimento de conta a receber: ${accountReceivable.description}`,
          document: accountReceivable.document,
          notes: input.receiptNotes?.trim()
        }
      });

      const receivedAccountReceivable = await tx.accountReceivable.findUnique({
        where: {
          id: accountReceivable.id
        },
        include: accountReceivableInclude
      });

      if (!receivedAccountReceivable) {
        throw new NotFoundException('Conta a receber não encontrada após recebimento');
      }

      return this.formatAccountReceivable(receivedAccountReceivable);
    }).catch((error) => {
      if (this.isUniqueConstraintError(error, 'accountReceivableId')) {
        throw new BadRequestException({
          code: 'ACCOUNT_RECEIVABLE_CASH_MOVEMENT_ALREADY_EXISTS',
          message: 'Movimento de caixa desta conta a receber já existe'
        });
      }

      throw error;
    });
  }
}
