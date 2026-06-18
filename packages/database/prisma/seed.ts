import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const store = await prisma.store.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000001',
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Loja Demonstração',
      tradeName: 'RetailFlow Demo',
      document: '00000000000000',
    },
  });

  const admin = await prisma.user.upsert({
    where: {
      email: 'admin@retailflow.local',
    },
    update: {},
    create: {
      name: 'Administrador Demo',
      email: 'admin@retailflow.local',
      passwordHash: 'CHANGE_ME_LATER',
    },
  });

  await prisma.storeUser.upsert({
    where: {
      userId_storeId: {
        userId: admin.id,
        storeId: store.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      storeId: store.id,
      role: UserRole.ADMIN,
    },
  });

  const category = await prisma.category.upsert({
    where: {
      storeId_name: {
        storeId: store.id,
        name: 'Geral',
      },
    },
    update: {},
    create: {
      storeId: store.id,
      name: 'Geral',
    },
  });

  await prisma.product.upsert({
    where: {
      storeId_internalCode: {
        storeId: store.id,
        internalCode: 'PROD-001',
      },
    },
    update: {},
    create: {
      storeId: store.id,
      categoryId: category.id,
      internalCode: 'PROD-001',
      barcode: '7890000000011',
      name: 'Produto Demonstração',
      description: 'Produto inicial para testes do RetailFlow Pro',
      costPrice: 10.0,
      salePrice: 19.9,
      ncm: '00000000',
      unit: 'UN',
      minStock: 5,
      currentStock: 100,
    },
  });

  console.log('Seed concluído com sucesso');
}

main()
  .catch((error) => {
    console.error('Erro ao executar seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
