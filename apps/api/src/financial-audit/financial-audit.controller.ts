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
import { FinancialAuditService } from './financial-audit.service';

@ApiTags('financial-audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('financial-audit')
export class FinancialAuditController {
  constructor(
    @Inject(FinancialAuditService)
    private readonly financialAuditService: FinancialAuditService
  ) {}

  @Get('stores/:storeId/summary')
  @ApiOperation({ summary: 'Resumo de auditoria financeira por loja' })
  async getStoreSummary(
    @Param('storeId') storeId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const summary = await this.financialAuditService.getStoreSummary(
      validateUuidParam(storeId, 'storeId'),
      user
    );

    return apiResponse(summary);
  }
}
