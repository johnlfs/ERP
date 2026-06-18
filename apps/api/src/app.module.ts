import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { StoresModule } from './stores/stores.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [DatabaseModule, StoresModule, ProductsModule],
  controllers: [AppController]
})
export class AppModule {}
