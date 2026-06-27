import { FileAssetCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/services/audit-service";
import { saveUploadedFile } from "@/services/file-service";

export async function createRechargeRequestWithAttachment(input: {
  customerId: string;
  paymentChannel: string;
  amount: number;
  currency: string;
  remarks?: string;
  file?: File | null;
  userId: string;
}) {
  let attachmentId: string | undefined;

  if (input.file && input.file.size > 0) {
    const asset = await saveUploadedFile({
      file: input.file,
      category: FileAssetCategory.RECHARGE_PROOF,
      uploadedByUserId: input.userId,
      customerId: input.customerId
    });
    attachmentId = asset.id;
  }

  const recharge = await prisma.rechargeRequest.create({
    data: {
      customerId: input.customerId,
      paymentChannel: input.paymentChannel,
      amount: input.amount,
      currency: input.currency,
      remarks: input.remarks,
      attachmentId
    }
  });

  await logAudit({
    action: "recharge.submit",
    entityType: "RechargeRequest",
    entityId: recharge.id,
    detail: `${input.paymentChannel} ${input.amount} ${input.currency}`,
    customerId: input.customerId,
    userId: input.userId
  });

  return recharge;
}
