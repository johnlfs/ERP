import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query
} from '@nestjs/common';
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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryStatusDto } from './dto/update-category-status.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    @Inject(CategoriesService)
    private readonly categoriesService: CategoriesService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cria uma categoria' })
  async create(@Body() body: CreateCategoryDto) {
    const category = await this.categoriesService.create(body);

    return apiResponse(category);
  }

  @Get()
  @ApiOperation({ summary: 'Lista categorias com paginação, busca e filtro por loja' })
  async findAll(@Query() query: ListByStoreQueryDto) {
    const pagination = parsePagination(query);
    const search = normalizeSearch(query.search);
    const storeId = query.storeId;

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

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza dados básicos de uma categoria' })
  async update(@Param('id') id: string, @Body() body: UpdateCategoryDto) {
    const category = await this.categoriesService.update(
      validateUuidParam(id, 'id'),
      body
    );

    return apiResponse(category);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Ativa ou desativa uma categoria' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateCategoryStatusDto
  ) {
    const category = await this.categoriesService.updateStatus(
      validateUuidParam(id, 'id'),
      body
    );

    return apiResponse(category);
  }
}
