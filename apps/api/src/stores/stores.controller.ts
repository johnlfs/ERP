import { Controller, Get, Inject, Param } from '@nestjs/common';
import { StoresService } from './stores.service';

@Controller('stores')
export class StoresController {
  constructor(
    @Inject(StoresService)
    private readonly storesService: StoresService
  ) {}

  @Get()
  findAll() {
    return this.storesService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.storesService.findById(id);
  }
}
