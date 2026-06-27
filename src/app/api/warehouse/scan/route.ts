import { UserRole } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { getBoxScanContext, getBoxScanContextByBoxNo, scanBoxLabel, scanTrackingNo } from "@/services/forecast-service";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== UserRole.ADMIN && session.role !== UserRole.WAREHOUSE_OPERATOR)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    mode: "box" | "tracking" | "context";
    boxNo?: string;
    trackingNo?: string;
    boxId?: string;
  };

  try {
    if (payload.mode === "box") {
      const context = await scanBoxLabel(payload.boxNo || "", session.userId);
      return Response.json({
        message:
          context?.billingMode === "PER_ITEM" ? "扫箱成功，进入追踪号扫描模式" : "扫箱成功",
        context
      });
    }

    if (payload.mode === "tracking") {
      const result = await scanTrackingNo(payload.boxNo || "", payload.trackingNo || "", session.userId);
      return Response.json(result);
    }

    if (payload.mode === "context" && payload.boxId) {
      const context = await getBoxScanContext(payload.boxId);
      return Response.json({ context });
    }

    return Response.json({ error: "Bad Request" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "扫描失败";
    let context = null;

    if (payload.mode === "tracking" && payload.boxNo) {
      context = await getBoxScanContextByBoxNo(payload.boxNo);
    }

    return Response.json({ error: message, context }, { status: 400 });
  }
}
