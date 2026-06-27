import { ApiScope } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCustomerScope, withErpAuth } from "@/services/erp-auth-service";

export async function GET(request: Request, context: { params: Promise<{ boxNo: string }> }) {
  return withErpAuth(request, ApiScope.BOX_READ, async (access) => {
    const params = await context.params;
    const box = await prisma.forecastBox.findUnique({
      where: { boxNo: params.boxNo },
      include: {
        forecast: true,
        channels: { include: { channel: true } },
        trackingScans: true
      }
    });

    if (!box) {
      throw new Error("箱子不存在");
    }

    const isAdminSession = access.kind === "session" && access.role === "ADMIN";
    ensureCustomerScope(isAdminSession || box.forecast.customerId === access.customerId, "无权访问该箱子");

    return { body: box, customerId: box.forecast.customerId };
  });
}
