import {
  Controller,
  Get,
  Inject,
  Param,
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
import { CashMovementsService } from './cash-movements.service';
import { ListCashMovementsQueryDto } from './dto/list-cash-movements-query.dto';

@ApiTags('cash-movements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('cash-movements')
export class CashMovementsController {
  constructor(
    @Inject(CashMovementsService)
    private readonly cashMovementsService: CashMovementsService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista movimentações de caixa' })
  async findAll(
    @Query() query: ListCashMovementsQueryDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const pagination = parsePagination(query);

    const result = await this.cashMovementsService.findAll({
      storeId: query.storeId,
      accountPayableId: query.accountPayableId,
      accountReceivableId: query.accountReceivableId,
      type: query.type,
      source: query.source,
      search: query.search,
      occurredAtFrom: query.occurredAtFrom,
      occurredAtTo: query.occurredAtTo,
      pagination,
      user
    });

    return apiListResponse(
      result.data,
      createPaginationMeta(result.total, result.data.length, pagination, {
        storeId: query.storeId ?? null,
        accountPayableId: query.accountPayableId ?? null,
        accountReceivableId: query.accountReceivableId ?? null,
        type: query.type ?? null,
        source: query.source ?? null,
        search: query.search ?? null,
        occurredAtFrom: query.occurredAtFrom ?? null,
        occurredAtTo: query.occurredAtTo ?? null
      })
    );
  }

  @Get('stores/:storeId/summary')
  @ApiOperation({ summary: 'Resumo de caixa por loja' })
  async getStoreSummary(
    @Param('storeId') storeId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const summary = await this.cashMovementsService.getStoreSummary(
      validateUuidParam(storeId, 'storeId'),
      user
    );

    return apiResponse(summary);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca uma movimentação de caixa por ID' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const cashMovement = await this.cashMovementsService.findById(
      validateUuidParam(id, 'id'),
      user
    );

    return apiResponse(cashMovement);
  }
}
