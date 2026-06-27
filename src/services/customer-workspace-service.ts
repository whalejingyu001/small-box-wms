import { prisma } from "@/lib/prisma";

export async function getCustomerWorkspaceData(customerId: string) {
  const [customer, channels, forecasts, wallet, recharges, transactions] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId }
    }),
    prisma.channel.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }]
    }),
    prisma.forecast.findMany({
      where: { customerId },
      include: {
        boxes: {
          include: {
            channels: {
              include: { channel: true }
            },
            trackingScans: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.wallet.findUnique({
      where: { customerId }
    }),
    prisma.rechargeRequest.findMany({
      where: { customerId },
      include: { attachment: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.walletTransaction.findMany({
      where: { wallet: { customerId } },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  if (!customer) {
    throw new Error("客户不存在");
  }

  return {
    customer,
    channels,
    forecasts,
    wallet,
    recharges,
    transactions
  };
}
