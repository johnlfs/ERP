import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { CategoriesModule } from './categories/categories.module';
import { DatabaseModule } from './database/database.module';
import { ProductsModule } from './products/products.module';
import { StoresModule } from './stores/stores.module';

@Module({
  imports: [DatabaseModule, StoresModule, ProductsModule, CategoriesModule],
  controllers: [AppController]
})
export class AppModule {}
