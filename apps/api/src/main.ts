import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true
      }
    })
  );

  app.enableCors({
    origin: ['http://localhost:53000', 'http://localhost:53002'],
    credentials: true
  });

  const port = Number(process.env.API_PORT ?? 53001);

  await app.listen(port, '0.0.0.0');

  console.log(`RetailFlow Pro API running on http://localhost:${port}`);
}

bootstrap();
