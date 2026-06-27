import {
  BillingMode,
  BoxExceptionResolution,
  FileAssetCategory,
  BoxStatus,
  ForecastStatus,
  ScanAnomalyType,
  WalletTransactionType
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildBoxNo, buildForecastNo } from "@/lib/utils";
import { logAudit } from "@/services/audit-service";
import { requireBillingPlan } from "@/services/billing-service";
import { saveUploadedFile } from "@/services/file-service";
import { createChargeTransaction } from "@/services/wallet-service";

export type ForecastBoxInput = {
  boxSpec: string;
  expectedOrderCount: number;
  channelIds: string[];
};

function computeBoxScanOutcome(expectedCount: number, actualUniqueCount: number) {
  if (actualUniqueCount === expectedCount) {
    return {
      status: BoxStatus.VERIFIED,
      anomalyType: ScanAnomalyType.NORMAL,
      anomalyNote: null
    };
  }

  if (actualUniqueCount < expectedCount) {
    return {
      status: BoxStatus.EXCEPTION,
      anomalyType: ScanAnomalyType.SHORTAGE,
      anomalyNote: `实扫 ${actualUniqueCount}，少于预报 ${expectedCount}`
    };
  }

  return {
    status: BoxStatus.EXCEPTION,
    anomalyType: ScanAnomalyType.OVERAGE,
    anomalyNote: `实扫 ${actualUniqueCount}，大于预报 ${expectedCount}`
  };
}

export async function createForecast(
  customerId: string,
  boxes: ForecastBoxInput[],
  notes: string | undefined,
  userId?: string | null
) {
  if (boxes.length === 0) {
    throw new Error("至少需要创建一个箱子");
  }

  const invalidChannelBox = boxes.find((box) => box.channelIds.length === 0 || box.channelIds.length > 2);
  if (invalidChannelBox) {
    throw new Error("每个箱子必须选择 1-2 个渠道");
  }

  const invalidSpecBox = boxes.find((box) => !box.boxSpec || !box.boxSpec.trim());
  if (invalidSpecBox) {
    throw new Error("每个箱子都必须填写箱规");
  }

  const invalidCountBox = boxes.find(
    (box) => !Number.isInteger(box.expectedOrderCount) || box.expectedOrderCount <= 0
  );
  if (invalidCountBox) {
    throw new Error("每个箱子的预报件数都必须是大于 0 的整数");
  }

  const existingCount = await prisma.forecast.count();
  const forecastNo = buildForecastNo(existingCount + 1);

  const forecast = await prisma.forecast.create({
    data: {
      forecastNo,
      customerId,
      status: ForecastStatus.SUBMITTED,
      totalBoxes: boxes.length,
      notes,
      submittedAt: new Date(),
      boxes: {
        create: boxes.map((box, index) => ({
          boxNo: buildBoxNo(forecastNo, index + 1),
          boxIndex: index + 1,
          boxSpec: box.boxSpec,
          expectedOrderCount: box.expectedOrderCount,
          channels: {
            create: box.channelIds.map((channelId) => ({
              channelId
            }))
          }
        }))
      }
    },
    include: {
      boxes: {
        include: {
          channels: {
            include: {
              channel: true
            }
          }
        }
      }
    }
  });

  await logAudit({
    action: "forecast.create",
    entityType: "Forecast",
    entityId: forecast.id,
    detail: `创建预报 ${forecastNo}，箱数 ${boxes.length}`,
    customerId,
    userId: userId ?? null,
    forecastId: forecast.id
  });

  return forecast;
}

async function recalculateForecastStatus(forecastId: string) {
  const boxes = await prisma.forecastBox.findMany({
    where: { forecastId }
  });

  const allLabelScanned = boxes.every((box) => box.scannedAt);
  const hasException = boxes.some((box) => box.status === BoxStatus.EXCEPTION);
  const allCompleted = boxes.every(
    (box) => box.status === BoxStatus.VERIFIED || box.status === BoxStatus.LABEL_SCANNED
  );

  let nextStatus: ForecastStatus = ForecastStatus.SUBMITTED;
  if (allLabelScanned) {
    nextStatus = ForecastStatus.RECEIVING;
  }
  if (allCompleted && allLabelScanned) {
    nextStatus = ForecastStatus.RECEIVED;
  }
  if (hasException) {
    nextStatus = ForecastStatus.EXCEPTION;
  }

  await prisma.forecast.update({
    where: { id: forecastId },
    data: {
      status: nextStatus,
      receivedAt: nextStatus === ForecastStatus.RECEIVED ? new Date() : undefined
    }
  });
}

