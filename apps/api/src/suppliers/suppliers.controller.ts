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
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { apiListResponse, apiResponse } from '../common/api-response';
import {
  createPaginationMeta,
  parsePagination
} from '../common/pagination';
import { validateUuidParam } from '../common/validation';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto';
import { UpdateSupplierStatusDto } from './dto/update-supplier-status.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('suppliers')
export class SuppliersController {
  constructor(
    @Inject(SuppliersService)
    private readonly suppliersService: SuppliersService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista fornecedores' })
  async findAll(
    @Query() query: ListSuppliersQueryDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const pagination = parsePagination(query);

    const result = await this.suppliersService.findAll({
      storeId: query.storeId,
      isActive: query.isActive,
      search: query.search,
      pagination,
      user
    });

    return apiListResponse(
      result.data,
      createPaginationMeta(result.total, result.data.length, pagination, {
        storeId: query.storeId ?? null,
        isActive: query.isActive ?? null,
        search: query.search ?? null
      })
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um fornecedor por ID' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const supplier = await this.suppliersService.findById(
      validateUuidParam(id, 'id'),
      user
    );

    return apiResponse(supplier);
  }

  @Post()
  @ApiOperation({ summary: 'Cria fornecedor' })
  async create(
    @Body() body: CreateSupplierDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const supplier = await this.suppliersService.create(body, user);

    return apiResponse(supplier);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza fornecedor' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateSupplierDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const supplier = await this.suppliersService.update(
      validateUuidParam(id, 'id'),
      body,
      user
    );

    return apiResponse(supplier);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Ativa ou inativa fornecedor' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateSupplierStatusDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const supplier = await this.suppliersService.updateStatus(
      validateUuidParam(id, 'id'),
      body,
      user
    );

    return apiResponse(supplier);
  }
}
