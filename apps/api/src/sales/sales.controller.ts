import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
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
import { CreateSaleDto } from './dto/create-sale.dto';
import { ListSalesQueryDto } from './dto/list-sales-query.dto';
import { SalesService } from './sales.service';

@ApiTags('sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('sales')
export class SalesController {
  constructor(
    @Inject(SalesService)
    private readonly salesService: SalesService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista vendas' })
  async findAll(
    @Query() query: ListSalesQueryDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const pagination = parsePagination(query);

    const result = await this.salesService.findAll({
      storeId: query.storeId,
      status: query.status,
      paymentMethod: query.paymentMethod,
      pagination,
      user
    });

    return apiListResponse(
      result.data,
      createPaginationMeta(result.total, result.data.length, pagination, {
        storeId: query.storeId ?? null,
        status: query.status ?? null,
        paymentMethod: query.paymentMethod ?? null
      })
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca uma venda por ID' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const sale = await this.salesService.findById(
      validateUuidParam(id, 'id'),
      user
    );

    return apiResponse(sale);
  }

  @Post()
  @ApiOperation({ summary: 'Cria venda e baixa estoque' })
  async create(
    @Body() body: CreateSaleDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const sale = await this.salesService.create(body, user);

    return apiResponse(sale);
  }
}
