import {
  ActionLogEntryResponseSchema,
  GetActionLogEntryInputSchema,
} from "@ssota/contracts";
import { getActionLogEntry } from "@/lib/api/services";
import { jsonOk, parseQuery } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(request: Request) {
  return withAuth(request, async (ctx) => {
    const parsed = parseQuery(
      GetActionLogEntryInputSchema,
      new URL(request.url).searchParams,
    );
    if (!parsed.ok) return parsed.response;
    const data = await getActionLogEntry(ctx.projectId, parsed.data);
    return jsonOk(ActionLogEntryResponseSchema.parse({ data }).data);
  });
}
