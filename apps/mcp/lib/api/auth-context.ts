import type { JWTPayload } from "jose";
import type { ExecutorType } from "@ssota/contracts";
import { verifyBearerToken, type AuthUser } from "@/lib/auth";
import { resolveProjectId } from "@/lib/project-context";

export interface AuthContext {
  user: AuthUser;
  executorType: ExecutorType;
  projectId: string;
}

/** JWT 클레임에서 executorType을 서버가 도출한다 (클라이언트 주장 무시). */
export function deriveExecutorType(payload: JWTPayload): ExecutorType {
  const clientId = payload.client_id;
  if (typeof clientId === "string" && clientId.length > 0) {
    return "Agent";
  }

  const amr = payload.amr;
  if (Array.isArray(amr) && amr.some((v) => v === "oauth" || v === "mfa")) {
    return "Agent";
  }

  return "Human";
}

export async function requireAuthContext(
  request: Request,
): Promise<AuthContext | null> {
  const user = await verifyBearerToken(request.headers.get("authorization"));
  if (!user) return null;

  const projectId = resolveProjectId(request);
  if (!projectId) return null;

  const token = request.headers.get("authorization")?.slice("Bearer ".length);
  let executorType: ExecutorType = "Human";

  if (token) {
    try {
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"),
      ) as JWTPayload;
      executorType = deriveExecutorType(payload);
    } catch {
      executorType = "Human";
    }
  }

  return { user, executorType, projectId };
}
