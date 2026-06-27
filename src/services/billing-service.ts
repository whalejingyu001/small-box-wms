import { BillingMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getActiveBillingPlan(customerId: string) {
  return prisma.billingPlan.findFirst({
    where: {
      customerId,
      enabled: true,
      effectiveAt: { lte: new Date() }
    },
    orderBy: { effectiveAt: "desc" }
  });
}

export async function requireBillingPlan(customerId: string, mode?: BillingMode) {
  const plan = await getActiveBillingPlan(customerId);
  if (!plan) {
    throw new Error("该客户尚未配置生效中的计费方案");
  }
  if (mode && plan.mode !== mode) {
    throw new Error("当前客户计费模式与操作不匹配");
  }
  return plan;
}
