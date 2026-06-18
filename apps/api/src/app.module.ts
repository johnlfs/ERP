import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { CategoriesModule } from './categories/categories.module';
import { AppConfigModule } from './config/app-config.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { StoresModule } from './stores/stores.module';

@Module({
  imports: [
    AppConfigModule,
    AuthModule,
    DatabaseModule,
    StoresModule,
    ProductsModule,
    SalesModule,
    StockMovementsModule,
    CategoriesModule
  ],
  controllers: [AppController]
})
export class AppModule {}
