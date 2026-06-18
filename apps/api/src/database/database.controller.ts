import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DatabaseService } from './database.service';

@ApiTags('database')
@Controller('database')
export class DatabaseController {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Verifica conexão com o banco de dados' })
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
