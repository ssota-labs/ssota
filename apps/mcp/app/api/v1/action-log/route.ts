import {
  ActionLogListResponseSchema,
  GetActionLogInputSchema,
} from "@loopos/contracts";
import { getActionLog } from "@/lib/api/services";
import { jsonOk, parseQuery } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(request: Request) {
  return withAuth(request, async () => {
    const parsed = parseQuery(
      GetActionLogInputSchema,
      new URL(request.url).searchParams,
    );
    if (!parsed.ok) return parsed.response;
    const data = await getActionLog(parsed.data);
    return jsonOk(ActionLogListResponseSchema.parse({ data }).data);
  });
}
