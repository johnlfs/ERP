import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

config({
  path: '/home/lugo/projetos/ERP/.env',
});

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
