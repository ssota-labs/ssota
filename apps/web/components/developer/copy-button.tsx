"use client";

import { useState } from "react";
import { Button } from "@ssota/ui/components/ui/button";

type CopyButtonProps = {
  value: string;
  label?: string;
};

export function CopyButton({ value, label = "Copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
        {copied ? "Copied" : label}
      </Button>
      <span className="text-xs text-muted-foreground" aria-live="polite">
        {copied ? "Copied to clipboard." : null}
      </span>
    </div>
  );
}
