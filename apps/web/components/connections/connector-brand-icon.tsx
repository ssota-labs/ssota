"use client";

import type { ComponentType, SVGProps } from "react";
import { PuzzlePieceIcon } from "@phosphor-icons/react";
import {
  Discord,
  GitHubDark,
  GitHubLight,
  Google,
  Linear,
  Notion,
  Slack,
  XDark,
  XLight,
} from "@ridemountainpig/svgl-react";
import { cn } from "@ssota/ui/lib/utils";
import type { ConnectorProvider } from "@/lib/connect/connectors";

type ConnectorBrandIconProps = SVGProps<SVGSVGElement> & {
  provider: ConnectorProvider;
};

// Brand marks we have SVGs for; everything else falls back to a generic icon.
const PROVIDER_SVGS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  slack: Slack,
  notion: Notion,
  github: GitHubLight,
  discord: Discord,
  linear: Linear,
  twitter: XLight,
  // The Composio Google toolkits share the Google mark.
  gmail: Google,
  googledrive: Google,
  googlecalendar: Google,
  googledocs: Google,
  googlesheets: Google,
  googletasks: Google,
  googlemeet: Google,
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

  if (provider === "twitter") {
    return (
      <>
        <XLight
          aria-hidden
          className={cn("dark:hidden", className)}
          {...props}
        />
        <XDark
          aria-hidden
          className={cn("hidden dark:block", className)}
          {...props}
        />
      </>
    );
  }

  const Logo = PROVIDER_SVGS[provider];
  if (!Logo) {
    return (
      <PuzzlePieceIcon
        aria-hidden
        className={cn("text-muted-foreground", className)}
      />
    );
  }
  return <Logo aria-hidden className={className} {...props} />;
}
