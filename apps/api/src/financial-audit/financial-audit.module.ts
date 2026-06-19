import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FinancialAuditController } from './financial-audit.controller';
import { FinancialAuditService } from './financial-audit.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FinancialAuditController],
  providers: [FinancialAuditService]
})
export class FinancialAuditModule {}
