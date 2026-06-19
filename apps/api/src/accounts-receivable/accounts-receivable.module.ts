import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AccountsReceivableController } from './accounts-receivable.controller';
import { AccountsReceivableService } from './accounts-receivable.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AccountsReceivableController],
  providers: [AccountsReceivableService]
})
export class AccountsReceivableModule {}
