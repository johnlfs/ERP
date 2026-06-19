import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AccountsPayableController } from './accounts-payable.controller';
import { AccountsPayableService } from './accounts-payable.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AccountsPayableController],
  providers: [AccountsPayableService]
})
export class AccountsPayableModule {}
