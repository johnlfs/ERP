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
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { ListPurchasesQueryDto } from './dto/list-purchases-query.dto';
import { PurchasesService } from './purchases.service';

@ApiTags('purchases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('purchases')
export class PurchasesController {
  constructor(
    @Inject(PurchasesService)
    private readonly purchasesService: PurchasesService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista compras' })
  async findAll(
    @Query() query: ListPurchasesQueryDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const pagination = parsePagination(query);

    const result = await this.purchasesService.findAll({
      storeId: query.storeId,
      supplierId: query.supplierId,
      status: query.status,
      search: query.search,
      pagination,
      user
    });

    return apiListResponse(
      result.data,
      createPaginationMeta(result.total, result.data.length, pagination, {
        storeId: query.storeId ?? null,
        supplierId: query.supplierId ?? null,
        status: query.status ?? null,
        search: query.search ?? null
      })
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca uma compra por ID' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const purchase = await this.purchasesService.findById(
      validateUuidParam(id, 'id'),
      user
    );

    return apiResponse(purchase);
  }

  @Post()
  @ApiOperation({ summary: 'Cria compra recebida com entrada de estoque' })
  async create(
    @Body() body: CreatePurchaseDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const purchase = await this.purchasesService.create(body, user);

    return apiResponse(purchase);
  }
}
