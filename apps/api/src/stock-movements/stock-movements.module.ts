import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';

@Module({
  imports: [DatabaseModule],
  controllers: [StockMovementsController],
  providers: [StockMovementsService]
})
export class StockMovementsModule {}
