import 'reflect-metadata';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1', {
    exclude: [
      {
        path: '/',
        method: RequestMethod.GET
      },
      {
        path: 'health',
        method: RequestMethod.GET
      }
    ]
  });

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

  const webUrl = configService.get<string>('WEB_URL') ?? 'http://localhost:53000';
  const pdvUrl = configService.get<string>('PDV_URL') ?? 'http://localhost:53002';

  app.enableCors({
    origin: [webUrl, pdvUrl],
    credentials: true
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('RetailFlow Pro API')
    .setDescription('API do RetailFlow Pro para ERP/POS web de varejo.')
    .setVersion('0.1.0')
    .addTag('health')
    .addTag('database')
    .addTag('stores')
    .addTag('categories')
    .addTag('products')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true
    }
  });

  const port = configService.get<number>('API_PORT') ?? 53001;

  await app.listen(port, '0.0.0.0');

  console.log(`RetailFlow Pro API running on http://localhost:${port}`);
  console.log(`Swagger docs available on http://localhost:${port}/api/docs`);
}

bootstrap();
