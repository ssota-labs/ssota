"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { useLocale } from "@/components/i18n/locale-provider";

type GoalsSetupWizardProps = {
  roadmapHref?: string;
  startOpen?: boolean;
  onCancel?: () => void;
  onCreate: (input: {
    title: string;
    period?: string;
    keyResultTitle?: string;
  }) => Promise<void>;
};

export function GoalsSetupWizard({
  roadmapHref,
  startOpen = false,
  onCancel,
  onCreate,
}: GoalsSetupWizardProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(startOpen);
  const [title, setTitle] = useState("");
  const [period, setPeriod] = useState("Q2 2026");
  const [keyResultTitle, setKeyResultTitle] = useState("");
  const [pending, startTransition] = useTransition();

  const handleCreate = () => {
    startTransition(async () => {
      await onCreate({
        title: title || t("goals.defaultObjectiveTitle"),
        period,
        keyResultTitle: keyResultTitle || undefined,
      });
      setOpen(false);
      setTitle("");
      setKeyResultTitle("");
      router.refresh();
    });
  };

  if (!open) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{t("goals.emptyTitle")}</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {t("goals.emptyDescription")}
          </p>
        </div>
        <ol className="max-w-md list-decimal space-y-1 text-left text-sm text-muted-foreground">
          <li>{t("goals.wizard.step1")}</li>
          <li>{t("goals.wizard.step2")}</li>
          <li>{t("goals.wizard.step3")}</li>
          <li>{t("goals.wizard.step4")}</li>
        </ol>
        <div className="flex flex-wrap justify-center gap-2">
          {roadmapHref ? (
            <Button type="button" variant="outline" render={<a href={roadmapHref} />}>
              {t("goals.viewRoadmap")}
            </Button>
          ) : null}
          <Button type="button" onClick={() => setOpen(true)}>
            {t("goals.createFirst")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-lg border p-6">
      <h2 className="text-lg font-semibold">{t("goals.wizard.title")}</h2>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("goals.wizard.objectiveTitle")}</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label={t("goals.wizard.objectiveTitle")} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("goals.wizard.period")}</label>
        <Input value={period} onChange={(e) => setPeriod(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("goals.wizard.firstKeyResult")}</label>
        <Input
          value={keyResultTitle}
          onChange={(e) => setKeyResultTitle(e.target.value)}
          placeholder={t("goals.wizard.keyResultPlaceholder")}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            onCancel?.();
          }}
        >
          {t("common.cancel")}
        </Button>
        <Button type="button" disabled={pending} onClick={handleCreate}>
          {t("goals.createFirst")}
        </Button>
      </div>
    </div>
  );
}
