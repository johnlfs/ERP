import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      app: 'RetailFlow Pro API',
      status: 'running',
      health: '/health',
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'api',
      project: 'RetailFlow Pro',
      timestamp: new Date().toISOString(),
    };
  }
}
