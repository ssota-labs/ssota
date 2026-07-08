"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormValuesContext, useAction, useFormValues } from "../context";
import { boundNode } from "../bindings";
import type { CatalogComponent, CatalogRenderArgs } from "../types";

/** A form: collects its Field values and hands them to a Button's action. */
function FormEl({
  columns,
  children,
}: {
  columns?: number;
  children: ReactNode;
}) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const setValue = (name: string, value: unknown) =>
    setValues((prev) => ({ ...prev, [name]: value }));
  const layout =
    columns === 2 ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "space-y-3";
  return (
    <FormValuesContext.Provider value={{ values, setValue }}>
      <form className={layout} onSubmit={(e) => e.preventDefault()}>
        {children}
      </form>
    </FormValuesContext.Provider>
  );
}

type FieldType =
  | "text"
  | "email"
  | "number"
  | "date"
  | "textarea"
  | "select"
  | "checkbox"
  | "switch";

/** A typed form field that writes its value into the enclosing Form. */
function FieldEl({
  name,
  label,
  placeholder,
  inputType,
  options,
  required,
}: {
  name: string;
  label?: string;
  placeholder?: string;
  inputType?: string;
  options?: string[];
  required?: boolean;
}) {
  const form = useFormValues();
  const raw = form?.values[name];
  const setVal = (v: unknown) => form?.setValue(name, v);
  const type = (inputType ?? "text") as FieldType;

  const labelEl = label ? (
    <Label htmlFor={name}>
      {label}
      {required ? <span className="text-destructive"> *</span> : null}
    </Label>
  ) : null;

  // Boolean controls render inline with their label.
  if (type === "checkbox" || type === "switch") {
    const checked = Boolean(raw);
    const control =
      type === "switch" ? (
        <Switch
          id={name}
          checked={checked}
          onCheckedChange={(c) => setVal(Boolean(c))}
        />
      ) : (
        <Checkbox
          id={name}
          checked={checked}
          onCheckedChange={(c) => setVal(Boolean(c))}
        />
      );
    return (
      <div className="flex items-center gap-2">
        {control}
        {label ? <Label htmlFor={name}>{label}</Label> : null}
      </div>
    );
  }

  let control: ReactNode;
  if (type === "textarea") {
    control = (
      <Textarea
        id={name}
        placeholder={placeholder}
        value={String(raw ?? "")}
        onChange={(e) => setVal(e.target.value)}
      />
    );
  } else if (type === "select") {
    control = (
      <NativeSelect
        id={name}
        className="w-full"
        value={String(raw ?? "")}
        onChange={(e) => setVal(e.target.value)}
      >
        <NativeSelectOption value="">
          {placeholder ?? "선택…"}
        </NativeSelectOption>
        {(options ?? []).map((o) => (
          <NativeSelectOption key={o} value={o}>
            {o}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    );
  } else {
    // text | email | number | date
    control = (
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        value={raw == null ? "" : String(raw)}
        onChange={(e) =>
          setVal(
            type === "number"
              ? e.target.value === ""
                ? ""
                : Number(e.target.value)
              : e.target.value,
          )
        }
      />
    );
  }
  return (
    <div className="space-y-1.5">
      {labelEl}
      {control}
    </div>
  );
}

function ButtonEl({
  actionKey,
  label,
  variant,
}: {
  actionKey?: string;
  label: string;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
}) {
  const onAction = useAction();
  const form = useFormValues();
  const [pending, setPending] = useState(false);
  const disabled = !onAction || !actionKey || pending;
  return (
    <Button
      type="button"
      variant={variant ?? "default"}
      disabled={disabled}
      onClick={async () => {
        if (!onAction || !actionKey) return;
        setPending(true);
        try {
          await onAction(actionKey, form?.values ?? {});
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? "…" : label}
    </Button>
  );
}

/** A standalone field bound to a node property, saved via an action as `{ value }`. */
function ActionFieldEl({
  actionKey,
  label,
  initialValue,
  kind = "input",
  options,
  placeholder,
}: {
  actionKey?: string;
  label?: string;
  initialValue?: string;
  kind?: "input" | "textarea" | "select";
  options?: string[];
  placeholder?: string;
}) {
  const onAction = useAction();
  const [value, setValue] = useState(initialValue ?? "");
  const commit = (v: string) => {
    if (onAction && actionKey) void onAction(actionKey, { value: v });
  };
  return (
    <div className="space-y-1.5">
      {label ? <Label>{label}</Label> : null}
      {kind === "textarea" ? (
        <Textarea
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => commit(value)}
        />
      ) : kind === "select" ? (
        <NativeSelect
          className="w-full"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            commit(e.target.value);
          }}
        >
          {(options ?? []).map((o) => (
            <NativeSelectOption key={o} value={o}>
              {o}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      ) : (
        <Input
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => commit(value)}
        />
      )}
    </div>
  );
}

function actionField(kind: "input" | "textarea" | "select"): CatalogComponent {
  function ActionField({ props, bindingData }: CatalogRenderArgs) {
    const node = boundNode(bindingData, props);
    const field = typeof props.field === "string" ? props.field : undefined;
    const initialValue =
      field && node?.properties
        ? String(node.properties[field] ?? "")
        : typeof props.value === "string"
          ? props.value
          : "";
    return (
      <ActionFieldEl
        actionKey={typeof props.action === "string" ? props.action : undefined}
        label={props.label ? String(props.label) : undefined}
        placeholder={props.placeholder ? String(props.placeholder) : undefined}
        initialValue={initialValue}
        kind={kind}
        options={
          Array.isArray(props.options) ? (props.options as string[]) : undefined
        }
      />
    );
  }
  ActionField.displayName = `ActionField(${kind})`;
  return ActionField;
}

/** Input / action components. */
export const formComponents: Record<string, CatalogComponent> = {
  Form: ({ props, children }) => (
    <FormEl columns={typeof props.columns === "number" ? props.columns : undefined}>
      {children}
    </FormEl>
  ),
  Field: ({ elementId, props }) => (
    <FieldEl
      name={String(props.name ?? elementId)}
      label={props.label ? String(props.label) : undefined}
      placeholder={props.placeholder ? String(props.placeholder) : undefined}
      inputType={props.inputType ? String(props.inputType) : undefined}
      options={
        Array.isArray(props.options) ? (props.options as string[]) : undefined
      }
      required={props.required === true}
    />
  ),
  Button: ({ props }) => (
    <ButtonEl
      actionKey={typeof props.action === "string" ? props.action : undefined}
      label={String(props.label ?? "Submit")}
      variant={
        typeof props.variant === "string"
          ? (props.variant as "default" | "secondary" | "outline")
          : undefined
      }
    />
  ),
  Input: actionField("input"),
  Textarea: actionField("textarea"),
  Select: actionField("select"),
};
