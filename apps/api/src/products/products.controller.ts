import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { apiListResponse, apiResponse } from '../common/api-response';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(
    @Inject(ProductsService)
    private readonly productsService: ProductsService
  ) {}

  @Get()
  async findAll(@Query('storeId') storeId?: string) {
    const products = await this.productsService.findAll(storeId);

    return apiListResponse(products, {
      storeId: storeId ?? null
    });
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const product = await this.productsService.findById(id);

    return apiResponse(product);
  }
}
