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
          startsWith: 'SMOKE-PURCHASE'
        }
      },
      {
        notes: {
          contains: 'smoke',
          mode: 'insensitive'
        }
      },
      {
        supplier: {
          is: supplierWhere
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
        accountPayable: {
          is: {
            OR: [
              {
                document: {
                  startsWith: 'SMOKE-PURCHASE'
                }
              },
              {
                notes: {
                  contains: 'smoke',
                  mode: 'insensitive'
                }
              },
              {
                paymentNotes: {
                  contains: 'smoke',
                  mode: 'insensitive'
                }
              }
            ]
          }
        }
      }
    ]
  };

  const saleWhere = {
    OR: [
      {
        document: {
          startsWith: 'SMOKE-SALE'
        }
      },
      {
        notes: {
          contains: 'smoke',
          mode: 'insensitive'
        }
      },
      {
        customer: {
          is: customerWhere
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
        accountReceivable: {
          is: {
            OR: [
              {
                document: {
                  startsWith: 'SMOKE-SALE'
                }
              },
              {
                notes: {
                  contains: 'smoke',
                  mode: 'insensitive'
                }
              },
              {
                receiptNotes: {
                  contains: 'smoke',
                  mode: 'insensitive'
                }
              }
            ]
          }
        }
      }
    ]
  };

  const smokePurchases = await prisma.purchase.findMany({
    where: purchaseWhere,
    select: {
      id: true
    }
  });

  const smokeSales = await prisma.sale.findMany({
    where: saleWhere,
    select: {
      id: true
    }
  });

  const smokePurchaseIds = smokePurchases.map((purchase) => purchase.id);
  const smokeSaleIds = smokeSales.map((sale) => sale.id);

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
      },
      {
        purchaseId: {
          in: smokePurchaseIds
        }
      },
      {
        saleId: {
          in: smokeSaleIds
        }
      }
    ]
  };

  const accountsReceivableWhere = {
    OR: [
      {
        document: {
          startsWith: 'SMOKE-SALE'
        }
      },
      {
        notes: {
          contains: 'smoke',
          mode: 'insensitive'
        }
      },
      {
        receiptNotes: {
          contains: 'smoke',
          mode: 'insensitive'
        }
      },
      {
        saleId: {
          in: smokeSaleIds
        }
      },
      {
        customer: {
          is: customerWhere
        }
      }
    ]
  };

  const accountsPayableWhere = {
    OR: [
      {
        document: {
          startsWith: 'SMOKE-PURCHASE'
        }
      },
      {
        notes: {
          contains: 'smoke',
          mode: 'insensitive'
        }
      },
      {
        paymentNotes: {
          contains: 'smoke',
          mode: 'insensitive'
        }
      },
      {
        purchaseId: {
          in: smokePurchaseIds
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

  const deletedAccountsReceivable = await prisma.accountReceivable.deleteMany({
    where: accountsReceivableWhere
  });

  const deletedAccountsPayable = await prisma.accountPayable.deleteMany({
    where: accountsPayableWhere
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
          purchaseId: {
            in: smokePurchaseIds
          }
        }
      ]
    }
  });

  const deletedPurchases = await prisma.purchase.deleteMany({
    where: {
      id: {
        in: smokePurchaseIds
      }
    }
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
          saleId: {
            in: smokeSaleIds
          }
        }
      ]
    }
  });

  const deletedSales = await prisma.sale.deleteMany({
    where: {
      id: {
        in: smokeSaleIds
      }
    }
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
        deletedAccountsReceivable: deletedAccountsReceivable.count,
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
