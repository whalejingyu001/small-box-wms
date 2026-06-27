import { PDFDocument, PDFPage, rgb } from "pdf-lib";
import { WalletTransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loadPdfFonts } from "@/services/pdf-font-service";

function startOfDay(value: string) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: string) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export async function buildCustomerStatement(input: {
  customerId: string;
  dateFrom: string;
  dateTo: string;
}) {
  const from = startOfDay(input.dateFrom);
  const to = endOfDay(input.dateTo);

  const wallet = await prisma.wallet.findUnique({
    where: { customerId: input.customerId },
    include: {
      customer: true
    }
  });

  if (!wallet) {
    throw new Error("钱包不存在");
  }

  const [beforeTransactions, transactions] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: {
        walletId: wallet.id,
        createdAt: { lt: from }
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.walletTransaction.findMany({
      where: {
        walletId: wallet.id,
        createdAt: {
          gte: from,
          lte: to
        }
      },
      include: {
        forecast: true,
        forecastBox: true
      },
      orderBy: { createdAt: "asc" }
    })
  ]);

  const openingBalance = beforeTransactions.length
    ? Number(beforeTransactions[beforeTransactions.length - 1].balanceAfter)
    : 0;

  const totals = {
    openingBalance,
    rechargeAmount: 0,
    boxChargeAmount: 0,
    itemChargeAmount: 0,
    reversalAmount: 0,
    closingBalance: transactions.length
      ? Number(transactions[transactions.length - 1].balanceAfter)
      : openingBalance
  };

  for (const item of transactions) {
    const amount = Number(item.amount);
    if (item.type === WalletTransactionType.RECHARGE) {
      totals.rechargeAmount += amount;
    }
    if (item.type === WalletTransactionType.BOX_CHARGE) {
      totals.boxChargeAmount += Math.abs(amount);
    }
    if (item.type === WalletTransactionType.ITEM_CHARGE) {
      totals.itemChargeAmount += Math.abs(amount);
    }
    if (item.type === WalletTransactionType.REVERSAL) {
      totals.reversalAmount += amount;
    }
  }

  return {
    customer: wallet.customer,
    wallet,
    range: { from, to },
    totals,
    transactions
  };
}

function formatDateTime(value: Date) {
  return value.toLocaleString("zh-CN", {
    hour12: false
  });
}

function formatAmount(value: number) {
  return value.toFixed(2);
}

function sanitizeFilenamePart(value: string) {
  return value.replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "statement";
}

