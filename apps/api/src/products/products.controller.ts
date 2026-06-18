import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { apiListResponse, apiResponse } from '../common/api-response';
import { ListByStoreQueryDto } from '../common/dto/list-by-store-query.dto';
import {
  createPaginationMeta,
  parsePagination
} from '../common/pagination';
import {
  normalizeSearch,
  validateUuidParam
} from '../common/validation';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    @Inject(ProductsService)
    private readonly productsService: ProductsService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cria um produto' })
  async create(
    @Body() body: CreateProductDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const product = await this.productsService.create(body, user);

    return apiResponse(product);
  }

  @Get()
  @ApiOperation({ summary: 'Lista produtos com paginação, busca e filtro por loja' })
  async findAll(@Query() query: ListByStoreQueryDto) {
    const pagination = parsePagination(query);
    const search = normalizeSearch(query.search);
    const storeId = query.storeId;

    const result = await this.productsService.findAll({
      storeId,
      search,
      pagination
    });

    return apiListResponse(
      result.data,
      createPaginationMeta(result.total, result.data.length, pagination, {
        storeId: storeId ?? null,
        search: search ?? null
      })
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um produto por ID' })
  async findById(@Param('id') id: string) {
    const product = await this.productsService.findById(
      validateUuidParam(id, 'id')
    );

    return apiResponse(product);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza dados básicos de um produto' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const product = await this.productsService.update(
      validateUuidParam(id, 'id'),
      body,
      user
    );

    return apiResponse(product);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza o status de um produto' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateProductStatusDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const product = await this.productsService.updateStatus(
      validateUuidParam(id, 'id'),
      body,
      user
    );

    return apiResponse(product);
  }
}
