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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cria uma categoria' })
  async create(
    @Body() body: CreateCategoryDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const category = await this.categoriesService.create(body, user);

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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza dados básicos de uma categoria' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCategoryDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const category = await this.categoriesService.update(
      validateUuidParam(id, 'id'),
      body,
      user
    );

    return apiResponse(category);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ativa ou desativa uma categoria' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateCategoryStatusDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const category = await this.categoriesService.updateStatus(
      validateUuidParam(id, 'id'),
      body,
      user
    );

    return apiResponse(category);
  }
}
