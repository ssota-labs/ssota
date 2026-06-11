"use client";

import { useState } from "react";
import { completeProfileOnboardingAction } from "@/app/onboarding/actions";
import { ConsolePreview } from "@/components/onboarding/console-preview";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";

type ProfileOnboardingFormProps = {
  defaultWorkspaceName: string;
  error?: string;
};

export function ProfileOnboardingForm({
  defaultWorkspaceName,
  error,
}: ProfileOnboardingFormProps) {
  const [workspaceName, setWorkspaceName] = useState(defaultWorkspaceName);

  return (
    <OnboardingShell
      step={1}
      stepLabel="Workspace"
      title="Create your workspace"
      description="Your workspace is your organization — it holds all your projects. Names must use English letters and numbers."
      form={
        <form action={completeProfileOnboardingAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspaceName">Workspace name</Label>
            <Input
              id="workspaceName"
              name="workspaceName"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              placeholder="Acme Workspace"
              required
            />
            <p className="text-xs text-muted-foreground">
              English only. Used for your organization URL slug.
            </p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>
      }
      preview={
        <ConsolePreview workspaceName={workspaceName || "Your Workspace"} />
      }
    />
  );
}
