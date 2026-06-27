import { ApiScope } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withErpAuth } from "@/services/erp-auth-service";

export async function GET(request: Request) {
  return withErpAuth(request, ApiScope.TRANSACTION_READ, async (access) => {
    const transactions = await prisma.walletTransaction.findMany({
      where: { wallet: { customerId: access.customerId } },
      orderBy: { createdAt: "desc" }
    });
    return { body: transactions, customerId: access.customerId };
  });
}
