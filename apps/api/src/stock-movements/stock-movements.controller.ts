import {
  Body,
  Controller,
  Get,
  Inject,
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
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { ListStockMovementsQueryDto } from './dto/list-stock-movements-query.dto';
import { StockMovementsService } from './stock-movements.service';

@ApiTags('stock-movements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('stock-movements')
export class StockMovementsController {
  constructor(
    @Inject(StockMovementsService)
    private readonly stockMovementsService: StockMovementsService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista movimentações de estoque' })
  async findAll(
    @Query() query: ListStockMovementsQueryDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const pagination = parsePagination(query);

    const result = await this.stockMovementsService.findAll({
      storeId: query.storeId,
      productId: query.productId,
      saleId: query.saleId,
      type: query.type,
      pagination,
      user
    });

    return apiListResponse(
      result.data,
      createPaginationMeta(result.total, result.data.length, pagination, {
        storeId: query.storeId ?? null,
        productId: query.productId ?? null,
        saleId: query.saleId ?? null,
        type: query.type ?? null
      })
    );
  }

  @Post()
  @ApiOperation({ summary: 'Cria movimentação manual de estoque' })
  async create(
    @Body() body: CreateStockMovementDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const stockMovement = await this.stockMovementsService.create(body, user);

    return apiResponse(stockMovement);
  }
}
