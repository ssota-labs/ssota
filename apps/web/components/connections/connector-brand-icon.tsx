"use client";

import type { ComponentType, SVGProps } from "react";
import {
  Discord,
  GitHubDark,
  GitHubLight,
  Linear,
  Notion,
  Slack,
} from "@ridemountainpig/svgl-react";
import { cn } from "@ssota/ui/lib/utils";
import type { ConnectorProvider } from "@/lib/connect/connectors";

type ConnectorBrandIconProps = SVGProps<SVGSVGElement> & {
  provider: ConnectorProvider;
};

const PROVIDER_SVGS: Record<
  ConnectorProvider,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  slack: Slack,
  notion: Notion,
  github: GitHubLight,
  discord: Discord,
  linear: Linear,
};

export function ConnectorBrandIcon({
  provider,
  className,
  ...props
}: ConnectorBrandIconProps) {
  if (provider === "github") {
    return (
      <>
        <GitHubLight
          aria-hidden
          className={cn("dark:hidden", className)}
          {...props}
        />
        <GitHubDark
          aria-hidden
          className={cn("hidden dark:block", className)}
          {...props}
        />
      </>
    );
  }

  const Logo = PROVIDER_SVGS[provider];
  return <Logo aria-hidden className={className} {...props} />;
}
