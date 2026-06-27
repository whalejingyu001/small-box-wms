import { ApiScope } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCustomerScope, withErpAuth } from "@/services/erp-auth-service";

export async function GET(request: Request, context: { params: Promise<{ forecastNo: string }> }) {
  return withErpAuth(request, ApiScope.FORECAST_READ, async (access) => {
    const params = await context.params;
    const forecast = await prisma.forecast.findUnique({
      where: { forecastNo: params.forecastNo },
      include: { boxes: { include: { trackingScans: true } } }
    });

    if (!forecast) {
      throw new Error("预报不存在");
    }

    const isAdminSession = access.kind === "session" && access.role === "ADMIN";
    ensureCustomerScope(isAdminSession || forecast.customerId === access.customerId, "无权访问该预报");

    return { body: forecast, customerId: forecast.customerId };
  });
}
