import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { apiListResponse, apiResponse } from '../common/api-response';
import { ListQueryDto } from '../common/dto/list-query.dto';
import {
  createPaginationMeta,
  parsePagination
} from '../common/pagination';
import {
  normalizeSearch,
  validateUuidParam
} from '../common/validation';
import { StoresService } from './stores.service';

@ApiTags('stores')
@Controller('stores')
export class StoresController {
  constructor(
    @Inject(StoresService)
    private readonly storesService: StoresService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista lojas com paginação e busca' })
  async findAll(@Query() query: ListQueryDto) {
    const pagination = parsePagination(query);
    const search = normalizeSearch(query.search);

    const result = await this.storesService.findAll({
      search,
      pagination
    });

    return apiListResponse(
      result.data,
      createPaginationMeta(result.total, result.data.length, pagination, {
        search: search ?? null
      })
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca uma loja por ID' })
  async findById(@Param('id') id: string) {
    const store = await this.storesService.findById(
      validateUuidParam(id, 'id')
    );

    return apiResponse(store);
  }
}
