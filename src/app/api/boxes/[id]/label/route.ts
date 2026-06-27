import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildForecastLabelsPdf, logBoxLabelReprint } from "@/services/label-service";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireRole([UserRole.CUSTOMER, UserRole.ADMIN, UserRole.WAREHOUSE_OPERATOR]);
  const params = await context.params;
  const box = await prisma.forecastBox.findUnique({
    where: { id: params.id },
    include: { forecast: true }
  });

  if (!box) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (session.role === UserRole.CUSTOMER && box.forecast.customerId !== session.customerId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const layout = (url.searchParams.get("layout") as "single" | "thermal_100x150" | null) ?? "single";
  const reprint = url.searchParams.get("reprint") === "1";

  if (reprint && session.role !== UserRole.CUSTOMER) {
    await logBoxLabelReprint({
      boxId: box.id,
      layout,
      operatorId: session.userId
    });
  }

  const result = await buildForecastLabelsPdf({
    forecastId: box.forecastId,
    boxId: box.id,
    layout
  });

  return new Response(result.bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${result.filename}"`
    }
  });
}
