"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import { completeTemplateOnboardingAction } from "@/app/onboarding/actions";
import { ConsolePreview } from "@/components/onboarding/console-preview";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import type { OnboardingTemplateOption } from "@/lib/onboarding/templates";
import { Button } from "@ssota/ui/components/ui/button";
import { cn } from "@ssota/ui/lib/utils";

type TemplateOnboardingFormProps = {
  organizationName: string;
  projectName: string;
  templates: OnboardingTemplateOption[];
  defaultTemplateId: string;
  error?: string;
};

function TemplateSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={disabled || pending}>
      {pending ? (
        <>
          <SpinnerGapIcon className="size-4 animate-spin" />
          Setting up project…
        </>
      ) : (
        "Open project"
      )}
    </Button>
  );
}

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: OnboardingTemplateOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border p-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border bg-background hover:border-primary/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-medium text-foreground">{template.name}</p>
          <p className="text-sm text-muted-foreground">{template.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {template.category ?? "Template"}
        </span>
      </div>
    </button>
  );
}

export function TemplateOnboardingForm({
  organizationName,
  projectName,
  templates,
  defaultTemplateId,
  error,
}: TemplateOnboardingFormProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    templates.some((template) => template.id === defaultTemplateId)
      ? defaultTemplateId
      : (templates[0]?.id ?? ""),
  );
  const [isProvisioning, setIsProvisioning] = useState(false);

  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? templates[0];

  return (
    <OnboardingShell
      step={3}
      stepLabel="Template"
      title="Choose a project template"
      description="Templates seed your workflow pages, catalog, and instructions. You can customize everything later."
      backHref="/onboarding/project"
      backLabel="Back to project"
      form={
        <form
          action={completeTemplateOnboardingAction}
          className="space-y-4"
          onSubmit={() => setIsProvisioning(true)}
        >
          <input type="hidden" name="templateId" value={selectedTemplateId} />

          <div className="space-y-3">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                selected={template.id === selectedTemplateId}
                onSelect={() => setSelectedTemplateId(template.id)}
              />
            ))}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <TemplateSubmitButton disabled={!selectedTemplateId} />
        </form>
      }
      preview={
        <ConsolePreview
          organizationName={organizationName}
          projectName={projectName}
          templateId={selectedTemplateId || null}
          templateName={selectedTemplate?.name ?? null}
          isProvisioning={isProvisioning}
        />
      }
    />
  );
}
