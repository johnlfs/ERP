import { Controller, Get, Inject, Param } from '@nestjs/common';
import { apiListResponse, apiResponse } from '../common/api-response';
import { StoresService } from './stores.service';

@Controller('stores')
export class StoresController {
  constructor(
    @Inject(StoresService)
    private readonly storesService: StoresService
  ) {}

  @Get()
  async findAll() {
    const stores = await this.storesService.findAll();

    return apiListResponse(stores);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const store = await this.storesService.findById(id);

    return apiResponse(store);
  }
}
