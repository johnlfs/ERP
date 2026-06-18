import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Retorna informações básicas da API' })
  getRoot() {
    return {
      app: 'RetailFlow Pro API',
      status: 'ok',
      message: 'API base funcionando'
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Healthcheck da API' })
  getHealth() {
    return {
      status: 'ok',
      service: 'api',
      environment: process.env.NODE_ENV ?? 'development',
      port: Number(process.env.API_PORT ?? 53001),
      timestamp: new Date().toISOString()
    };
  }
}
