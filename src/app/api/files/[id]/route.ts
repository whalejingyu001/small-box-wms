import path from "node:path";
import { readFile } from "node:fs/promises";
import { UserRole } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const params = await context.params;

  const asset = await prisma.fileAsset.findUnique({
    where: { id: params.id },
    include: {
      rechargeRequest: true,
      expense: true,
      exceptionAttachments: {
        include: {
          record: {
            include: {
              forecastBox: {
                include: {
                  forecast: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!asset) {
    return new Response("Not Found", { status: 404 });
  }

  const isAdmin = session.role === UserRole.ADMIN;
  const isOwnerRecharge =
    session.role === UserRole.CUSTOMER &&
    asset.rechargeRequest &&
    asset.rechargeRequest.customerId === session.customerId;
  const isWarehouseExceptionAttachment =
    session.role === UserRole.WAREHOUSE_OPERATOR && asset.exceptionAttachments.length > 0;

  if (!isAdmin && !isOwnerRecharge && !isWarehouseExceptionAttachment) {
    return new Response("Forbidden", { status: 403 });
  }

  const absolutePath = path.join(process.cwd(), asset.storagePath.replace(/^\//, ""));
  const buffer = await readFile(absolutePath);

  return new Response(buffer, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(asset.originalFilename)}"`
    }
  });
}
