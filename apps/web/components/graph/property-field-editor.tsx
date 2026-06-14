"use client";

import { useState } from "react";
import { Input } from "@ssota/ui/components/ui/input";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import { Switch } from "@ssota/ui/components/ui/switch";
import {
  NativeSelect,
  NativeSelectOption,
} from "@ssota/ui/components/ui/native-select";
import { cn } from "@ssota/ui/lib/utils";
import {
  enumOptions,
  isBooleanField,
  isEnumField,
  isNumberField,
  isTextAreaField,
  type PropertyFieldDefinition,
} from "@/lib/graph/property-field-types";
import { formatTableCell } from "@/lib/graph/format-table-cell";

type PropertyFieldEditorProps = {
  field: PropertyFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  onCommit?: (value: unknown) => void;
  disabled?: boolean;
  variant?: "panel" | "inline";
  autoFocus?: boolean;
};

export function PropertyFieldEditor(props: PropertyFieldEditorProps) {
  return (
    <PropertyFieldEditorInner
      key={`${props.field.key}-${serializeDraft(props.value)}`}
      {...props}
    />
  );
}

function PropertyFieldEditorInner({
  field,
  value,
  onChange,
  onCommit,
  disabled = false,
  variant = "panel",
  autoFocus = false,
}: PropertyFieldEditorProps) {
  const [draft, setDraft] = useState<string>(() => serializeDraft(value));
  const compact = variant === "inline";

  function commit(nextValue: unknown) {
    onChange(nextValue);
    onCommit?.(nextValue);
  }

  if (isBooleanField(field)) {
    const checked = value === true;
    return (
      <div className={cn("flex items-center", compact ? "h-8 px-2" : "h-9")}>
        <Switch
          checked={checked}
          disabled={disabled}
          onCheckedChange={(next) => commit(next)}
        />
        {!compact ? (
          <span className="ml-2 text-xs text-muted-foreground">
            {checked ? "true" : "false"}
          </span>
        ) : null}
      </div>
    );
  }

  if (isEnumField(field)) {
    const options = enumOptions(field);
    const current = value === null || value === undefined ? "" : String(value);
    return (
      <NativeSelect
        value={current}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn(
          "w-full",
          compact &&
            "h-8 border-0 bg-transparent text-xs shadow-none focus-visible:ring-0",
        )}
        onChange={(event) => {
          const next = event.target.value;
          commit(next === "" ? null : next);
        }}
      >
        {!field.required ? <NativeSelectOption value="">NULL</NativeSelectOption> : null}
        {options.map((option) => (
          <NativeSelectOption key={option} value={option}>
            {option}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    );
  }

  if (isNumberField(field)) {
    return (
      <Input
        type="number"
        value={draft}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn(
          "w-full",
          compact &&
            "h-8 rounded-none border-0 bg-transparent px-2 text-xs shadow-none focus-visible:ring-0",
        )}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft.trim() === "" && !field.required) {
            commit(null);
            return;
          }
          const parsed = Number(draft);
          if (!Number.isNaN(parsed)) commit(parsed);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") setDraft(serializeDraft(value));
        }}
      />
    );
  }

  if (isTextAreaField(field, variant) && variant === "panel") {
    return (
      <Textarea
        value={draft}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={3}
        className="min-h-16 w-full resize-y"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => commit(draft.trim() === "" && !field.required ? null : draft)}
      />
    );
  }

  return (
    <Input
      value={draft}
      disabled={disabled}
      autoFocus={autoFocus}
      className={cn(
        "w-full",
        compact &&
          "h-8 rounded-none border-0 bg-transparent px-2 text-xs shadow-none focus-visible:ring-0",
      )}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => commit(draft.trim() === "" && !field.required ? null : draft)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") setDraft(serializeDraft(value));
      }}
    />
  );
}

export function PropertyFieldDisplay({
  field,
  value,
}: {
  field: PropertyFieldDefinition;
  value: unknown;
}) {
  if (isBooleanField(field)) {
    return (
      <span className={value === true ? "text-foreground" : "text-muted-foreground"}>
        {value === true ? "true" : value === false ? "false" : "NULL"}
      </span>
    );
  }
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground/70">NULL</span>;
  }
  return <span className="truncate">{formatTableCell(value)}</span>;
}

function serializeDraft(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
