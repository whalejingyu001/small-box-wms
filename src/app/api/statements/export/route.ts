import { UserRole } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import {
  buildCustomerStatement,
  buildStatementCsv,
  buildStatementPdf
} from "@/services/statement-service";

export async function GET(request: Request) {
  const session = await requireSession();
  const url = new URL(request.url);
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const requestedCustomerId = url.searchParams.get("customerId");
  const format = url.searchParams.get("format") || "csv";

  if (!dateFrom || !dateTo) {
    return Response.json({ error: "缺少日期范围" }, { status: 400 });
  }

  const customerId =
    session.role === UserRole.ADMIN ? requestedCustomerId : session.customerId;

  if (!customerId) {
    return Response.json({ error: "缺少客户参数" }, { status: 400 });
  }

  const statement = await buildCustomerStatement({
    customerId,
    dateFrom,
    dateTo
  });

  if (format === "pdf") {
    const pdf = await buildStatementPdf(statement);
    return new Response(pdf.bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdf.filename}"`
      }
    });
  }

  const csv = buildStatementCsv(statement);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="statement-${statement.customer.code}-${dateFrom}-${dateTo}.csv"`
    }
  });
}
