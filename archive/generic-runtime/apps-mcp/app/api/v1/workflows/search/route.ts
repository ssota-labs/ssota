import {
  FindWorkflowInputSchema,
  WorkflowListResponseSchema,
} from "@ssota/contracts";
import { findWorkflows } from "@/lib/api/services";
import { jsonOk, parseQuery } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(request: Request) {
  return withAuth(request, async (ctx) => {
    const parsed = parseQuery(
      FindWorkflowInputSchema,
      new URL(request.url).searchParams,
    );
    if (!parsed.ok) return parsed.response;
    const data = await findWorkflows(ctx.projectId, parsed.data);
    return jsonOk(WorkflowListResponseSchema.parse({ data }).data);
  });
}
