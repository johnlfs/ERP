import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    @Inject(ProductsService)
    private readonly productsService: ProductsService
  ) {}

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
}
