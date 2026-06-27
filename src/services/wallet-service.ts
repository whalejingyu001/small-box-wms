import {
  BillingMode,
  Prisma,
  RechargeStatus,
  WalletTransactionStatus,
  WalletTransactionType
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/services/audit-service";

type ChargeInput = {
  customerId: string;
  amount: number;
  currency: string;
  type: WalletTransactionType;
  operatorId: string;
  remarks: string;
  forecastId?: string;
  forecastBoxId?: string;
  trackingNo?: string;
  businessType?: BillingMode;
};

async function ensureWallet(customerId: string, currency = "USD") {
  return prisma.wallet.upsert({
    where: { customerId },
    create: {
      customerId,
      currency,
      balance: 0
    },
    update: {}
  });
}

export async function createChargeTransaction(input: ChargeInput) {
  const wallet = await ensureWallet(input.customerId, input.currency);
  const balanceBefore = Number(wallet.balance);
  if (balanceBefore < input.amount) {
    throw new Error("余额不足");
  }
  const balanceAfter = balanceBefore - input.amount;

  const transaction = await prisma.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: input.type,
      status: WalletTransactionStatus.SUCCESS,
      amount: new Prisma.Decimal(-input.amount),
      currency: input.currency,
      balanceBefore,
      balanceAfter,
      businessType: input.businessType,
      forecastId: input.forecastId,
      forecastBoxId: input.forecastBoxId,
      trackingNo: input.trackingNo,
      remarks: input.remarks,
      operatorId: input.operatorId
    }
  });

  await prisma.wallet.update({
    where: { id: wallet.id },
    data: { balance: balanceAfter }
  });

  await logAudit({
    action: "wallet.charge",
    entityType: "WalletTransaction",
    entityId: transaction.id,
    detail: input.remarks,
    customerId: input.customerId,
    userId: input.operatorId,
    forecastId: input.forecastId
  });

  return transaction;
}

export async function reverseWalletTransaction(input: {
  transactionId: string;
  operatorId: string;
  reason: string;
}) {
  const original = await prisma.walletTransaction.findUnique({
    where: { id: input.transactionId },
    include: {
      wallet: true
    }
  });

  if (!original) {
    throw new Error("原扣款流水不存在");
  }
  if (original.type === WalletTransactionType.REVERSAL) {
    throw new Error("冲正流水不能再次冲正");
  }
  if (original.reversedFromTransactionId) {
    throw new Error("当前流水本身已是冲正结果");
  }

  const existingReversal = await prisma.walletTransaction.findFirst({
    where: { reversedFromTransactionId: original.id }
  });
  if (existingReversal) {
    throw new Error("该流水已经做过冲正");
  }

  const balanceBefore = Number(original.wallet.balance);
  const reversalAmount = Math.abs(Number(original.amount));
  const balanceAfter = balanceBefore + reversalAmount;

  const reversal = await prisma.walletTransaction.create({
    data: {
      walletId: original.walletId,
      type: WalletTransactionType.REVERSAL,
      status: WalletTransactionStatus.SUCCESS,
      amount: reversalAmount,
      currency: original.currency,
      balanceBefore,
      balanceAfter,
      businessType: original.businessType,
      forecastId: original.forecastId,
      forecastBoxId: original.forecastBoxId,
      trackingNo: original.trackingNo,
      reversedFromTransactionId: original.id,
      remarks: `冲正：${input.reason}`,
      operatorId: input.operatorId
    }
  });

  await prisma.$transaction([
    prisma.wallet.update({
      where: { id: original.walletId },
      data: { balance: balanceAfter }
    }),
    prisma.walletTransaction.update({
      where: { id: original.id },
      data: { status: WalletTransactionStatus.REVERSED }
    })
  ]);

  await logAudit({
    action: "wallet.reverse",
    entityType: "WalletTransaction",
    entityId: reversal.id,
    detail: `冲正原流水 ${original.id}，原因：${input.reason}`,
    userId: input.operatorId,
    forecastId: original.forecastId
  });

  return reversal;
}

export async function approveRechargeRequest(rechargeRequestId: string, reviewerId: string) {
  const recharge = await prisma.rechargeRequest.findUnique({
    where: { id: rechargeRequestId },
    include: { customer: true }
  });

  if (!recharge || recharge.status !== RechargeStatus.PENDING) {
    throw new Error("充值申请不存在或状态不可审核");
  }

  const wallet = await ensureWallet(recharge.customerId, recharge.currency);
  const balanceBefore = Number(wallet.balance);
  const amount = Number(recharge.amount);
  const balanceAfter = balanceBefore + amount;

  const transaction = await prisma.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: WalletTransactionType.RECHARGE,
      status: WalletTransactionStatus.SUCCESS,
      amount,
      currency: recharge.currency,
      balanceBefore,
      balanceAfter,
      remarks: `充值审核通过：${recharge.paymentChannel}`,
      operatorId: reviewerId
    }
  });

  await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter }
    }),
    prisma.rechargeRequest.update({
      where: { id: rechargeRequestId },
      data: {
        status: RechargeStatus.APPROVED,
        reviewedAt: new Date(),
        reviewerId,
        walletTransactionId: transaction.id
      }
    })
  ]);

  await logAudit({
    action: "recharge.approve",
    entityType: "RechargeRequest",
    entityId: rechargeRequestId,
    detail: `审核通过，金额 ${amount} ${recharge.currency}`,
    customerId: recharge.customerId,
    userId: reviewerId
  });
}

export async function rejectRechargeRequest(rechargeRequestId: string, reviewerId: string, reason: string) {
  const recharge = await prisma.rechargeRequest.findUnique({
    where: { id: rechargeRequestId }
  });

  if (!recharge || recharge.status !== RechargeStatus.PENDING) {
    throw new Error("充值申请不存在或状态不可审核");
  }

  await prisma.rechargeRequest.update({
    where: { id: rechargeRequestId },
    data: {
      status: RechargeStatus.REJECTED,
      reviewedAt: new Date(),
      reviewerId,
      rejectReason: reason
    }
  });

  await logAudit({
    action: "recharge.reject",
    entityType: "RechargeRequest",
    entityId: rechargeRequestId,
    detail: reason,
    customerId: recharge.customerId,
    userId: reviewerId
  });
}