export async function scanBoxLabel(boxNo: string, operatorId: string) {
  const box = await prisma.forecastBox.findUnique({
    where: { boxNo },
    include: {
      forecast: {
        include: {
          customer: true
        }
      }
    }
  });

  if (!box) {
    throw new Error("箱号不存在");
  }

  if (!box.scannedAt) {
    await prisma.$transaction([
      prisma.forecastBox.update({
        where: { id: box.id },
        data: {
          status: BoxStatus.LABEL_SCANNED,
          scannedAt: new Date()
        }
      }),
      prisma.boxScanRecord.create({
        data: {
          forecastBoxId: box.id,
          operatorId
        }
      })
    ]);
  }

  const plan = await requireBillingPlan(box.forecast.customerId);
  if (plan.mode === BillingMode.PER_BOX) {
    const existingCharge = await prisma.walletTransaction.findFirst({
      where: {
        forecastBoxId: box.id,
        type: WalletTransactionType.BOX_CHARGE,
        status: "SUCCESS"
      }
    });

    if (!existingCharge) {
      await createChargeTransaction({
        customerId: box.forecast.customerId,
        amount: Number(plan.unitPrice),
        currency: plan.currency,
        type: WalletTransactionType.BOX_CHARGE,
        operatorId,
        remarks: `按箱扣费：${box.boxNo}`,
        forecastId: box.forecastId,
        forecastBoxId: box.id,
        businessType: BillingMode.PER_BOX
      });
    }
  } else {
    await prisma.forecastBox.update({
      where: { id: box.id },
      data: { status: BoxStatus.VERIFYING }
    });
  }

  await logAudit({
    action: "box.scan",
    entityType: "ForecastBox",
    entityId: box.id,
    detail: `扫描箱唛 ${boxNo}`,
    customerId: box.forecast.customerId,
    userId: operatorId,
    forecastId: box.forecastId
  });

  const refreshed = await getBoxScanContext(box.id);
  await recalculateForecastStatus(box.forecastId);
  return refreshed;
}

