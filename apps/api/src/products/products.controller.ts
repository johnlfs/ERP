import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { apiListResponse, apiResponse } from '../common/api-response';
import {
  createPaginationMeta,
  parsePagination
} from '../common/pagination';
import {
  normalizeSearch,
  validateOptionalUuidQuery,
  validateUuidParam
} from '../common/validation';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(
    @Inject(ProductsService)
    private readonly productsService: ProductsService
  ) {}

  @Get()
  async findAll(@Query() query: Record<string, string | undefined>) {
    const pagination = parsePagination(query);
    const storeId = validateOptionalUuidQuery(query.storeId, 'storeId');
    const search = normalizeSearch(query.search);

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
  async findById(@Param('id') id: string) {
    const product = await this.productsService.findById(
      validateUuidParam(id, 'id')
    );

    return apiResponse(product);
  }
}
