import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { AppConfigModule } from './config/app-config.module';
import { CustomersModule } from './customers/customers.module';
import { DatabaseModule } from './database/database.module';
import { ProductsModule } from './products/products.module';
import { PurchasesModule } from './purchases/purchases.module';
import { SalesModule } from './sales/sales.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { StoresModule } from './stores/stores.module';
import { SuppliersModule } from './suppliers/suppliers.module';

@Module({
  imports: [
    AppConfigModule,
    AuthModule,
    DatabaseModule,
    StoresModule,
    CategoriesModule,
    CustomersModule,
    SuppliersModule,
    ProductsModule,
    PurchasesModule,
    SalesModule,
    StockMovementsModule
  ],
  controllers: [AppController]
})
export class AppModule {}
