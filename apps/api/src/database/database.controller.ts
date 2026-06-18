import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException
} from '@nestjs/common';
import { DatabaseService } from './database.service';

@Controller('database')
export class DatabaseController {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService
  ) {}

  @Get('status')
  async getStatus() {
    try {
      const [users, stores, products] = await Promise.all([
        this.database.user.count(),
        this.database.store.count(),
        this.database.product.count()
      ]);

      return {
        status: 'ok',
        database: 'connected',
        users,
        stores,
        products,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'disconnected',
        message: error instanceof Error ? error.message : 'Unknown database error'
      });
    }
  }
}
