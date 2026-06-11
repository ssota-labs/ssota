import {
  ExecuteActionClientInputSchema,
  ExecuteActionResponseSchema,
} from "@ssota/contracts";
import { executeActionForClient } from "@/lib/api/services";
import { jsonOk, parseJsonBody } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function POST(request: Request) {
  return withAuth(request, async (ctx) => {
    const body = await request.json().catch(() => null);
    const parsed = parseJsonBody(ExecuteActionClientInputSchema, body);
    if (!parsed.ok) return parsed.response;

    const result = await executeActionForClient(
      ctx.projectId,
      parsed.data,
      ctx.user.id,
      ctx.executorType,
      ctx.subjectId,
    );
    const data = ExecuteActionResponseSchema.parse({ data: result }).data;
    return jsonOk(data);
  });
}
