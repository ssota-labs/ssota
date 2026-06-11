"use client";

import { useState } from "react";
import { completeProfileOnboardingAction } from "@/app/onboarding/actions";
import { ConsolePreview } from "@/components/onboarding/console-preview";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { Button } from "@loopos/ui/components/ui/button";
import { Input } from "@loopos/ui/components/ui/input";
import { Label } from "@loopos/ui/components/ui/label";

type ProfileOnboardingFormProps = {
  defaultDisplayName: string;
  error?: string;
};

export function ProfileOnboardingForm({
  defaultDisplayName,
  error,
}: ProfileOnboardingFormProps) {
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [workspaceName, setWorkspaceName] = useState("");

  return (
    <OnboardingShell
      title="Create your workspace"
      description="Set up your personal LoopOS workspace. Names must use English letters and numbers."
      form={
        <form action={completeProfileOnboardingAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              name="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Alex Kim"
              required
              autoComplete="name"
            />
          </div>

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
        <ConsolePreview
          workspaceName={workspaceName || displayName || "Your Workspace"}
        />
      }
    />
  );
}
