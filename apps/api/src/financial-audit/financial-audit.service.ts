import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  AccountPayableStatus,
  AccountReceivableStatus,
  CashMovementSource,
  CashMovementType,
  Prisma
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { DatabaseService } from '../database/database.service';

type FinancialBucket = {
  count: number;
  amount: number;
};

type FinancialStatusSummary = {
  open: FinancialBucket;
  paid?: FinancialBucket;
  received?: FinancialBucket;
  canceled: FinancialBucket;
  total: FinancialBucket;
};

type CashMovementSummary = {
  inflow: FinancialBucket;
  outflow: FinancialBucket;
  total: FinancialBucket;
  balance: number;
  bySource: {
    accountPayable: FinancialBucket;
    accountReceivable: FinancialBucket;
    manual: FinancialBucket;
  };
};

@Injectable()
export class FinancialAuditService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService
  ) {}

  private decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
    return Number(value ?? 0);
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

  private formatBucket(count: number, amount: Prisma.Decimal | null | undefined): FinancialBucket {
    return {
      count,
      amount: this.decimalToNumber(amount)
    };
  }

  private async summarizeAccountsPayable(storeId: string): Promise<FinancialStatusSummary> {
    const [open, paid, canceled, total] = await this.database.$transaction([
      this.database.accountPayable.aggregate({
        where: {
          storeId,
          status: AccountPayableStatus.OPEN
        },
        _count: {
          _all: true
        },
        _sum: {
          amount: true
        }
      }),
      this.database.accountPayable.aggregate({
        where: {
          storeId,
          status: AccountPayableStatus.PAID
        },
        _count: {
          _all: true
        },
        _sum: {
          amount: true
        }
      }),
      this.database.accountPayable.aggregate({
        where: {
          storeId,
          status: AccountPayableStatus.CANCELED
        },
        _count: {
          _all: true
        },
        _sum: {
          amount: true
        }
      }),
      this.database.accountPayable.aggregate({
        where: {
          storeId
        },
        _count: {
          _all: true
        },
        _sum: {
          amount: true
        }
      })
    ]);

    return {
      open: this.formatBucket(open._count._all, open._sum.amount),
      paid: this.formatBucket(paid._count._all, paid._sum.amount),
      canceled: this.formatBucket(canceled._count._all, canceled._sum.amount),
      total: this.formatBucket(total._count._all, total._sum.amount)
    };
  }

  private async summarizeAccountsReceivable(storeId: string): Promise<FinancialStatusSummary> {
    const [open, received, canceled, total] = await this.database.$transaction([
      this.database.accountReceivable.aggregate({
        where: {
          storeId,
          status: AccountReceivableStatus.OPEN
        },
        _count: {
          _all: true
        },
        _sum: {
          amount: true
        }
      }),
      this.database.accountReceivable.aggregate({
        where: {
          storeId,
          status: AccountReceivableStatus.RECEIVED
        },
        _count: {
          _all: true
        },
        _sum: {
          amount: true
        }
      }),
      this.database.accountReceivable.aggregate({
        where: {
          storeId,
          status: AccountReceivableStatus.CANCELED
        },
        _count: {
          _all: true
        },
        _sum: {
          amount: true
        }
      }),
      this.database.accountReceivable.aggregate({
        where: {
          storeId
        },
        _count: {
          _all: true
        },
        _sum: {
          amount: true
        }
      })
    ]);

    return {
      open: this.formatBucket(open._count._all, open._sum.amount),
      received: this.formatBucket(received._count._all, received._sum.amount),
      canceled: this.formatBucket(canceled._count._all, canceled._sum.amount),
      total: this.formatBucket(total._count._all, total._sum.amount)
    };
  }

  private async summarizeCashMovements(storeId: string): Promise<CashMovementSummary> {
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

    const inflowBucket = this.formatBucket(inflow._count._all, inflow._sum.amount);
    const outflowBucket = this.formatBucket(outflow._count._all, outflow._sum.amount);

    return {
      inflow: inflowBucket,
      outflow: outflowBucket,
      total: this.formatBucket(total._count._all, total._sum.amount),
      balance: inflowBucket.amount - outflowBucket.amount,
      bySource: {
        accountPayable: this.formatBucket(accountPayable._count._all, accountPayable._sum.amount),
        accountReceivable: this.formatBucket(accountReceivable._count._all, accountReceivable._sum.amount),
        manual: this.formatBucket(manual._count._all, manual._sum.amount)
      }
    };
  }

  private isStatusBreakdownConsistent(summary: FinancialStatusSummary) {
    const statusCount =
      summary.open.count +
      (summary.paid?.count ?? 0) +
      (summary.received?.count ?? 0) +
      summary.canceled.count;

    const statusAmount =
      summary.open.amount +
      (summary.paid?.amount ?? 0) +
      (summary.received?.amount ?? 0) +
      summary.canceled.amount;

    return (
      statusCount === summary.total.count &&
      Math.abs(statusAmount - summary.total.amount) < 0.0001
    );
  }

  private isCashMovementBreakdownConsistent(summary: CashMovementSummary) {
    const typeCount = summary.inflow.count + summary.outflow.count;
    const typeAmount = summary.inflow.amount + summary.outflow.amount;
    const sourceCount =
      summary.bySource.accountPayable.count +
      summary.bySource.accountReceivable.count +
      summary.bySource.manual.count;
    const sourceAmount =
      summary.bySource.accountPayable.amount +
      summary.bySource.accountReceivable.amount +
      summary.bySource.manual.amount;

    return (
      typeCount === summary.total.count &&
      sourceCount === summary.total.count &&
      Math.abs(typeAmount - summary.total.amount) < 0.0001 &&
      Math.abs(sourceAmount - summary.total.amount) < 0.0001 &&
      Math.abs(summary.balance - (summary.inflow.amount - summary.outflow.amount)) < 0.0001
    );
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

    const [accountsPayable, accountsReceivable, cashMovements] = await Promise.all([
      this.summarizeAccountsPayable(storeId),
      this.summarizeAccountsReceivable(storeId),
      this.summarizeCashMovements(storeId)
    ]);

    const accountsPayableConsistent = this.isStatusBreakdownConsistent(accountsPayable);
    const accountsReceivableConsistent = this.isStatusBreakdownConsistent(accountsReceivable);
    const cashMovementsConsistent = this.isCashMovementBreakdownConsistent(cashMovements);

    return {
      storeId,
      store,
      accountsPayable,
      accountsReceivable,
      cashMovements,
      netOpenAmount: accountsReceivable.open.amount - accountsPayable.open.amount,
      cashBalance: cashMovements.balance,
      checks: {
        accountsPayableStatusBreakdownMatchesTotal: accountsPayableConsistent,
        accountsReceivableStatusBreakdownMatchesTotal: accountsReceivableConsistent,
        cashMovementBreakdownMatchesTotal: cashMovementsConsistent,
        cashBalanceMatchesInflowMinusOutflow: Math.abs(
          cashMovements.balance - (cashMovements.inflow.amount - cashMovements.outflow.amount)
        ) < 0.0001
      },
      isConsistent:
        accountsPayableConsistent &&
        accountsReceivableConsistent &&
        cashMovementsConsistent,
      checkedAt: new Date()
    };
  }
}
