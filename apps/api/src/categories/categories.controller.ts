import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { apiListResponse, apiResponse } from '../common/api-response';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(
    @Inject(CategoriesService)
    private readonly categoriesService: CategoriesService
  ) {}

  @Get()
  async findAll(@Query('storeId') storeId?: string) {
    const categories = await this.categoriesService.findAll(storeId);

    return apiListResponse(categories, {
      storeId: storeId ?? null
    });
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const category = await this.categoriesService.findById(id);

    return apiResponse(category);
  }
}