export async function scanTrackingNo(boxNo: string, trackingNo: string, operatorId: string) {
  const box = await prisma.forecastBox.findUnique({
    where: { boxNo },
    include: {
      forecast: true,
      trackingScans: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!box) {
    throw new Error("箱号不存在");
  }

  const plan = await requireBillingPlan(box.forecast.customerId, BillingMode.PER_ITEM);
  const existingValid = box.trackingScans.find((item) => item.trackingNo === trackingNo && !item.isDuplicate);

  if (existingValid) {
    const duplicateRecord = await prisma.trackingScanRecord.create({
      data: {
        forecastBoxId: box.id,
        trackingNo,
        operatorId,
        isDuplicate: true,
        duplicateOfId: existingValid.id
      }
    });

    await prisma.forecastBox.update({
      where: { id: box.id },
      data: {
        status: BoxStatus.EXCEPTION,
        anomalyType: ScanAnomalyType.DUPLICATE,
        anomalyNote: `重复件，不扣费：${trackingNo}`
      }
    });

    await logAudit({
      action: "tracking.duplicate",
      entityType: "TrackingScanRecord",
      entityId: duplicateRecord.id,
      detail: trackingNo,
      customerId: box.forecast.customerId,
      userId: operatorId,
      forecastId: box.forecastId
    });

    const refreshed = await getBoxScanContext(box.id);
    await recalculateForecastStatus(box.forecastId);
    return {
      duplicate: true,
      message: "重复件，不扣费",
      context: refreshed
    };
  }

  const charge = await createChargeTransaction({
    customerId: box.forecast.customerId,
    amount: Number(plan.unitPrice),
    currency: plan.currency,
    type: WalletTransactionType.ITEM_CHARGE,
    operatorId,
    remarks: `按件扣费：${trackingNo}`,
    forecastId: box.forecastId,
    forecastBoxId: box.id,
    trackingNo,
    businessType: BillingMode.PER_ITEM
  });

  const scan = await prisma.trackingScanRecord.create({
    data: {
      forecastBoxId: box.id,
      trackingNo,
      operatorId,
      walletTransactionId: charge.id
    }
  });

  const actualUniqueCount = box.trackingScans.filter((item) => !item.isDuplicate).length + 1;
  const outcome = computeBoxScanOutcome(box.expectedOrderCount, actualUniqueCount);

  await prisma.forecastBox.update({
    where: { id: box.id },
    data: {
      status: outcome.status,
      anomalyType: outcome.anomalyType,
      anomalyNote: outcome.anomalyNote,
      completedAt: outcome.status === BoxStatus.VERIFIED ? new Date() : null,
      exceptionResolution:
        outcome.status === BoxStatus.EXCEPTION ? BoxExceptionResolution.PENDING : BoxExceptionResolution.CONFIRMED_NORMAL,
      exceptionResolvedAt: outcome.status === BoxStatus.EXCEPTION ? null : new Date(),
      exceptionResolvedByUserId: outcome.status === BoxStatus.EXCEPTION ? null : operatorId,
      exceptionResolutionNote: outcome.status === BoxStatus.EXCEPTION ? null : "扫描数量与预报一致"
    }
  });

  await logAudit({
    action: "tracking.scan",
    entityType: "TrackingScanRecord",
    entityId: scan.id,
    detail: `${boxNo} -> ${trackingNo}`,
    customerId: box.forecast.customerId,
    userId: operatorId,
    forecastId: box.forecastId
  });

  await recalculateForecastStatus(box.forecastId);
  const refreshed = await getBoxScanContext(box.id);
  return {
    duplicate: false,
    message: outcome.status === BoxStatus.EXCEPTION ? outcome.anomalyNote ?? "异常" : "扫追踪号成功并扣费",
    context: refreshed
  };
}

export async function resolveBoxException(input: {
  forecastBoxId: string;
  resolution: BoxExceptionResolution;
  note?: string;
  operatorId: string;
  files?: File[];
}) {
  const box = await prisma.forecastBox.findUnique({
    where: { id: input.forecastBoxId },
    include: {
      forecast: true,
      trackingScans: true
    }
  });

  if (!box) {
    throw new Error("异常箱不存在");
  }

  const uniqueCount = box.trackingScans.filter((item) => !item.isDuplicate).length;
  const shouldReturnToVerified =
    input.resolution === BoxExceptionResolution.CONFIRMED_NORMAL &&
    uniqueCount === box.expectedOrderCount;

  const updatedBox = await prisma.forecastBox.update({
    where: { id: box.id },
    data: {
      status: shouldReturnToVerified ? BoxStatus.VERIFIED : box.status,
      anomalyType: shouldReturnToVerified ? ScanAnomalyType.NORMAL : box.anomalyType,
      anomalyNote: shouldReturnToVerified ? null : box.anomalyNote,
      exceptionResolution: input.resolution,
      exceptionResolvedAt: new Date(),
      exceptionResolvedByUserId: input.operatorId,
      exceptionResolutionNote: input.note ?? null,
      completedAt: shouldReturnToVerified ? new Date() : box.completedAt
    }
  });

  const record = await prisma.boxExceptionHandlingRecord.create({
    data: {
      forecastBoxId: box.id,
      resolution: input.resolution,
      note: input.note ?? null,
      handledByUserId: input.operatorId
    }
  });

  const attachmentNames: string[] = [];
  if (input.files?.length) {
    for (const file of input.files) {
      if (!file || file.size <= 0) {
        continue;
      }
      const asset = await saveUploadedFile({
        file,
        category: FileAssetCategory.BOX_EXCEPTION_EVIDENCE,
        uploadedByUserId: input.operatorId,
        customerId: box.forecast.customerId
      });
      await prisma.boxExceptionHandlingAttachment.create({
        data: {
          recordId: record.id,
          fileAssetId: asset.id
        }
      });
      attachmentNames.push(asset.originalFilename);
    }
  }

  await logAudit({
    action: "box.exception.resolve",
    entityType: "ForecastBox",
    entityId: box.id,
    detail: `${input.resolution}${input.note ? `：${input.note}` : ""}${attachmentNames.length ? ` / 附件：${attachmentNames.join(", ")}` : ""}`,
    customerId: box.forecast.customerId,
    userId: input.operatorId,
    forecastId: box.forecastId
  });

  await recalculateForecastStatus(box.forecastId);
  return updatedBox;
}

export async function listExceptionBoxes() {
  return prisma.forecastBox.findMany({
    where: {
      status: BoxStatus.EXCEPTION
    },
    include: {
      forecast: {
        include: {
          customer: true
        }
      },
      trackingScans: true,
      exceptionResolvedByUser: true,
      exceptionRecords: {
        include: {
          handledByUser: true,
          attachments: {
            include: {
              fileAsset: true
            }
          }
        },
        orderBy: { handledAt: "desc" }
      }
    },
    orderBy: [{ scannedAt: "desc" }, { boxNo: "asc" }]
  });
}

export async function getBoxScanContext(boxId: string) {
  const box = await prisma.forecastBox.findUnique({
    where: { id: boxId },
    include: {
      forecast: {
        include: {
          customer: true
        }
      },
      walletTransactions: true,
      trackingScans: {
        orderBy: { createdAt: "desc" },
        take: 50
      }
    }
  });

  if (!box) {
    throw new Error("箱子不存在");
  }

  const plan = await requireBillingPlan(box.forecast.customerId);
  const validCount = box.trackingScans.filter((item) => !item.isDuplicate).length;
  const duplicateCount = box.trackingScans.filter((item) => item.isDuplicate).length;
  const chargeAmount = box.walletTransactions.reduce((sum, item) => {
    if (item.type === WalletTransactionType.BOX_CHARGE || item.type === WalletTransactionType.ITEM_CHARGE) {
      return sum + Math.abs(Number(item.amount));
    }
    if (item.type === WalletTransactionType.REVERSAL) {
      return sum - Number(item.amount);
    }
    return sum;
  }, 0);

  return {
    boxId: box.id,
    boxNo: box.boxNo,
    customerName: box.forecast.customer.companyName,
    customerId: box.forecast.customerId,
    forecastNo: box.forecast.forecastNo,
    billingMode: plan.mode,
    expectedOrderCount: box.expectedOrderCount,
    validCount,
    duplicateCount,
    chargeAmount,
    anomalyType: box.anomalyType,
    anomalyNote: box.anomalyNote,
    status: box.status,
    exceptionResolution: box.exceptionResolution,
    exceptionResolutionNote: box.exceptionResolutionNote,
    recentTrackingScans: box.trackingScans.slice(0, 20).map((item) => ({
      id: item.id,
      trackingNo: item.trackingNo,
      isDuplicate: item.isDuplicate,
      scannedAt: item.scannedAt
    }))
  };
}

export async function getBoxScanContextByBoxNo(boxNo: string) {
  const box = await prisma.forecastBox.findUnique({
    where: { boxNo },
    select: { id: true }
  });

  if (!box) {
    return null;
  }

  return getBoxScanContext(box.id);
}

export async function finalizeBoxScan(boxId: string) {
  const box = await prisma.forecastBox.findUnique({
    where: { id: boxId },
    include: { trackingScans: true }
  });
  if (!box) {
    throw new Error("箱子不存在");
  }

  const validCount = box.trackingScans.filter((item) => !item.isDuplicate).length;
  const outcome = computeBoxScanOutcome(box.expectedOrderCount, validCount);

  await prisma.forecastBox.update({
    where: { id: box.id },
    data: {
      status: outcome.status,
      anomalyType: outcome.anomalyType,
      anomalyNote: outcome.anomalyNote,
      completedAt: outcome.status === BoxStatus.VERIFIED ? new Date() : null
    }
  });

  await recalculateForecastStatus(box.forecastId);
  return getBoxScanContext(box.id);
}
