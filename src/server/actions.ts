"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ApiScope,
  BillingMode,
  BoxExceptionResolution,
  CustomerStatus,
  FinanceArchiveType,
  UserRole
} from "@prisma/client";
import { authenticateUser, clearSession, requireRole, setSession } from "@/lib/auth";
import {
  createCustomerAccount,
  createInternalUserAccount,
  createExpense,
  createChannel,
  saveBillingPlan,
  updateCustomerStatus
} from "@/services/admin-service";
import { createCustomerApiKey, updateCustomerApiKeyState } from "@/services/api-key-service";
import { createFinanceArchive } from "@/services/finance-archive-service";
import { createForecast, resolveBoxException, scanBoxLabel, scanTrackingNo } from "@/services/forecast-service";
import { createRechargeRequestWithAttachment } from "@/services/recharge-service";
import { approveRechargeRequest, rejectRechargeRequest, reverseWalletTransaction } from "@/services/wallet-service";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");
  const session = await authenticateUser(username, password);

  if (!session) {
    redirect("/login?error=1");
  }

  await setSession(session);
  redirect("/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export async function createForecastAction(formData: FormData) {
  const session = await requireRole([UserRole.CUSTOMER]);
  const boxesPayload = String(formData.get("boxesPayload") || "[]");
  const notes = String(formData.get("notes") || "");
  let boxes: unknown;

  try {
    boxes = JSON.parse(boxesPayload);
  } catch {
    throw new Error("预报数据格式不正确");
  }

  if (!Array.isArray(boxes)) {
    throw new Error("预报数据格式不正确");
  }

  await createForecast(session.customerId!, boxes, notes, session.userId);
  revalidatePath("/customer");
  revalidatePath("/customer/forecasts");
}

export async function createRechargeRequestAction(formData: FormData) {
  const session = await requireRole([UserRole.CUSTOMER]);
  await createRechargeRequestWithAttachment({
    customerId: session.customerId!,
    paymentChannel: String(formData.get("paymentChannel") || ""),
    amount: Number(formData.get("amount") || 0),
    currency: String(formData.get("currency") || "USD"),
    remarks: String(formData.get("remarks") || ""),
    file: formData.get("attachment") as File | null,
    userId: session.userId
  });
  revalidatePath("/customer");
  revalidatePath("/customer/recharge");
}

export async function scanBoxAction(formData: FormData) {
  const session = await requireRole([UserRole.WAREHOUSE_OPERATOR, UserRole.ADMIN]);
  await scanBoxLabel(String(formData.get("boxNo") || ""), session.userId);
  revalidatePath("/warehouse");
  revalidatePath("/admin");
}

export async function scanTrackingAction(formData: FormData) {
  const session = await requireRole([UserRole.WAREHOUSE_OPERATOR, UserRole.ADMIN]);
  const result = await scanTrackingNo(
    String(formData.get("boxNo") || ""),
    String(formData.get("trackingNo") || ""),
    session.userId
  );
  revalidatePath("/warehouse");
  revalidatePath("/admin");
  redirect(`/warehouse?message=${encodeURIComponent(result.message)}`);
}

export async function createCustomerAction(formData: FormData) {
  const session = await requireRole([UserRole.ADMIN]);
  await createCustomerAccount({
    companyName: String(formData.get("companyName") || ""),
    contactName: String(formData.get("contactName") || ""),
    code: String(formData.get("code") || ""),
    username: String(formData.get("username") || ""),
    password: String(formData.get("password") || ""),
    remarks: String(formData.get("remarks") || ""),
    status: (formData.get("status") as CustomerStatus) || CustomerStatus.ACTIVE,
    operatorId: session.userId
  });
  revalidatePath("/admin");
  revalidatePath("/admin/customers");
}

