import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { apiListResponse, apiResponse } from '../common/api-response';
import {
  createPaginationMeta,
  parsePagination
} from '../common/pagination';
import {
  normalizeSearch,
  validateUuidParam
} from '../common/validation';
import { StoresService } from './stores.service';

@Controller('stores')
export class StoresController {
  constructor(
    @Inject(StoresService)
    private readonly storesService: StoresService
  ) {}

  @Get()
  async findAll(@Query() query: Record<string, string | undefined>) {
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
  async findById(@Param('id') id: string) {
    const store = await this.storesService.findById(
      validateUuidParam(id, 'id')
    );

    return apiResponse(store);
  }
}
