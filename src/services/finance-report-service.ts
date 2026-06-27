import { WalletTransactionStatus, WalletTransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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

function buildGroupKey(date: Date, groupBy: "day" | "month") {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  if (groupBy === "month") {
    return `${year}-${month}`;
  }

  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function buildFinanceReport(input: {
  dateFrom: string;
  dateTo: string;
  groupBy: "day" | "month";
  customerId?: string | null;
}) {
  const from = startOfDay(input.dateFrom);
  const to = endOfDay(input.dateTo);

  const [transactions, expenses] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: {
        status: {
          in: [WalletTransactionStatus.SUCCESS, WalletTransactionStatus.REVERSED]
        },
        wallet: input.customerId
          ? {
              customerId: input.customerId
            }
          : undefined,
        createdAt: {
          gte: from,
          lte: to
        }
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.expense.findMany({
      where: {
        customerId: input.customerId ?? undefined,
        expenseDate: {
          gte: from,
          lte: to
        }
      },
      orderBy: { expenseDate: "asc" }
    })
  ]);

  const buckets = new Map<
    string,
    {
      period: string;
      rechargeAmount: number;
      boxIncome: number;
      itemIncome: number;
      reversalAmount: number;
      totalIncome: number;
      cost: number;
      grossProfit: number;
    }
  >();

  const ensureBucket = (period: string) => {
    const existing = buckets.get(period);
    if (existing) {
      return existing;
    }

    const created = {
      period,
      rechargeAmount: 0,
      boxIncome: 0,
      itemIncome: 0,
      reversalAmount: 0,
      totalIncome: 0,
      cost: 0,
      grossProfit: 0
    };
    buckets.set(period, created);
    return created;
  };

  for (const transaction of transactions) {
    const bucket = ensureBucket(buildGroupKey(transaction.createdAt, input.groupBy));
    const amount = Number(transaction.amount);

    if (transaction.type === WalletTransactionType.RECHARGE) {
      bucket.rechargeAmount += amount;
      continue;
    }

    if (transaction.type === WalletTransactionType.BOX_CHARGE) {
      bucket.boxIncome += Math.abs(amount);
      continue;
    }

    if (transaction.type === WalletTransactionType.ITEM_CHARGE) {
      bucket.itemIncome += Math.abs(amount);
      continue;
    }

    if (transaction.type === WalletTransactionType.REVERSAL) {
      bucket.reversalAmount += amount;
    }
  }

  for (const expense of expenses) {
    const bucket = ensureBucket(buildGroupKey(expense.expenseDate, input.groupBy));
    bucket.cost += Number(expense.amount);
  }

  const rows = Array.from(buckets.values())
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((row) => {
      const totalIncome = row.boxIncome + row.itemIncome - row.reversalAmount;
      return {
        ...row,
        totalIncome,
        grossProfit: totalIncome - row.cost
      };
    });

  const totals = rows.reduce(
    (accumulator, row) => ({
      rechargeAmount: accumulator.rechargeAmount + row.rechargeAmount,
      boxIncome: accumulator.boxIncome + row.boxIncome,
      itemIncome: accumulator.itemIncome + row.itemIncome,
      reversalAmount: accumulator.reversalAmount + row.reversalAmount,
      totalIncome: accumulator.totalIncome + row.totalIncome,
      cost: accumulator.cost + row.cost,
      grossProfit: accumulator.grossProfit + row.grossProfit
    }),
    {
      rechargeAmount: 0,
      boxIncome: 0,
      itemIncome: 0,
      reversalAmount: 0,
      totalIncome: 0,
      cost: 0,
      grossProfit: 0
    }
  );

  return {
    range: { from, to },
    groupBy: input.groupBy,
    customerId: input.customerId ?? null,
    rows,
    totals
  };
}

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function buildFinanceReportCsv(report: Awaited<ReturnType<typeof buildFinanceReport>>) {
  const rows: Array<Array<string | number>> = [
    ["开始日期", report.range.from.toISOString().slice(0, 10)],
    ["结束日期", report.range.to.toISOString().slice(0, 10)],
    ["汇总粒度", report.groupBy],
    [],
    ["周期", "充值金额", "按箱收入", "按件收入", "冲正金额", "总收入", "成本", "毛利润"]
  ];

  for (const item of report.rows) {
    rows.push([
      item.period,
      item.rechargeAmount,
      item.boxIncome,
      item.itemIncome,
      item.reversalAmount,
      item.totalIncome,
      item.cost,
      item.grossProfit
    ]);
  }

  rows.push([]);
  rows.push([
    "合计",
    report.totals.rechargeAmount,
    report.totals.boxIncome,
    report.totals.itemIncome,
    report.totals.reversalAmount,
    report.totals.totalIncome,
    report.totals.cost,
    report.totals.grossProfit
  ]);

  return rows.map((row) => row.map((cell) => csvCell(cell)).join(",")).join("\n");
}
