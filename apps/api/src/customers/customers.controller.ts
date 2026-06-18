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
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import { UpdateCustomerStatusDto } from './dto/update-customer-status.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('customers')
export class CustomersController {
  constructor(
    @Inject(CustomersService)
    private readonly customersService: CustomersService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista clientes' })
  async findAll(
    @Query() query: ListCustomersQueryDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const pagination = parsePagination(query);

    const result = await this.customersService.findAll({
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
  @ApiOperation({ summary: 'Busca um cliente por ID' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const customer = await this.customersService.findById(
      validateUuidParam(id, 'id'),
      user
    );

    return apiResponse(customer);
  }

  @Post()
  @ApiOperation({ summary: 'Cria cliente' })
  async create(
    @Body() body: CreateCustomerDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const customer = await this.customersService.create(body, user);

    return apiResponse(customer);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza cliente' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCustomerDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const customer = await this.customersService.update(
      validateUuidParam(id, 'id'),
      body,
      user
    );

    return apiResponse(customer);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Ativa ou inativa cliente' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateCustomerStatusDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const customer = await this.customersService.updateStatus(
      validateUuidParam(id, 'id'),
      body,
      user
    );

    return apiResponse(customer);
  }
}
