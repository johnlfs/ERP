import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Query,
  UseGuards
} from '@nestjs/common';
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
import { AccountsPayableService } from './accounts-payable.service';
import { ListAccountsPayableQueryDto } from './dto/list-accounts-payable-query.dto';
import { PayAccountPayableDto } from './dto/pay-account-payable.dto';

@ApiTags('accounts-payable')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('accounts-payable')
export class AccountsPayableController {
  constructor(
    @Inject(AccountsPayableService)
    private readonly accountsPayableService: AccountsPayableService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista contas a pagar' })
  async findAll(
    @Query() query: ListAccountsPayableQueryDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const pagination = parsePagination(query);

    const result = await this.accountsPayableService.findAll({
      storeId: query.storeId,
      supplierId: query.supplierId,
      purchaseId: query.purchaseId,
      status: query.status,
      search: query.search,
      dueDateFrom: query.dueDateFrom,
      dueDateTo: query.dueDateTo,
      pagination,
      user
    });

    return apiListResponse(
      result.data,
      createPaginationMeta(result.total, result.data.length, pagination, {
        storeId: query.storeId ?? null,
        supplierId: query.supplierId ?? null,
        purchaseId: query.purchaseId ?? null,
        status: query.status ?? null,
        search: query.search ?? null,
        dueDateFrom: query.dueDateFrom ?? null,
        dueDateTo: query.dueDateTo ?? null
      })
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca uma conta a pagar por ID' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const accountPayable = await this.accountsPayableService.findById(
      validateUuidParam(id, 'id'),
      user
    );

    return apiResponse(accountPayable);
  }

  @Patch(':id/pay')
  @ApiOperation({ summary: 'Realiza baixa total de uma conta a pagar' })
  async pay(
    @Param('id') id: string,
    @Body() body: PayAccountPayableDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const accountPayable = await this.accountsPayableService.pay(
      validateUuidParam(id, 'id'),
      body,
      user
    );

    return apiResponse(accountPayable);
  }
}
