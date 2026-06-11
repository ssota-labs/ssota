import { ApiErrorSchema } from "@loopos/contracts";

export class LooposApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "LooposApiError";
    this.status = status;
    this.code = code;
  }
}

export async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) return;

  let code = "HTTP_ERROR";
  let message = response.statusText || `HTTP ${response.status}`;

  try {
    const body: unknown = await response.json();
    const parsed = ApiErrorSchema.safeParse(body);
    if (parsed.success) {
      code = parsed.data.code;
      message = parsed.data.message;
    }
  } catch {
    // ignore JSON parse errors
  }

  throw new LooposApiError(response.status, code, message);
}
