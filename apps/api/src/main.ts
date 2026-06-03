import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:53000',
      'http://localhost:53002',
    ],
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 53001);

  await app.listen(port);

  console.log(`RetailFlow Pro API running on http://localhost:${port}`);
}

bootstrap();
