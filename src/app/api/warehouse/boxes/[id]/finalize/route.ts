import { UserRole } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { finalizeBoxScan } from "@/services/forecast-service";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== UserRole.ADMIN && session.role !== UserRole.WAREHOUSE_OPERATOR)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const params = await context.params;
    const result = await finalizeBoxScan(params.id);
    return Response.json({
      message: result.status === "VERIFIED" ? "当前箱已完成" : result.anomalyNote || "当前箱结束",
      context: result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "结束当前箱失败";
    return Response.json({ error: message }, { status: 400 });
  }
}
