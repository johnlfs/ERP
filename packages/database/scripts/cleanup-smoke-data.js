const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const includeTestData = process.env.CLEAN_TEST_DATA === 'true';

const productPrefixes = ['SMOKE-PROD-'];
const productNamePrefixes = ['Smoke Produto '];
const categoryNamePrefixes = ['Smoke Categoria '];

if (includeTestData) {
  productNamePrefixes.push('Teste Produto ');
  categoryNamePrefixes.push('Teste Categoria ');
  productPrefixes.push('PROD-178');
}

function startsWithFilters(field, prefixes) {
  return prefixes.map((prefix) => ({
    [field]: {
      startsWith: prefix
    }
  }));
}

async function main() {
  const smokeCategories = await prisma.category.findMany({
    where: {
      OR: startsWithFilters('name', categoryNamePrefixes)
    },
    select: {
      id: true,
      name: true
    }
  });

  const smokeCategoryIds = smokeCategories.map((category) => category.id);

  const productDeleteWhere = {
    OR: [
      ...startsWithFilters('name', productNamePrefixes),
      ...startsWithFilters('internalCode', productPrefixes),
      ...(smokeCategoryIds.length > 0
        ? [
            {
              categoryId: {
                in: smokeCategoryIds
              }
            }
          ]
        : [])
    ]
  };

  const deletedProducts = await prisma.product.deleteMany({
    where: productDeleteWhere
  });

  const deletedCategories = await prisma.category.deleteMany({
    where: {
      OR: startsWithFilters('name', categoryNamePrefixes)
    }
  });

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        deletedProducts: deletedProducts.count,
        deletedCategories: deletedCategories.count,
        includeTestData
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
