const bcrypt = require('bcryptjs');
const { PrismaClient, StoreUserStatus, UserRole } = require('@prisma/client');

const prisma = new PrismaClient();

const DEMO_EMAIL = process.env.AUTH_DEMO_EMAIL || 'admin@retailflow.local';
const DEMO_PASSWORD = process.env.AUTH_DEMO_PASSWORD || 'Admin@123456';
const DEMO_NAME = process.env.AUTH_DEMO_NAME || 'Administrador Demo';
const DEMO_STORE_ID =
  process.env.AUTH_DEMO_STORE_ID || '00000000-0000-0000-0000-000000000001';

const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, saltRounds);

  let user = await prisma.user.findUnique({
    where: {
      email: DEMO_EMAIL
    }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: DEMO_NAME,
        email: DEMO_EMAIL,
        passwordHash,
        isActive: true
      }
    });
  } else {
    user = await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        name: user.name || DEMO_NAME,
        passwordHash,
        isActive: true
      }
    });
  }

  const store = await prisma.store.findUnique({
    where: {
      id: DEMO_STORE_ID
    }
  });

  if (!store) {
    throw new Error(`Loja demo não encontrada: ${DEMO_STORE_ID}`);
  }

  const existingStoreUser = await prisma.storeUser.findFirst({
    where: {
      userId: user.id,
      storeId: store.id
    }
  });

  if (!existingStoreUser) {
    await prisma.storeUser.create({
      data: {
        userId: user.id,
        storeId: store.id,
        role: UserRole.ADMIN,
        status: StoreUserStatus.ACTIVE
      }
    });
  } else {
    await prisma.storeUser.update({
      where: {
        id: existingStoreUser.id
      },
      data: {
        role: UserRole.ADMIN,
        status: StoreUserStatus.ACTIVE
      }
    });
  }

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        storeId: store.id
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          status: 'error',
          message: error.message
        },
        null,
        2
      )
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
