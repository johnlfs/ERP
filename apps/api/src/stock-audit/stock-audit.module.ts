import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { StockAuditController } from './stock-audit.controller';
import { StockAuditService } from './stock-audit.service';

@Module({
  imports: [DatabaseModule],
  controllers: [StockAuditController],
  providers: [StockAuditService]
})
export class StockAuditModule {}
