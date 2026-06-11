import type { z } from "zod";
import { ApiErrorSchema } from "@loopos/contracts";

export function jsonOk<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status });
}

export function jsonError(
  code: string,
  message: string,
  status: number,
): Response {
  const body = ApiErrorSchema.parse({ code, message });
  return Response.json(body, { status });
}

export function parseJsonBody<T extends z.ZodType>(
  schema: T,
  body: unknown,
):
  | { ok: true; data: z.infer<T> }
  | { ok: false; response: Response } {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonError(
        "VALIDATION_ERROR",
        parsed.error.message,
        422,
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

export function parseQuery<T extends z.ZodType>(
  schema: T,
  searchParams: URLSearchParams,
): { ok: true; data: z.infer<T> } | { ok: false; response: Response } {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of searchParams.entries()) {
    if (key === "limit" || key === "offset" || key === "maxHops") {
      raw[key] = Number(value);
    } else if (key === "edgeTypes" || key === "nodeTypes") {
      raw[key] = value.split(",").filter(Boolean);
    } else {
      raw[key] = value;
    }
  }
  return parseJsonBody(schema, raw);
}
