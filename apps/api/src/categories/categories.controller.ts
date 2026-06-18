import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { apiListResponse, apiResponse } from '../common/api-response';
import {
  createPaginationMeta,
  parsePagination
} from '../common/pagination';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(
    @Inject(CategoriesService)
    private readonly categoriesService: CategoriesService
  ) {}

  @Get()
  async findAll(@Query() query: Record<string, string | undefined>) {
    const pagination = parsePagination(query);

    const result = await this.categoriesService.findAll({
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
    const category = await this.categoriesService.findById(id);

    return apiResponse(category);
  }
}
