"use client";

import { useState } from "react";
import { Button } from "@ssota/ui/components/ui/button";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import type { LabValidateMode } from "@/lib/lab-sandbox/validate";
import { validateLabJson } from "@/lib/lab-sandbox/validate";

export function JsonEditorPanel({
  title,
  description,
  value,
  onChange,
  validateMode,
  onApply,
  applyLabel = "Apply",
}: {
  title: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  validateMode?: LabValidateMode;
  onApply?: () => void;
  applyLabel?: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function validate() {
    setMessage(null);
    setError(null);
    if (!validateMode) {
      setMessage("No schema for this panel");
      return;
    }
    const err = validateLabJson(validateMode, value);
    if (err) {
      setError(err);
      return;
    }
    setMessage("Valid JSON");
  }

  return (
    <div className="space-y-4 p-8">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        ) : null}
      </div>
      <Textarea
        className="min-h-[360px] font-mono text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
      <div className="flex flex-wrap gap-2">
        {validateMode ? (
          <Button type="button" variant="secondary" onClick={validate}>
            Validate
          </Button>
        ) : null}
        {onApply ? (
          <Button type="button" onClick={onApply}>
            {applyLabel}
          </Button>
        ) : null}
      </div>
      {message ? <p className="text-sm text-green-600">{message}</p> : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
