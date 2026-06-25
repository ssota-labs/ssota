"use client";

import Link from "next/link";
import { CaretLeftIcon } from "@phosphor-icons/react";
import { signOutAction } from "@/app/actions";
import { Button } from "@ssota/ui/components/ui/button";
import { cn } from "@ssota/ui/lib/utils";

const TOTAL_STEPS = 3;

type OnboardingShellProps = {
  step: 1 | 2 | 3;
  stepLabel: string;
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  form: React.ReactNode;
  preview: React.ReactNode;
};

export function OnboardingShell({
  step,
  stepLabel,
  title,
  description,
  backHref,
  backLabel = "Back",
  form,
  preview,
}: OnboardingShellProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-muted/30">
      <header className="flex items-center justify-between border-b bg-background px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          SSOTA
        </Link>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </header>

      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-3">
        <section className="flex flex-col justify-center px-6 py-10 lg:col-span-1 lg:px-12 xl:px-16">
          <div className="w-full max-w-md space-y-6">
            {backHref ? (
              <Button
                render={<Link href={backHref} />}
                variant="ghost"
                size="sm"
                nativeButton={false}
                className="-ml-2 text-muted-foreground"
              >
                <CaretLeftIcon />
                {backLabel}
              </Button>
            ) : null}

            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                Step {step} of {TOTAL_STEPS} · {stepLabel}
              </p>
              <div
                className="flex gap-1.5"
                role="progressbar"
                aria-valuenow={step}
                aria-valuemin={1}
                aria-valuemax={TOTAL_STEPS}
                aria-label={`Onboarding step ${step} of ${TOTAL_STEPS}`}
              >
                {Array.from({ length: TOTAL_STEPS }, (_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      index < step ? "bg-primary" : "bg-muted",
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>

            {form}
          </div>
        </section>

        <section className="relative hidden items-center lg:col-span-2 lg:flex">
          <div className="w-[128%] min-w-[44rem] origin-left scale-[1.06] rounded-xl border border-border bg-background shadow-lg">
            <div className="overflow-hidden rounded-xl">{preview}</div>
          </div>
        </section>
      </div>
    </div>
  );
}
