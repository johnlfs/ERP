import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(
    @Inject(ProductsService)
    private readonly productsService: ProductsService
  ) {}

  @Get()
  findAll(@Query('storeId') storeId?: string) {
    return this.productsService.findAll(storeId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }
}
