import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      app: 'RetailFlow Pro API',
      status: 'ok',
      message: 'API base funcionando'
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString()
    };
  }
}
