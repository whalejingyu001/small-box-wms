const { PrismaClient, UserRole, CustomerStatus, BillingMode } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("Admin123!", 10);
  const warehousePassword = await bcrypt.hash("Warehouse123!", 10);
  const customerPassword = await bcrypt.hash("Demo123!", 10);

  for (const channel of [
    { name: "United States Postal Service", code: "USPS", sortOrder: 1, enabled: true },
    { name: "Federal Express", code: "FEDEX", sortOrder: 2, enabled: true },
    { name: "CBS", code: "CBS", sortOrder: 3, enabled: true },
    { name: "United Parcel Service", code: "UPS", sortOrder: 4, enabled: true }
  ]) {
    await prisma.channel.upsert({
      where: { code: channel.code },
      update: channel,
      create: channel
    });
  }

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminPassword,
      name: "系统管理员",
      role: UserRole.ADMIN
    }
  });

  await prisma.user.upsert({
    where: { username: "warehouse" },
    update: {},
    create: {
      username: "warehouse",
      passwordHash: warehousePassword,
      name: "仓库操作员",
      role: UserRole.WAREHOUSE_OPERATOR
    }
  });

  const customer = await prisma.customer.upsert({
    where: { code: "DEMO" },
    update: {},
    create: {
      companyName: "演示客户",
      contactName: "张三",
      code: "DEMO",
      status: CustomerStatus.ACTIVE,
      remarks: "系统默认演示客户",
      wallet: {
        create: {
          balance: 1000,
          currency: "USD"
        }
      },
      users: {
        create: {
          username: "demo_customer",
          passwordHash: customerPassword,
          name: "演示客户账号",
          role: UserRole.CUSTOMER
        }
      }
    }
  });

  const existingPlan = await prisma.billingPlan.findFirst({
    where: { customerId: customer.id }
  });
  if (!existingPlan) {
    await prisma.billingPlan.create({
      data: {
        customerId: customer.id,
        mode: BillingMode.PER_ITEM,
        unitPrice: 0.5,
        currency: "USD",
        enabled: true,
        effectiveAt: new Date(),
        remarks: "默认演示方案"
      }
    });
  }

  await prisma.auditLog.create({
    data: {
      action: "seed.init",
      entityType: "System",
      entityId: "seed",
      detail: "初始化默认数据",
      userId: admin.id
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
