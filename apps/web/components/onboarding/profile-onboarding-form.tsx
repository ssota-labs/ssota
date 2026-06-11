"use client";

import { useState } from "react";
import { completeProfileOnboardingAction } from "@/app/onboarding/actions";
import { ConsolePreview } from "@/components/onboarding/console-preview";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";

type ProfileOnboardingFormProps = {
  defaultOrganizationName: string;
  error?: string;
};

export function ProfileOnboardingForm({
  defaultOrganizationName,
  error,
}: ProfileOnboardingFormProps) {
  const [organizationName, setOrganizationName] = useState(defaultOrganizationName);

  return (
    <OnboardingShell
      step={1}
      stepLabel="Organization"
      title="Create your organization"
      description="Organizations hold all your projects. Names must use English letters and numbers."
      form={
        <form action={completeProfileOnboardingAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="organizationName">Organization name</Label>
            <Input
              id="organizationName"
              name="organizationName"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Acme Organization"
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
        <ConsolePreview organizationName={organizationName || "Your Organization"} />
      }
    />
  );
}