export async function updateCustomerStatusAction(formData: FormData) {
  const session = await requireRole([UserRole.ADMIN]);
  const customerId = String(formData.get("customerId") || "");
  await updateCustomerStatus({
    customerId,
    status: String(formData.get("status") || CustomerStatus.ACTIVE) as CustomerStatus,
    operatorId: session.userId
  });
  revalidatePath("/admin");
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function createInternalUserAction(formData: FormData) {
  const session = await requireRole([UserRole.ADMIN]);
  await createInternalUserAccount({
    name: String(formData.get("name") || ""),
    username: String(formData.get("username") || ""),
    password: String(formData.get("password") || ""),
    role: String(formData.get("role") || "WAREHOUSE_OPERATOR") as "ADMIN" | "WAREHOUSE_OPERATOR",
    operatorId: session.userId
  });
  revalidatePath("/admin");
  revalidatePath("/admin/accounts");
}

export async function createBillingPlanAction(formData: FormData) {
  const session = await requireRole([UserRole.ADMIN]);
  await saveBillingPlan({
    customerId: String(formData.get("customerId") || ""),
    mode: String(formData.get("mode") || "PER_BOX") as BillingMode,
    unitPrice: Number(formData.get("unitPrice") || 0),
    currency: String(formData.get("currency") || "USD"),
    enabled: formData.get("enabled") === "on",
    effectiveAt: new Date(String(formData.get("effectiveAt") || new Date().toISOString())),
    remarks: String(formData.get("remarks") || ""),
    operatorId: session.userId
  });
  revalidatePath("/admin");
  revalidatePath("/admin/finance");
}

export async function createChannelAction(formData: FormData) {
  const session = await requireRole([UserRole.ADMIN]);
  await createChannel({
    name: String(formData.get("name") || ""),
    code: String(formData.get("code") || ""),
    sortOrder: Number(formData.get("sortOrder") || 0),
    enabled: formData.get("enabled") === "on",
    operatorId: session.userId
  });
  revalidatePath("/admin");
}

export async function approveRechargeAction(formData: FormData) {
  const session = await requireRole([UserRole.ADMIN]);
  await approveRechargeRequest(String(formData.get("rechargeRequestId") || ""), session.userId);
  revalidatePath("/admin");
  revalidatePath("/admin/recharges");
  revalidatePath("/admin/transactions");
  revalidatePath("/customer");
  revalidatePath("/customer/recharge");
  revalidatePath("/customer/statements");
}

export async function rejectRechargeAction(formData: FormData) {
  const session = await requireRole([UserRole.ADMIN]);
  await rejectRechargeRequest(
    String(formData.get("rechargeRequestId") || ""),
    session.userId,
    String(formData.get("reason") || "资料不完整")
  );
  revalidatePath("/admin");
  revalidatePath("/admin/recharges");
  revalidatePath("/customer");
  revalidatePath("/customer/recharge");
}

export async function createExpenseAction(formData: FormData) {
  const session = await requireRole([UserRole.ADMIN]);
  await createExpense({
    name: String(formData.get("name") || ""),
    amount: Number(formData.get("amount") || 0),
    currency: String(formData.get("currency") || "USD"),
    expenseDate: new Date(String(formData.get("expenseDate") || new Date().toISOString())),
    remarks: String(formData.get("remarks") || ""),
    operatorId: session.userId,
    file: formData.get("attachment") as File | null
  });
  revalidatePath("/admin");
  revalidatePath("/admin/reports");
}

export async function createCustomerApiKeyAction(formData: FormData) {
  const session = await requireRole([UserRole.ADMIN]);
  const customerId = String(formData.get("customerId") || "");
  const customerDetailUrl = `/admin/customers/${customerId}`;
  const result = await createCustomerApiKey({
    customerId,
    name: String(formData.get("name") || ""),
    remarks: String(formData.get("remarks") || ""),
    expiresAt: formData.get("expiresAt")
      ? new Date(String(formData.get("expiresAt")))
      : null,
    operatorId: session.userId,
    scopes: formData
      .getAll("scopes")
      .map((scope) => String(scope) as ApiScope),
    rateLimitPerMinute: Number(formData.get("rateLimitPerMinute") || 60)
  });
  revalidatePath("/admin");
  revalidatePath(customerDetailUrl);
  redirect(
    `${customerDetailUrl}?apiKey=${encodeURIComponent(result.rawKey)}&prefix=${encodeURIComponent(result.keyPrefix)}` as never
  );
}

export async function toggleCustomerApiKeyAction(formData: FormData) {
  const session = await requireRole([UserRole.ADMIN]);
  const customerId = String(formData.get("customerId") || "");
  await updateCustomerApiKeyState({
    apiKeyId: String(formData.get("apiKeyId") || ""),
    enabled: formData.get("enabled") === "true",
    operatorId: session.userId
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function revokeCustomerApiKeyAction(formData: FormData) {
  const session = await requireRole([UserRole.ADMIN]);
  const customerId = String(formData.get("customerId") || "");
  await updateCustomerApiKeyState({
    apiKeyId: String(formData.get("apiKeyId") || ""),
    revoke: true,
    operatorId: session.userId
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function resolveBoxExceptionAction(formData: FormData) {
  const session = await requireRole([UserRole.ADMIN, UserRole.WAREHOUSE_OPERATOR]);
  await resolveBoxException({
    forecastBoxId: String(formData.get("forecastBoxId") || ""),
    resolution: String(formData.get("resolution") || "PENDING") as BoxExceptionResolution,
    note: String(formData.get("note") || ""),
    operatorId: session.userId,
    files: formData
      .getAll("attachments")
      .filter((file): file is File => file instanceof File && file.size > 0)
  });
  revalidatePath("/admin");
  revalidatePath("/warehouse");
}

export async function reverseWalletTransactionAction(formData: FormData) {
  const session = await requireRole([UserRole.ADMIN]);
  await reverseWalletTransaction({
    transactionId: String(formData.get("transactionId") || ""),
    operatorId: session.userId,
    reason: String(formData.get("reason") || "人工冲正")
  });
  revalidatePath("/admin");
  revalidatePath("/admin/transactions");
  revalidatePath("/admin/statements");
  revalidatePath("/admin/reports");
  revalidatePath("/customer/statements");
}

export async function createFinanceArchiveAction(formData: FormData) {
  const session = await requireRole([UserRole.ADMIN]);
  await createFinanceArchive({
    type: String(formData.get("type") || FinanceArchiveType.CUSTOMER_STATEMENT_PDF) as FinanceArchiveType,
    customerId: String(formData.get("customerId") || "") || null,
    dateFrom: String(formData.get("dateFrom") || ""),
    dateTo: String(formData.get("dateTo") || ""),
    remarks: String(formData.get("remarks") || ""),
    groupBy: (String(formData.get("groupBy") || "day") as "day" | "month"),
    operatorId: session.userId
  });
  revalidatePath("/admin/archives");
}
