"use client";

import type { ComponentType, SVGProps } from "react";
import { PuzzlePieceIcon } from "@phosphor-icons/react";
import {
  Asana,
  Atlassian,
  Calendly,
  Canva,
  ClickUp,
  Discord,
  Dropbox,
  Figma,
  GitHubDark,
  GitHubLight,
  GitLab,
  Gmail,
  GoogleCalendar,
  GoogleDrive,
  GoogleMeet,
  GoogleSheets,
  Linear,
  LinkedIn,
  MicrosoftOneDrive,
  MicrosoftOutlook,
  Notion,
  Reddit,
  Salesforce,
  Sentry,
  Slack,
  Todoist,
  Trello,
  XDark,
  XLight,
  YouTube,
  Zoom,
} from "@ridemountainpig/svgl-react";
import { cn } from "@ssota/ui/lib/utils";
import { GoogleDocsIcon, GoogleTasksIcon } from "@/components/connections/google-workspace-icons";
import type { ConnectorProvider } from "@/lib/connect/connectors";

type ConnectorBrandIconProps = SVGProps<SVGSVGElement> & {
  provider: ConnectorProvider;
};

type BrandIcon =
  | { kind: "component"; Icon: ComponentType<SVGProps<SVGSVGElement>> }
  | {
      kind: "theme";
      light: ComponentType<SVGProps<SVGSVGElement>>;
      dark: ComponentType<SVGProps<SVGSVGElement>>;
    };

// svgl-react logos for every connector that exists in the svgl catalog.
// Puzzle fallback when svgl has no logo yet (e.g. Airtable, Google Docs).
const PROVIDER_BRANDS: Record<string, BrandIcon> = {
  notion: { kind: "component", Icon: Notion },
  slack: { kind: "component", Icon: Slack },
  discord: { kind: "component", Icon: Discord },
  outlook: { kind: "component", Icon: MicrosoftOutlook },
  zoom: { kind: "component", Icon: Zoom },
  github: { kind: "theme", light: GitHubLight, dark: GitHubDark },
  linear: { kind: "component", Icon: Linear },
  jira: { kind: "component", Icon: Atlassian },
  gitlab: { kind: "component", Icon: GitLab },
  sentry: { kind: "component", Icon: Sentry },
  gmail: { kind: "component", Icon: Gmail },
  googlecalendar: { kind: "component", Icon: GoogleCalendar },
  googlesheets: { kind: "component", Icon: GoogleSheets },
  googledocs: { kind: "component", Icon: GoogleDocsIcon },
  googletasks: { kind: "component", Icon: GoogleTasksIcon },
  googlemeet: { kind: "component", Icon: GoogleMeet },
  googledrive: { kind: "component", Icon: GoogleDrive },
  asana: { kind: "component", Icon: Asana },
  trello: { kind: "component", Icon: Trello },
  clickup: { kind: "component", Icon: ClickUp },
  todoist: { kind: "component", Icon: Todoist },
  calendly: { kind: "component", Icon: Calendly },
  dropbox: { kind: "component", Icon: Dropbox },
  onedrive: { kind: "component", Icon: MicrosoftOneDrive },
  salesforce: { kind: "component", Icon: Salesforce },
  figma: { kind: "component", Icon: Figma },
  canva: { kind: "component", Icon: Canva },
  twitter: { kind: "theme", light: XLight, dark: XDark },
  linkedin: { kind: "component", Icon: LinkedIn },
  youtube: { kind: "component", Icon: YouTube },
  reddit: { kind: "component", Icon: Reddit },
};

export function ConnectorBrandIcon({
  provider,
  className,
  ...props
}: ConnectorBrandIconProps) {
  const brand = PROVIDER_BRANDS[provider];
  if (!brand) {
    return (
      <PuzzlePieceIcon
        aria-hidden
        className={cn("text-muted-foreground", className)}
      />
    );
  }

  if (brand.kind === "theme") {
    const { light: Light, dark: Dark } = brand;
    return (
      <>
        <Light
          aria-hidden
          className={cn("dark:hidden", className)}
          {...props}
        />
        <Dark
          aria-hidden
          className={cn("hidden dark:block", className)}
          {...props}
        />
      </>
    );
  }

  const { Icon } = brand;
  return <Icon aria-hidden className={className} {...props} />;
}
