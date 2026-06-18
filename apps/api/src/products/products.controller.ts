import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { apiListResponse, apiResponse } from '../common/api-response';
import {
  createPaginationMeta,
  parsePagination
} from '../common/pagination';
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

    const result = await this.productsService.findAll({
      storeId: query.storeId,
      search: query.search,
      pagination
    });

    return apiListResponse(
      result.data,
      createPaginationMeta(result.total, result.data.length, pagination, {
        storeId: query.storeId ?? null,
        search: query.search ?? null
      })
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const product = await this.productsService.findById(id);

    return apiResponse(product);
  }
}
