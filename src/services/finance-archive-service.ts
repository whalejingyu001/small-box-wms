import { FileAssetCategory, FinanceArchiveType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/services/audit-service";
import { saveGeneratedFile } from "@/services/file-service";
import {
  buildCustomerStatement,
  buildStatementCsv,
  buildStatementPdf
} from "@/services/statement-service";
import { buildFinanceReport, buildFinanceReportCsv } from "@/services/finance-report-service";

function buildArchiveNo() {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0")
  ].join("");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AR${stamp}${suffix}`;
}

export async function createFinanceArchive(input: {
  type: FinanceArchiveType;
  customerId?: string | null;
  dateFrom: string;
  dateTo: string;
  remarks?: string;
  groupBy?: "day" | "month";
  operatorId: string;
}) {
  let filename = "";
  let mimeType = "";
  let bytes = Buffer.alloc(0);

  if (
    input.type === FinanceArchiveType.CUSTOMER_STATEMENT_PDF ||
    input.type === FinanceArchiveType.CUSTOMER_STATEMENT_CSV
  ) {
    if (!input.customerId) {
      throw new Error("客户对账单归档必须选择客户");
    }

    const statement = await buildCustomerStatement({
      customerId: input.customerId,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo
    });

    if (input.type === FinanceArchiveType.CUSTOMER_STATEMENT_PDF) {
      const pdf = await buildStatementPdf(statement);
      filename = pdf.filename;
      mimeType = "application/pdf";
      bytes = pdf.bytes;
    } else {
      filename = `statement-${statement.customer.code}-${input.dateFrom}-${input.dateTo}.csv`;
      mimeType = "text/csv";
      bytes = Buffer.from(buildStatementCsv(statement), "utf-8");
    }
  } else {
    const report = await buildFinanceReport({
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      groupBy: input.groupBy || "day",
      customerId: input.customerId ?? null
    });
    filename = `finance-${input.groupBy || "day"}-${input.dateFrom}-${input.dateTo}.csv`;
    mimeType = "text/csv";
    bytes = Buffer.from(buildFinanceReportCsv(report), "utf-8");
  }

  const asset = await saveGeneratedFile({
    filename,
    mimeType,
    bytes,
    category: FileAssetCategory.FINANCE_ARCHIVE,
    uploadedByUserId: input.operatorId,
    customerId: input.customerId ?? null
  });

  const archive = await prisma.financeArchive.create({
    data: {
      archiveNo: buildArchiveNo(),
      type: input.type,
      customerId: input.customerId ?? null,
      dateFrom: new Date(`${input.dateFrom}T00:00:00`),
      dateTo: new Date(`${input.dateTo}T23:59:59`),
      storagePath: asset.storagePath,
      downloadPath: `/api/files/${asset.id}`,
      fileAssetId: asset.id,
      generatedByUserId: input.operatorId,
      remarks: input.remarks ?? null
    },
    include: {
      customer: true,
      generatedByUser: true,
      fileAsset: true
    }
  });

  await logAudit({
    action: "finance.archive.create",
    entityType: "FinanceArchive",
    entityId: archive.id,
    detail: `${archive.archiveNo} ${archive.type}`,
    customerId: archive.customerId,
    userId: input.operatorId
  });

  return archive;
}

export async function listFinanceArchives() {
  return prisma.financeArchive.findMany({
    include: {
      customer: true,
      generatedByUser: true,
      fileAsset: true
    },
    orderBy: { createdAt: "desc" }
  });
}
