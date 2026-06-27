import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { buildForecastLabelsPdf } from "@/services/label-service";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireRole([UserRole.CUSTOMER, UserRole.ADMIN]);
  const params = await context.params;
  const url = new URL(request.url);
  const boxId = url.searchParams.get("boxId");
  const layout = (url.searchParams.get("layout") as "a4" | "single" | "thermal_100x150" | null) ?? undefined;

  const result = await buildForecastLabelsPdf({
    forecastId: params.id,
    boxId,
    layout
  });

  if (session.role === UserRole.CUSTOMER && result.forecast.customerId !== session.customerId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return new Response(result.bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${result.filename}"`
    }
  });
}
