import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:53000',
      'http://localhost:53002'
    ],
    credentials: true
  });

  const port = Number(process.env.API_PORT ?? 53001);

  await app.listen(port, '0.0.0.0');

  console.log(`RetailFlow Pro API running on http://localhost:${port}`);
}

bootstrap();
