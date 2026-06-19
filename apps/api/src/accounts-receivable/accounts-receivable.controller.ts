import { Controller, Get, Inject, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { apiListResponse, apiResponse } from '../common/api-response';
import {
  createPaginationMeta,
  parsePagination
} from '../common/pagination';
import { validateUuidParam } from '../common/validation';
import { AccountsReceivableService } from './accounts-receivable.service';
import { ListAccountsReceivableQueryDto } from './dto/list-accounts-receivable-query.dto';

@ApiTags('accounts-receivable')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('accounts-receivable')
export class AccountsReceivableController {
  constructor(
    @Inject(AccountsReceivableService)
    private readonly accountsReceivableService: AccountsReceivableService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista contas a receber' })
  async findAll(
    @Query() query: ListAccountsReceivableQueryDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const pagination = parsePagination(query);

    const result = await this.accountsReceivableService.findAll({
      storeId: query.storeId,
      customerId: query.customerId,
      saleId: query.saleId,
      status: query.status,
      search: query.search,
      dueDateFrom: query.dueDateFrom,
      dueDateTo: query.dueDateTo,
      receivedAtFrom: query.receivedAtFrom,
      receivedAtTo: query.receivedAtTo,
      pagination,
      user
    });

    return apiListResponse(
      result.data,
      createPaginationMeta(result.total, result.data.length, pagination, {
        storeId: query.storeId ?? null,
        customerId: query.customerId ?? null,
        saleId: query.saleId ?? null,
        status: query.status ?? null,
        search: query.search ?? null,
        dueDateFrom: query.dueDateFrom ?? null,
        dueDateTo: query.dueDateTo ?? null,
        receivedAtFrom: query.receivedAtFrom ?? null,
        receivedAtTo: query.receivedAtTo ?? null
      })
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca uma conta a receber por ID' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const accountReceivable = await this.accountsReceivableService.findById(
      validateUuidParam(id, 'id'),
      user
    );

    return apiResponse(accountReceivable);
  }
}
