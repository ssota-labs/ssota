import { Badge } from "@loopos/ui/components/ui/badge";

const outcomeVariant = {
  committed: "outline",
  gated: "secondary",
  rejected: "destructive",
} as const;

export function OutcomeBadge({ outcome }: { outcome: string }) {
  const variant =
    outcome in outcomeVariant
      ? outcomeVariant[outcome as keyof typeof outcomeVariant]
      : "secondary";

  return <Badge variant={variant}>{outcome}</Badge>;
}
