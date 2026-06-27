import { BillingMode, CustomerStatus, FileAssetCategory, Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/services/audit-service";
import { saveUploadedFile } from "@/services/file-service";

export async function createCustomerAccount(input: {
  companyName: string;
  contactName: string;
  code: string;
  username: string;
  password: string;
  remarks?: string;
  status?: CustomerStatus;
  operatorId: string;
}) {
  const passwordHash = await hashPassword(input.password);

  const customer = await prisma.customer.create({
    data: {
      companyName: input.companyName,
      contactName: input.contactName,
      code: input.code,
      remarks: input.remarks,
      status: input.status ?? CustomerStatus.ACTIVE,
      wallet: {
        create: {
          currency: "USD",
          balance: 0
        }
      },
      users: {
        create: {
          username: input.username,
          passwordHash,
          name: input.contactName,
          role: "CUSTOMER"
        }
      }
    }
  });

  await logAudit({
    action: "customer.create",
    entityType: "Customer",
    entityId: customer.id,
    detail: `创建客户 ${input.companyName}`,
    customerId: customer.id,
    userId: input.operatorId
  });

  return customer;
}

export async function createInternalUserAccount(input: {
  name: string;
  username: string;
  password: string;
  role: UserRole;
  operatorId: string;
}) {
  const name = input.name.trim();
  const username = input.username.trim();
  const password = input.password.trim();

  if (!name || !username || !password) {
    throw new Error("姓名、账号和密码不能为空");
  }

  if (password.length < 6) {
    throw new Error("密码至少需要 6 位");
  }

  if (input.role !== "ADMIN" && input.role !== "WAREHOUSE_OPERATOR") {
    throw new Error("只允许创建管理端或仓库端账号");
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      username,
      passwordHash,
      role: input.role
    }
  });

  await logAudit({
    action: "user.create",
    entityType: "User",
    entityId: user.id,
    detail: `创建内部账号 ${user.username} / ${input.role}`,
    userId: input.operatorId
  });

  return user;
}

export async function saveBillingPlan(input: {
  customerId: string;
  mode: BillingMode;
  unitPrice: number;
  currency: string;
  enabled: boolean;
  effectiveAt: Date;
  remarks?: string;
  operatorId: string;
}) {
  const plan = await prisma.billingPlan.create({
    data: {
      customerId: input.customerId,
      mode: input.mode,
      unitPrice: new Prisma.Decimal(input.unitPrice),
      currency: input.currency,
      enabled: input.enabled,
      effectiveAt: input.effectiveAt,
      remarks: input.remarks
    }
  });

  await logAudit({
    action: "billing-plan.create",
    entityType: "BillingPlan",
    entityId: plan.id,
    detail: `${input.mode} ${input.unitPrice} ${input.currency}`,
    customerId: input.customerId,
    userId: input.operatorId
  });
}

export async function createChannel(input: {
  name: string;
  code: string;
  sortOrder: number;
  enabled: boolean;
  operatorId: string;
}) {
  const { operatorId, ...channelInput } = input;
  const channel = await prisma.channel.create({
    data: channelInput
  });

  await logAudit({
    action: "channel.create",
    entityType: "Channel",
    entityId: channel.id,
    detail: `${input.code} / ${input.name}`,
    userId: operatorId
  });
}

export async function createExpense(input: {
  name: string;
  amount: number;
  currency: string;
  expenseDate: Date;
  remarks?: string;
  operatorId: string;
  file?: File | null;
}) {
  let attachmentId: string | undefined;
  if (input.file && input.file.size > 0) {
    const asset = await saveUploadedFile({
      file: input.file,
      category: FileAssetCategory.EXPENSE_VOUCHER,
      uploadedByUserId: input.operatorId
    });
    attachmentId = asset.id;
  }

  const expense = await prisma.expense.create({
    data: {
      name: input.name,
      amount: input.amount,
      currency: input.currency,
      expenseDate: input.expenseDate,
      remarks: input.remarks,
      attachmentId
    }
  });

  await logAudit({
    action: "expense.create",
    entityType: "Expense",
    entityId: expense.id,
    detail: `${input.name} ${input.amount} ${input.currency}`,
    userId: input.operatorId
  });
}

export async function updateCustomerStatus(input: {
  customerId: string;
  status: CustomerStatus;
  operatorId: string;
}) {
  const customer = await prisma.customer.update({
    where: { id: input.customerId },
    data: {
      status: input.status
    }
  });

  await logAudit({
    action: "customer.status.update",
    entityType: "Customer",
    entityId: customer.id,
    detail: `客户状态更新为 ${input.status}`,
    customerId: customer.id,
    userId: input.operatorId
  });

  return customer;
}
