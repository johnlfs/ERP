import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
import { CategoriesService } from './categories.service';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    @Inject(CategoriesService)
    private readonly categoriesService: CategoriesService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista categorias com paginação, busca e filtro por loja' })
  async findAll(@Query() query: Record<string, string | undefined>) {
    const pagination = parsePagination(query);
    const storeId = validateOptionalUuidQuery(query.storeId, 'storeId');
    const search = normalizeSearch(query.search);

    const result = await this.categoriesService.findAll({
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
  @ApiOperation({ summary: 'Busca uma categoria por ID' })
  async findById(@Param('id') id: string) {
    const category = await this.categoriesService.findById(
      validateUuidParam(id, 'id')
    );

    return apiResponse(category);
  }
}
