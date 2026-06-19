import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CashMovementsController } from './cash-movements.controller';
import { CashMovementsService } from './cash-movements.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CashMovementsController],
  providers: [CashMovementsService],
  exports: [CashMovementsService]
})
export class CashMovementsModule {}
