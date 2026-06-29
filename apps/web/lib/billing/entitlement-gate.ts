import { redirect } from "next/navigation";
import { getEntitlementFromBilling } from "@ssota/core";
import { createDbBillingReadPort } from "@ssota/adapter-postgres";
import { getDb } from "@/lib/ports";
import { isBillingEnabled } from "./provider";

const ALLOWED_RELATIVE_PATHS = [
  "settings/billing",
  "settings/general",
] as const;

/** Supports flat `/{org}/settings/...` and legacy `/{org}/{teamspace}/...` paths. */
export function getConsoleRelativePath(
  pathname: string,
  orgSlug: string,
  teamspaceSlug: string,
): string {
  const teamspacePrefix = `/${orgSlug}/${teamspaceSlug}/`;
  if (pathname.startsWith(teamspacePrefix)) {
    return pathname.slice(teamspacePrefix.length);
  }

  const flatPrefix = `/${orgSlug}/`;
  if (pathname.startsWith(flatPrefix)) {
    return pathname.slice(flatPrefix.length);
  }

  return pathname.replace(/^\//, "");
}

function isAllowedWithoutEntitlement(relativePath: string): boolean {
  return ALLOWED_RELATIVE_PATHS.some(
    (allowed) =>
      relativePath === allowed || relativePath.startsWith(`${allowed}/`),
  );
}

/** Redirect unpaid Cloud orgs to billing settings. No-op when `BILLING=none`. */
export async function enforceBuilderEntitlement(input: {
  organizationId: string;
  orgSlug: string;
  relativePath: string;
}): Promise<void> {
  if (!isBillingEnabled()) return;

  const billingRead = createDbBillingReadPort(getDb());
  const entitlement = await getEntitlementFromBilling(
    billingRead,
    input.organizationId,
  );

  if (entitlement.isEntitled) return;
  if (isAllowedWithoutEntitlement(input.relativePath)) return;

  redirect(`/${input.orgSlug}/settings/billing`);
}
