"use client";

import { useState } from "react";
import { completeProjectOnboardingAction } from "@/app/onboarding/actions";
import { ConsolePreview } from "@/components/onboarding/console-preview";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";

type ProjectOnboardingFormProps = {
  workspaceName: string;
  error?: string;
};

export function ProjectOnboardingForm({
  workspaceName,
  error,
}: ProjectOnboardingFormProps) {
  const [projectName, setProjectName] = useState("");

  return (
    <OnboardingShell
      title="Create your first project"
      description="Projects organize your context graph, instructions, and gates."
      form={
        <form action={completeProjectOnboardingAction} className="space-y-4">
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
          workspaceName={workspaceName}
          projectName={projectName || "Your Project"}
        />
      }
    />
  );
}
