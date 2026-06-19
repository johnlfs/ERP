import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { CashMovementSource, CashMovementType, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { ParsedPagination } from '../common/pagination';
import { DatabaseService } from '../database/database.service';
import { CreateManualCashMovementDto } from './dto/create-manual-cash-movement.dto';

const cashMovementInclude = {
  store: {
    select: {
      id: true,
      name: true,
      tradeName: true
    }
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  accountPayable: {
    select: {
      id: true,
      status: true,
      amount: true,
      document: true,
      description: true,
      purchaseId: true
    }
  },
  accountReceivable: {
    select: {
      id: true,
      status: true,
      amount: true,
      document: true,
      description: true,
      saleId: true
    }
  }
} satisfies Prisma.CashMovementInclude;

type CashMovementWithRelations = Prisma.CashMovementGetPayload<{
  include: typeof cashMovementInclude;
}>;

type FindAllCashMovementsParams = {
  storeId?: string;
  accountPayableId?: string;
  accountReceivableId?: string;
  type?: CashMovementType;
  source?: CashMovementSource;
  search?: string;
  occurredAtFrom?: string;
  occurredAtTo?: string;
  pagination: ParsedPagination;
  user: AuthenticatedUser;
};

@Injectable()
export class CashMovementsService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService
  ) {}

  private decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
    return Number(value ?? 0);
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

  private formatCashMovement(cashMovement: CashMovementWithRelations) {
    return {
      id: cashMovement.id,
      storeId: cashMovement.storeId,
      userId: cashMovement.userId,
      accountPayableId: cashMovement.accountPayableId,
      accountReceivableId: cashMovement.accountReceivableId,
      type: cashMovement.type,
      source: cashMovement.source,
      amount: this.decimalToNumber(cashMovement.amount),
      occurredAt: cashMovement.occurredAt,
      description: cashMovement.description,
      document: cashMovement.document,
      notes: cashMovement.notes,
      store: cashMovement.store,
      user: cashMovement.user,
      accountPayable: cashMovement.accountPayable
        ? {
            ...cashMovement.accountPayable,
            amount: this.decimalToNumber(cashMovement.accountPayable.amount)
          }
        : null,
      accountReceivable: cashMovement.accountReceivable
        ? {
            ...cashMovement.accountReceivable,
            amount: this.decimalToNumber(cashMovement.accountReceivable.amount)
          }
        : null,
      createdAt: cashMovement.createdAt,
      updatedAt: cashMovement.updatedAt
    };
  }


  async createManual(
    data: CreateManualCashMovementDto,
    user: AuthenticatedUser
  ) {
    this.ensureUserCanReadStore(user, data.storeId);

    const store = await this.database.store.findUnique({
      where: {
        id: data.storeId
      },
      select: {
        id: true
      }
    });

    if (!store) {
      throw new NotFoundException('Loja não encontrada');
    }

    if (data.accountPayableId || data.accountReceivableId) {
      throw new BadRequestException({
        code: 'CASH_MOVEMENT_MANUAL_LINK_NOT_ALLOWED',
        message:
          'Movimentação manual não pode estar vinculada a conta a pagar ou conta a receber'
      });
    }

    const description = data.description.trim();

    if (!description) {
      throw new BadRequestException({
        code: 'CASH_MOVEMENT_DESCRIPTION_REQUIRED',
        message: 'description é obrigatório'
      });
    }

    if (data.amount <= 0) {
      throw new BadRequestException({
        code: 'CASH_MOVEMENT_INVALID_AMOUNT',
        message: 'amount deve ser maior que zero'
      });
    }

    const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();

    const cashMovement = await this.database.cashMovement.create({
      data: {
        storeId: data.storeId,
        userId: user.id,
        type: data.type,
        source: CashMovementSource.MANUAL,
        amount: new Prisma.Decimal(data.amount),
        occurredAt,
        description,
        document: data.document?.trim() || null,
        notes: data.notes?.trim() || null
      },
      include: cashMovementInclude
    });

    return this.formatCashMovement(cashMovement);
  }

  async findAll(params: FindAllCashMovementsParams) {
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
      params.occurredAtFrom,
      params.occurredAtTo,
      'CASH_MOVEMENT_INVALID_OCCURRED_AT_RANGE',
      'occurredAtFrom não pode ser maior que occurredAtTo'
    );

    const search = params.search?.trim();

    const where: Prisma.CashMovementWhereInput = {
      storeId: params.storeId
        ? params.storeId
        : {
            in: allowedStoreIds
          },
      ...(params.accountPayableId
        ? { accountPayableId: params.accountPayableId }
        : {}),
      ...(params.accountReceivableId
        ? { accountReceivableId: params.accountReceivableId }
        : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(params.source ? { source: params.source } : {}),
      ...(params.occurredAtFrom || params.occurredAtTo
        ? {
            occurredAt: {
              ...(params.occurredAtFrom ? { gte: new Date(params.occurredAtFrom) } : {}),
              ...(params.occurredAtTo ? { lte: new Date(params.occurredAtTo) } : {})
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
                accountPayable: {
                  is: {
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
                      }
                    ]
                  }
                }
              },
              {
                accountReceivable: {
                  is: {
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
                      }
                    ]
                  }
                }
              }
            ]
          }
        : {})
    };

    const [total, cashMovements] = await this.database.$transaction([
      this.database.cashMovement.count({
        where
      }),
      this.database.cashMovement.findMany({
        where,
        skip: params.pagination.skip,
        take: params.pagination.take,
        orderBy: [
          {
            occurredAt: 'desc'
          },
          {
            createdAt: 'desc'
          }
        ],
        include: cashMovementInclude
      })
    ]);

    return {
      total,
      data: cashMovements.map((cashMovement) =>
        this.formatCashMovement(cashMovement)
      )
    };
  }

  async findById(id: string, user: AuthenticatedUser) {
    const cashMovement = await this.database.cashMovement.findUnique({
      where: {
        id
      },
      include: cashMovementInclude
    });

    if (!cashMovement) {
      throw new NotFoundException('Movimentação de caixa não encontrada');
    }

    this.ensureUserCanReadStore(user, cashMovement.storeId);

    return this.formatCashMovement(cashMovement);
  }

  async getStoreSummary(storeId: string, user: AuthenticatedUser) {
    this.ensureUserCanReadStore(user, storeId);

    const store = await this.database.store.findUnique({
      where: {
        id: storeId
      },
      select: {
        id: true,
        name: true,
        tradeName: true,
        document: true,
        isActive: true
      }
    });

    if (!store) {
      throw new NotFoundException('Loja não encontrada');
    }

    const [inflow, outflow, total, accountPayable, accountReceivable, manual] =
      await this.database.$transaction([
        this.database.cashMovement.aggregate({
          where: {
            storeId,
            type: CashMovementType.INFLOW
          },
          _count: {
            _all: true
          },
          _sum: {
            amount: true
          }
        }),
        this.database.cashMovement.aggregate({
          where: {
            storeId,
            type: CashMovementType.OUTFLOW
          },
          _count: {
            _all: true
          },
          _sum: {
            amount: true
          }
        }),
        this.database.cashMovement.aggregate({
          where: {
            storeId
          },
          _count: {
            _all: true
          },
          _sum: {
            amount: true
          }
        }),
        this.database.cashMovement.aggregate({
          where: {
            storeId,
            source: CashMovementSource.ACCOUNT_PAYABLE
          },
          _count: {
            _all: true
          },
          _sum: {
            amount: true
          }
        }),
        this.database.cashMovement.aggregate({
          where: {
            storeId,
            source: CashMovementSource.ACCOUNT_RECEIVABLE
          },
          _count: {
            _all: true
          },
          _sum: {
            amount: true
          }
        }),
        this.database.cashMovement.aggregate({
          where: {
            storeId,
            source: CashMovementSource.MANUAL
          },
          _count: {
            _all: true
          },
          _sum: {
            amount: true
          }
        })
      ]);

    const inflowAmount = this.decimalToNumber(inflow._sum.amount);
    const outflowAmount = this.decimalToNumber(outflow._sum.amount);
    const balance = inflowAmount - outflowAmount;
    const totalCount = total._count._all;
    const totalAmount = this.decimalToNumber(total._sum.amount);
    const typeCount = inflow._count._all + outflow._count._all;
    const typeAmount = inflowAmount + outflowAmount;
    const sourceCount =
      accountPayable._count._all +
      accountReceivable._count._all +
      manual._count._all;
    const sourceAmount =
      this.decimalToNumber(accountPayable._sum.amount) +
      this.decimalToNumber(accountReceivable._sum.amount) +
      this.decimalToNumber(manual._sum.amount);

    const typeBreakdownMatchesTotal =
      typeCount === totalCount && Math.abs(typeAmount - totalAmount) < 0.0001;
    const sourceBreakdownMatchesTotal =
      sourceCount === totalCount && Math.abs(sourceAmount - totalAmount) < 0.0001;
    const balanceMatchesInflowMinusOutflow =
      Math.abs(balance - (inflowAmount - outflowAmount)) < 0.0001;

    return {
      storeId,
      store,
      inflow: {
        count: inflow._count._all,
        amount: inflowAmount
      },
      outflow: {
        count: outflow._count._all,
        amount: outflowAmount
      },
      total: {
        count: totalCount,
        amount: totalAmount
      },
      balance,
      bySource: {
        accountPayable: {
          count: accountPayable._count._all,
          amount: this.decimalToNumber(accountPayable._sum.amount)
        },
        accountReceivable: {
          count: accountReceivable._count._all,
          amount: this.decimalToNumber(accountReceivable._sum.amount)
        },
        manual: {
          count: manual._count._all,
          amount: this.decimalToNumber(manual._sum.amount)
        }
      },
      checks: {
        typeBreakdownMatchesTotal,
        sourceBreakdownMatchesTotal,
        balanceMatchesInflowMinusOutflow
      },
      isConsistent:
        typeBreakdownMatchesTotal &&
        sourceBreakdownMatchesTotal &&
        balanceMatchesInflowMinusOutflow,
      checkedAt: new Date()
    };
  }
}
