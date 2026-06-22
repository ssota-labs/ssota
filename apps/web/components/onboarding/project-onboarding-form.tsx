"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import { toast } from "@ssota/ui/components/ui/sonner";
import { saveProjectDraftOnboardingAction } from "@/app/onboarding/actions";
import { ConsolePreview } from "@/components/onboarding/console-preview";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";

type ProjectOnboardingFormProps = {
  organizationName: string;
  error?: string;
};

function ProjectContinueButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <SpinnerGapIcon className="size-4 animate-spin" />
          Saving project…
        </>
      ) : (
        "Continue"
      )}
    </Button>
  );
}

export function ProjectOnboardingForm({
  organizationName,
  error,
}: ProjectOnboardingFormProps) {
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    toast.success(`${organizationName} organization created`, {
      id: "onboarding-organization-created",
      description: "Name your first project below.",
    });
  }, [organizationName]);

  return (
    <OnboardingShell
      step={2}
      stepLabel="First project"
      title="Create your first project"
      description="Projects organize your context graph, workflows, and gates."
      backHref="/onboarding/profile"
      backLabel="Back to organization"
      form={
        <form action={saveProjectDraftOnboardingAction} className="space-y-4">
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

          <ProjectContinueButton />
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
