import { ApiScope } from "@prisma/client";
import { z } from "zod";
import { createForecast } from "@/services/forecast-service";
import { withErpAuth } from "@/services/erp-auth-service";

const schema = z.object({
  notes: z.string().optional(),
  boxes: z.array(
    z.object({
      boxSpec: z.string().min(1),
      expectedOrderCount: z.number().int().positive(),
      channelIds: z.array(z.string()).min(1).max(2)
    })
  )
});

export async function POST(request: Request) {
  return withErpAuth(request, ApiScope.FORECAST_CREATE, async (access) => {
    const payload = schema.parse(await request.json());
    const operatorId = access.kind === "session" ? access.userId : null;
    const forecast = await createForecast(access.customerId, payload.boxes, payload.notes, operatorId);
    return { body: forecast, status: 200, customerId: access.customerId };
  });
}
