import { redirect } from "next/navigation";
import { safeNextPath } from "./safe-next-path";

export function loginRedirect(returnTo?: string | null): never {
  const params = new URLSearchParams();
  const safe = safeNextPath(returnTo);
  if (safe) params.set("next", safe);
  const query = params.toString();
  redirect(query ? `/login?${query}` : "/login");
}
