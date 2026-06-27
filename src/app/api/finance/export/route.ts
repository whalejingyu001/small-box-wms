import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { buildFinanceReport, buildFinanceReportCsv } from "@/services/finance-report-service";

export async function GET(request: Request) {
  await requireRole([UserRole.ADMIN]);

  const url = new URL(request.url);
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const groupBy = (url.searchParams.get("groupBy") || "day") as "day" | "month";

  if (!dateFrom || !dateTo) {
    return Response.json({ error: "缺少日期范围" }, { status: 400 });
  }

  const report = await buildFinanceReport({
    dateFrom,
    dateTo,
    groupBy
  });
  const csv = buildFinanceReportCsv(report);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="finance-${groupBy}-${dateFrom}-${dateTo}.csv"`
    }
  });
}
