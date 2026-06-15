import {
  SubmitForApprovalClientInputSchema,
  SubmitForApprovalResponseSchema,
} from "@ssota/contracts";
import { submitForApproval } from "@/lib/api/services";
import { jsonOk, parseJsonBody } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gateId: string }> },
) {
  const { gateId } = await params;
  return withAuth(request, async (ctx) => {
    const body = await request.json().catch(() => ({}));
    const parsed = parseJsonBody(SubmitForApprovalClientInputSchema, body);
    if (!parsed.ok) return parsed.response;

    const result = await submitForApproval(ctx.projectId, gateId, parsed.data.note);
    const data = SubmitForApprovalResponseSchema.parse({ data: result }).data;
    return jsonOk(data);
  });
}
