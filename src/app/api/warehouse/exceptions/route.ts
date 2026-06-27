import { revalidatePath } from "next/cache";
import { BoxExceptionResolution, UserRole } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { getBoxScanContext, resolveBoxException } from "@/services/forecast-service";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== UserRole.ADMIN && session.role !== UserRole.WAREHOUSE_OPERATOR)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const forecastBoxId = String(formData.get("forecastBoxId") || "");
    await resolveBoxException({
      forecastBoxId,
      resolution: String(formData.get("resolution") || "PENDING") as BoxExceptionResolution,
      note: String(formData.get("note") || ""),
      operatorId: session.userId,
      files: formData
        .getAll("attachments")
        .filter((file): file is File => file instanceof File && file.size > 0)
    });

    const context = await getBoxScanContext(forecastBoxId);
    revalidatePath("/warehouse");
    revalidatePath("/warehouse/exceptions");
    revalidatePath("/admin");
    revalidatePath("/admin/exceptions");

    return Response.json({
      message: context.status === "VERIFIED" ? "异常已处理，当前箱恢复正常" : "异常已处理",
      context
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "异常处理失败";
    return Response.json({ error: message }, { status: 400 });
  }
}
