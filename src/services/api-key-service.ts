import crypto from "node:crypto";
import { ApiScope } from "@prisma/client";
import { prisma as prismaClient } from "@/lib/prisma";
import { logAudit } from "@/services/audit-service";

function hashApiKey(rawKey: string) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export function buildApiKey() {
  return `xbk_${crypto.randomBytes(24).toString("hex")}`;
}

export async function createCustomerApiKey(input: {
  customerId: string;
  name: string;
  remarks?: string;
  expiresAt?: Date | null;
  operatorId: string;
  scopes: ApiScope[];
  rateLimitPerMinute?: number;
}) {
  const rawKey = buildApiKey();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 12);

  const record = await prismaClient.customerApiKey.create({
    data: {
      customerId: input.customerId,
      name: input.name,
      remarks: input.remarks,
      expiresAt: input.expiresAt ?? null,
      keyHash,
      keyPrefix,
      createdByUserId: input.operatorId,
      rateLimitPerMinute: input.rateLimitPerMinute ?? 60,
      scopes: {
        create: input.scopes.map((scope) => ({ scope }))
      }
    },
    include: {
      scopes: true
    }
  });

  await logAudit({
    action: "api-key.create",
    entityType: "CustomerApiKey",
    entityId: record.id,
    detail: `${input.name} / prefix=${keyPrefix} / scopes=${input.scopes.join(",")}`,
    customerId: input.customerId,
    userId: input.operatorId
  });

  return { rawKey, keyPrefix, apiKeyId: record.id };
}

export async function updateCustomerApiKeyState(input: {
  apiKeyId: string;
  enabled?: boolean;
  revoke?: boolean;
  operatorId: string;
}) {
  const apiKey = await prismaClient.customerApiKey.findUnique({
    where: { id: input.apiKeyId }
  });
  if (!apiKey) {
    throw new Error("API Key 不存在");
  }
  if (apiKey.revokedAt && input.enabled) {
    throw new Error("已作废的 API Key 不能重新启用");
  }

  const updated = await prismaClient.customerApiKey.update({
    where: { id: input.apiKeyId },
    data: {
      enabled: input.revoke ? false : input.enabled ?? apiKey.enabled,
      revokedAt: input.revoke ? new Date() : apiKey.revokedAt,
      revokedByUserId: input.revoke ? input.operatorId : apiKey.revokedByUserId
    }
  });

  await logAudit({
    action: input.revoke ? "api-key.revoke" : "api-key.toggle",
    entityType: "CustomerApiKey",
    entityId: updated.id,
    detail: input.revoke ? "作废 API Key" : `enabled=${updated.enabled}`,
    customerId: updated.customerId,
    userId: input.operatorId
  });
}

export async function authenticateCustomerApiKey(rawKey: string, options?: { touchUsage?: boolean }) {
  if (!rawKey) {
    return null;
  }

  const keyHash = hashApiKey(rawKey);
  const apiKey = await prismaClient.customerApiKey.findUnique({
    where: { keyHash },
    include: {
      customer: true,
      scopes: true
    }
  });

  const now = new Date();
  if (!apiKey) {
    return null;
  }
  if (!apiKey.enabled || apiKey.revokedAt) {
    return null;
  }
  if (apiKey.expiresAt && apiKey.expiresAt <= now) {
    return null;
  }
  if (apiKey.customer.status !== "ACTIVE") {
    return null;
  }

  if (options?.touchUsage !== false) {
    await prismaClient.customerApiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: now }
    });
  }

  return apiKey;
}

export async function assertApiScope(apiKeyId: string, requiredScope: ApiScope) {
  const scope = await prismaClient.customerApiKeyScope.findFirst({
    where: {
      apiKeyId,
      scope: requiredScope
    }
  });
  return Boolean(scope);
}

export async function checkApiRateLimit(apiKeyId: string, windowStart: Date) {
  const apiKey = await prismaClient.customerApiKey.findUnique({
    where: { id: apiKeyId }
  });
  if (!apiKey) {
    throw new Error("API Key 不存在");
  }

  const count = await prismaClient.apiRequestLog.count({
    where: {
      apiKeyId,
      requestAt: {
        gte: windowStart
      }
    }
  });

  return {
    limit: apiKey.rateLimitPerMinute,
    currentCount: count,
    exceeded: count >= apiKey.rateLimitPerMinute
  };
}

export async function logApiRequest(input: {
  customerId: string;
  apiKeyId?: string | null;
  path: string;
  method: string;
  success: boolean;
  statusCode: number;
  requiredScope?: ApiScope | null;
  rateLimited?: boolean;
  forbidden?: boolean;
  errorMessage?: string | null;
}) {
  await prismaClient.apiRequestLog.create({
    data: {
      customerId: input.customerId,
      apiKeyId: input.apiKeyId ?? null,
      path: input.path,
      method: input.method,
      success: input.success,
      statusCode: input.statusCode,
      requiredScope: input.requiredScope ?? null,
      rateLimited: input.rateLimited ?? false,
      forbidden: input.forbidden ?? false,
      errorMessage: input.errorMessage ?? null
    }
  });
}

export const ALL_API_SCOPES = [
  ApiScope.FORECAST_CREATE,
  ApiScope.FORECAST_READ,
  ApiScope.BOX_READ,
  ApiScope.WALLET_READ,
  ApiScope.TRANSACTION_READ
];
