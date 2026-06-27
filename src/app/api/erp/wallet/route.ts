import { ApiScope } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withErpAuth } from "@/services/erp-auth-service";

export async function GET(request: Request) {
  return withErpAuth(request, ApiScope.WALLET_READ, async (access) => {
    const wallet = await prisma.wallet.findUnique({
      where: { customerId: access.customerId }
    });
    return { body: wallet, customerId: access.customerId };
  });
}
