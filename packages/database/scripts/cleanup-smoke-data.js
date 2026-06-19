const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const includeTestData = process.env.SMOKE_INCLUDE_TEST_DATA === 'true';

async function main() {
  const productWhere = {
    OR: [
      {
        name: {
          startsWith: 'Smoke Produto'
        }
      },
      {
        internalCode: {
          startsWith: 'SMOKE-PROD-'
        }
      }
    ]
  };

  const categoryWhere = {
    name: {
      startsWith: 'Smoke Categoria'
    }
  };

  const supplierWhere = {
    OR: [
      {
        name: {
          startsWith: 'Smoke Fornecedor'
        }
      },
      {
        document: {
          startsWith: 'SMOKE-SUP-DOC-'
        }
      }
    ]
  };

  const customerWhere = {
    OR: [
      {
        name: {
          startsWith: 'Smoke Cliente'
        }
      },
      {
        document: {
          startsWith: 'SMOKE-DOC-'
        }
      }
    ]
  };

  const purchaseWhere = {
    OR: [
      {
        document: {
          startsWith: 'SMOKE-PURCHASE-'
        }
      },
      {
        items: {
          some: {
            product: {
              is: productWhere
            }
          }
        }
      },
      {
        supplier: {
          is: supplierWhere
        }
      }
    ]
  };

  const saleWhere = {
    OR: [
      {
        document: {
          startsWith: 'SMOKE-SALE-'
        }
      },
      {
        items: {
          some: {
            product: {
              is: productWhere
            }
          }
        }
      }
    ]
  };

  const stockMovementWhere = {
    OR: [
      {
        document: {
          startsWith: 'SMOKE-'
        }
      },
      {
        product: {
          is: productWhere
        }
      }
    ]
  };

  const accountPayableWhere = {
    OR: [
      {
        document: {
          startsWith: 'SMOKE-PURCHASE-'
        }
      },
      {
        purchase: {
          is: purchaseWhere
        }
      },
      {
        supplier: {
          is: supplierWhere
        }
      }
    ]
  };

  const deletedStockMovements = await prisma.stockMovement.deleteMany({
    where: stockMovementWhere
  });

  const deletedAccountsPayable = await prisma.accountPayable.deleteMany({
    where: accountPayableWhere
  });

  const deletedPurchaseItems = await prisma.purchaseItem.deleteMany({
    where: {
      OR: [
        {
          product: {
            is: productWhere
          }
        },
        {
          purchase: {
            is: purchaseWhere
          }
        }
      ]
    }
  });

  const deletedPurchases = await prisma.purchase.deleteMany({
    where: purchaseWhere
  });

  const deletedSaleItems = await prisma.saleItem.deleteMany({
    where: {
      OR: [
        {
          product: {
            is: productWhere
          }
        },
        {
          sale: {
            is: saleWhere
          }
        }
      ]
    }
  });

  const deletedSales = await prisma.sale.deleteMany({
    where: saleWhere
  });

  const deletedSuppliers = await prisma.supplier.deleteMany({
    where: supplierWhere
  });

  const deletedCustomers = await prisma.customer.deleteMany({
    where: customerWhere
  });

  const deletedProducts = await prisma.product.deleteMany({
    where: productWhere
  });

  const deletedCategories = await prisma.category.deleteMany({
    where: categoryWhere
  });

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        deletedStockMovements: deletedStockMovements.count,
        deletedAccountsPayable: deletedAccountsPayable.count,
        deletedPurchaseItems: deletedPurchaseItems.count,
        deletedPurchases: deletedPurchases.count,
        deletedSaleItems: deletedSaleItems.count,
        deletedSales: deletedSales.count,
        deletedSuppliers: deletedSuppliers.count,
        deletedCustomers: deletedCustomers.count,
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
