import { prisma } from "@/lib/prisma";

type AuditInput = {
  action: string;
  entityType: string;
  entityId: string;
  detail: string;
  customerId?: string | null;
  userId?: string | null;
  forecastId?: string | null;
};

export async function logAudit(input: AuditInput) {
  await prisma.auditLog.create({
    data: input
  });
}
