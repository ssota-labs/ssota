"use client";

import { useState } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { completeProjectOnboardingAction } from "@/app/onboarding/actions";
import { ConsolePreview } from "@/components/onboarding/console-preview";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";

type ProjectOnboardingFormProps = {
  organizationName: string;
  error?: string;
};

export function ProjectOnboardingForm({
  organizationName,
  error,
}: ProjectOnboardingFormProps) {
  const [projectName, setProjectName] = useState("");

  return (
    <OnboardingShell
      step={2}
      stepLabel="First project"
      title="Create your first project"
      description="Projects organize your context graph, workflows, and gates."
      backHref="/onboarding/profile"
      backLabel="Back to organization"
      banner={
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm">
          <span className="font-medium text-foreground">{organizationName}</span>
          <span className="text-muted-foreground">
            {" "}
            organization created. Name your first project below.
          </span>
        </div>
      }
      form={
        <form action={completeProjectOnboardingAction} className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5">
            <CheckCircleIcon
              className="size-4 shrink-0 text-primary"
              weight="fill"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Organization</p>
              <p className="truncate text-sm font-medium">{organizationName}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectName">Project name</Label>
            <Input
              id="projectName"
              name="projectName"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="SSOTA Dev"
              required
            />
            <p className="text-xs text-muted-foreground">
              English only. Slug is generated automatically.
            </p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" className="w-full">
            Open project
          </Button>
        </form>
      }
      preview={
        <ConsolePreview
          organizationName={organizationName}
          projectName={projectName || "Your Project"}
        />
      }
    />
  );
}
