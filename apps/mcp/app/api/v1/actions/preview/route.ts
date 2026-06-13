import {
  ActionPreviewClientInputSchema,
  ActionPreviewResponseSchema,
} from "@ssota/contracts";
import { previewActionForClient } from "@/lib/api/services";
import { jsonOk, parseJsonBody } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function POST(request: Request) {
  return withAuth(request, async (ctx) => {
    const body = await request.json().catch(() => null);
    const parsed = parseJsonBody(ActionPreviewClientInputSchema, body);
    if (!parsed.ok) return parsed.response;

    const result = await previewActionForClient(
      ctx.projectId,
      parsed.data,
      ctx.user.id,
      ctx.executorType,
    );
    const data = ActionPreviewResponseSchema.parse({ data: result }).data;
    return jsonOk(data);
  });
}
