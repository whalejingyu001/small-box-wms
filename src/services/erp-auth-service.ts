import { ApiScope, UserRole } from "@prisma/client";
import { getSession } from "@/lib/auth";
import {
  assertApiScope,
  authenticateCustomerApiKey,
  checkApiRateLimit,
  logApiRequest
} from "@/services/api-key-service";

class AuthError extends Error {}
class BusinessError extends Error {}
class ForbiddenError extends Error {}
class RateLimitError extends Error {}

export type ErpAccessContext =
  | {
      kind: "apiKey";
      customerId: string;
      apiKeyId: string;
    }
  | {
      kind: "session";
      customerId: string;
      userId: string;
      role: UserRole;
    };

export async function resolveErpAccess(request: Request) {
  const rawApiKey = request.headers.get("X-API-Key");
  if (rawApiKey) {
    const apiKey = await authenticateCustomerApiKey(rawApiKey);
    if (!apiKey) {
      throw new AuthError("API Key 无效");
    }
    return {
      kind: "apiKey" as const,
      customerId: apiKey.customerId,
      apiKeyId: apiKey.id
    };
  }

  const session = await getSession();
  if (!session) {
    throw new AuthError("未登录且未提供 API Key");
  }
  if (session.role !== UserRole.ADMIN && !session.customerId) {
    throw new AuthError("当前会话无客户访问权限");
  }

  return {
    kind: "session" as const,
    customerId: session.customerId ?? "",
    userId: session.userId,
    role: session.role
  };
}

export async function withErpAuth<T>(
  request: Request,
  requiredScope: ApiScope | null,
  handler: (access: ErpAccessContext) => Promise<{ body: T; status?: number; customerId?: string }>
) {
  const pathname = new URL(request.url).pathname;
  const method = request.method;
  let apiKeyForError: { customerId: string; id: string } | null = null;

  try {
    const access = await resolveErpAccess(request);

    if (access.kind === "apiKey") {
      apiKeyForError = { customerId: access.customerId, id: access.apiKeyId };

      if (requiredScope) {
        const hasScope = await assertApiScope(access.apiKeyId, requiredScope);
        if (!hasScope) {
          throw new ForbiddenError("API Key 无对应权限范围");
        }
      }

      const windowStart = new Date(Date.now() - 60 * 1000);
      const rate = await checkApiRateLimit(access.apiKeyId, windowStart);
      if (rate.exceeded) {
        throw new RateLimitError(`已超过限流 ${rate.limit} 次/分钟`);
      }
    }

    const result = await handler(access);
    const customerId = result.customerId || access.customerId;

    if (access.kind === "apiKey") {
      await logApiRequest({
        customerId,
        apiKeyId: access.apiKeyId,
        path: pathname,
        method,
        success: true,
        statusCode: result.status ?? 200,
        requiredScope
      });
    }

    return Response.json(result.body, { status: result.status ?? 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    const statusCode =
      error instanceof AuthError
        ? 401
        : error instanceof ForbiddenError
          ? 403
          : error instanceof RateLimitError
            ? 429
            : error instanceof BusinessError
              ? 400
              : 500;

    if (apiKeyForError) {
      await logApiRequest({
        customerId: apiKeyForError.customerId,
        apiKeyId: apiKeyForError.id,
        path: pathname,
        method,
        success: false,
        statusCode,
        requiredScope,
        rateLimited: error instanceof RateLimitError,
        forbidden: error instanceof ForbiddenError,
        errorMessage: message
      });
    }

    return Response.json({ error: message }, { status: statusCode });
  }
}

export function ensureCustomerScope(condition: boolean, message: string) {
  if (!condition) {
    throw new BusinessError(message);
  }
}
