import { AccountError } from "@ssota/core";
import { getAccountReadPort, getConsolePort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export type ApiAccountScope = {
  mode: "builder" | "end_user";
  userId: string;
  teamspaceId: string;
  accountId: string;
};

export class ApiAccountScopeError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiAccountScopeError";
  }
}

function pathFromReferer(referer: string | null | undefined): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).pathname;
  } catch {
    return null;
  }
}

function pathFromReturnTo(returnTo: string | null | undefined): string | null {
  if (!returnTo) return null;
  if (returnTo.startsWith("/")) return returnTo;
  try {
    return new URL(returnTo).pathname;
  } catch {
    return null;
  }
}

function isEndUserPath(path: string | null): boolean {
  return Boolean(path?.startsWith("/app/"));
}

/**
 * Resolve the server-trusted account partition for API calls.
 * End-user mode is selected when Referer or returnTo path starts with `/app/`.
 */
export async function resolveApiAccountScope(
  teamspaceId: string,
  opts?: {
    referer?: string | null;
    returnTo?: string | null;
    requestedAccountId?: string | null;
  },
): Promise<ApiAccountScope> {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    throw new ApiAccountScopeError(401, "Unauthorized");
  }

  const refererPath = pathFromReferer(opts?.referer);
  const returnPath = pathFromReturnTo(opts?.returnTo);
  const endUser =
    isEndUserPath(refererPath) || isEndUserPath(returnPath);

  const accountRead = getAccountReadPort();
  const consolePort = getConsolePort();
  const project = await consolePort.getTeamspaceById(teamspaceId);
  if (!project) {
    throw new ApiAccountScopeError(404, "Teamspace not found");
  }

  if (endUser) {
    if (!project.appEnabled) {
      throw new ApiAccountScopeError(404, "App is not enabled for this project");
    }

    const account = await accountRead.provisionForUser(teamspaceId, user.id);
    if (opts?.requestedAccountId && opts.requestedAccountId !== account.id) {
      throw new ApiAccountScopeError(403, "Account mismatch");
    }
    await accountRead.assertAccountAccess(user.id, account.id);

    return {
      mode: "end_user",
      userId: user.id,
      teamspaceId,
      accountId: account.id,
    };
  }

  const organizations = await consolePort.listOrganizationsForUser(user.id);
  if (!organizations.some((org) => org.id === project.organizationId)) {
    throw new ApiAccountScopeError(403, "Not a member of this organization");
  }

  const account = await accountRead.getOrCreateWorkspaceAccount(teamspaceId);
  if (opts?.requestedAccountId && opts.requestedAccountId !== account.id) {
    throw new ApiAccountScopeError(403, "Account mismatch");
  }

  return {
    mode: "builder",
    userId: user.id,
    teamspaceId,
    accountId: account.id,
  };
}

export function isApiAccountScopeError(
  error: unknown,
): error is ApiAccountScopeError {
  return error instanceof ApiAccountScopeError;
}

export function isAccountAccessError(error: unknown): error is AccountError {
  return error instanceof AccountError;
}