function csvCell(value: string | number | null | undefined) {
  const raw = value === null || value === undefined ? "" : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export function buildStatementCsv(statement: Awaited<ReturnType<typeof buildCustomerStatement>>) {
  const rows = [
    ["客户", statement.customer.companyName],
    ["开始日期", statement.range.from.toISOString()],
    ["结束日期", statement.range.to.toISOString()],
    ["期初余额", statement.totals.openingBalance],
    ["充值金额", statement.totals.rechargeAmount],
    ["按箱扣费", statement.totals.boxChargeAmount],
    ["按件扣费", statement.totals.itemChargeAmount],
    ["冲正金额", statement.totals.reversalAmount],
    ["期末余额", statement.totals.closingBalance],
    [],
    ["时间", "类型", "业务说明", "预报编号", "箱号", "追踪号", "金额", "余额变动前", "余额变动后"]
  ];

  for (const item of statement.transactions) {
    rows.push([
      item.createdAt.toISOString(),
      item.type,
      item.remarks || "",
      item.forecast?.forecastNo || "",
      item.forecastBox?.boxNo || "",
      item.trackingNo || "",
      Number(item.amount),
      Number(item.balanceBefore),
      Number(item.balanceAfter)
    ]);
  }

  return rows
    .map((row) => row.map((cell) => csvCell(cell)).join(","))
    .join("\n");
}

export async function buildStatementPdf(statement: Awaited<ReturnType<typeof buildCustomerStatement>>) {
  const pdf = await PDFDocument.create();
  const fonts = await loadPdfFonts(pdf);
  const font = fonts.regular;
  const bold = fonts.bold;
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 32;
  const lineHeight = 18;
  const tableTopStart = 330;
  const footerY = 24;
  const rowHeight = 20;
  const rowsPerPage = Math.floor((tableTopStart - footerY - 36) / rowHeight) - 1;
  const headers = [
    "时间",
    "类型",
    "业务说明",
    "预报编号",
    "箱号",
    "追踪号",
    "金额",
    "变动前",
    "变动后"
  ];
  const columns = [88, 72, 148, 88, 84, 96, 64, 68, 68];
  const generatedAt = new Date();

  function fitText(value: string, maxLength: number) {
    if (value.length <= maxLength) {
      return value;
    }
    return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
  }

  function drawHeader(page: PDFPage) {
    page.drawText("客户对账单", {
      x: margin,
      y: pageHeight - margin,
      size: 20,
      font: bold,
      color: rgb(0.12, 0.16, 0.22)
    });

    const infoLines = [
      `公司名：${statement.customer.companyName}`,
      `日期范围：${statement.range.from.toISOString().slice(0, 10)} 至 ${statement.range.to.toISOString().slice(0, 10)}`,
      `生成时间：${formatDateTime(generatedAt)}`,
      `期初余额：${formatAmount(statement.totals.openingBalance)} ${statement.wallet.currency}`,
      `充值金额：${formatAmount(statement.totals.rechargeAmount)} ${statement.wallet.currency}`,
      `按箱扣费：${formatAmount(statement.totals.boxChargeAmount)} ${statement.wallet.currency}`,
      `按件扣费：${formatAmount(statement.totals.itemChargeAmount)} ${statement.wallet.currency}`,
      `冲正金额：${formatAmount(statement.totals.reversalAmount)} ${statement.wallet.currency}`,
      `期末余额：${formatAmount(statement.totals.closingBalance)} ${statement.wallet.currency}`
    ];

    infoLines.forEach((line, index) => {
      page.drawText(line, {
        x: margin,
        y: pageHeight - margin - 34 - index * lineHeight,
        size: 10,
        font,
        color: rgb(0.24, 0.28, 0.33)
      });
    });

    page.drawRectangle({
      x: margin,
      y: tableTopStart,
      width: pageWidth - margin * 2,
      height: rowHeight,
      color: rgb(0.95, 0.92, 0.88)
    });

    let currentX = margin + 4;
    headers.forEach((header, index) => {
      page.drawText(header, {
        x: currentX,
        y: tableTopStart + 5,
        size: 9,
        font: bold
      });
      currentX += columns[index];
    });
  }

  function drawRows(page: PDFPage, rows: typeof statement.transactions) {
    rows.forEach((item, rowIndex) => {
      const y = tableTopStart - (rowIndex + 1) * rowHeight;
      const values = [
        formatDateTime(item.createdAt),
        item.type,
        item.remarks || "-",
        item.forecast?.forecastNo || "-",
        item.forecastBox?.boxNo || "-",
        item.trackingNo || "-",
        formatAmount(Number(item.amount)),
        formatAmount(Number(item.balanceBefore)),
        formatAmount(Number(item.balanceAfter))
      ];

      let currentX = margin + 4;
      values.forEach((value, index) => {
        page.drawText(fitText(String(value), index === 2 ? 24 : 14), {
          x: currentX,
          y: y + 5,
          size: 8,
          font,
          color: rgb(0.18, 0.21, 0.26)
        });
        currentX += columns[index];
      });

      page.drawLine({
        start: { x: margin, y },
        end: { x: pageWidth - margin, y },
        thickness: 0.6,
        color: rgb(0.88, 0.84, 0.78)
      });
    });
  }

  const chunks =
    statement.transactions.length === 0
      ? [[]]
      : Array.from({ length: Math.ceil(statement.transactions.length / rowsPerPage) }, (_, index) =>
          statement.transactions.slice(index * rowsPerPage, (index + 1) * rowsPerPage)
        );

  chunks.forEach((chunk, index) => {
    const page = pdf.addPage([pageWidth, pageHeight]);
    drawHeader(page);
    drawRows(page, chunk);
    page.drawLine({
      start: { x: margin, y: footerY + 10 },
      end: { x: pageWidth - margin, y: footerY + 10 },
      thickness: 0.8,
      color: rgb(0.88, 0.84, 0.78)
    });
    page.drawText(`第 ${index + 1} / ${chunks.length} 页`, {
      x: pageWidth - margin - 72,
      y: footerY,
      size: 9,
      font,
      color: rgb(0.45, 0.49, 0.54)
    });
  });

  const bytes = await pdf.save();
  return {
    bytes: Buffer.from(bytes),
    filename: `statement-${sanitizeFilenamePart(statement.customer.companyName)}-${statement.range.from
      .toISOString()
      .slice(0, 10)}-${statement.range.to.toISOString().slice(0, 10)}.pdf`
  };
}
