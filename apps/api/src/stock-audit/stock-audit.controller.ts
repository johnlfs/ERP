import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { apiResponse } from '../common/api-response';
import { validateUuidParam } from '../common/validation';
import { StockAuditService } from './stock-audit.service';

@ApiTags('stock-audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('stock-audit')
export class StockAuditController {
  constructor(
    @Inject(StockAuditService)
    private readonly stockAuditService: StockAuditService
  ) {}

  @Get('products/:productId')
  @ApiOperation({ summary: 'Valida consistência de estoque de um produto' })
  async auditProduct(
    @Param('productId') productId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const result = await this.stockAuditService.auditProduct(
      validateUuidParam(productId, 'productId'),
      user
    );

    return apiResponse(result);
  }
}
