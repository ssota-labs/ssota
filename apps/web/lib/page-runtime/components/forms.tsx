"use client";

import { useState } from "react";
import { FormValuesContext, useAction, useFormValues } from "../context";
import { boundNode } from "../bindings";
import type { CatalogComponent, CatalogRenderArgs } from "../types";

function FormEl({ children }: { children: React.ReactNode }) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const setValue = (name: string, value: unknown) =>
    setValues((prev) => ({ ...prev, [name]: value }));
  return (
    <FormValuesContext.Provider value={{ values, setValue }}>
      <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
        {children}
      </form>
    </FormValuesContext.Provider>
  );
}

/** A form field that writes into the enclosing Form's collected values. */
function FieldEl({
  name,
  label,
  placeholder,
  inputType,
}: {
  name: string;
  label?: string;
  placeholder?: string;
  inputType?: string;
}) {
  const form = useFormValues();
  const value = (form?.values[name] ?? "") as string;
  return (
    <label className="block space-y-1 text-sm">
      {label ? <span className="text-muted-foreground">{label}</span> : null}
      <input
        type={inputType ?? "text"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => form?.setValue(name, e.target.value)}
        className="border-border w-full rounded-md border px-2 py-1.5 text-sm"
      />
    </label>
  );
}

function ButtonEl({ actionKey, label }: { actionKey?: string; label: string }) {
  const onAction = useAction();
  const form = useFormValues();
  const [pending, setPending] = useState(false);
  const disabled = !onAction || !actionKey || pending;
  return (
    <button
      type="button"
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
      className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
    >
      {pending ? "…" : label}
    </button>
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
  const cls = "border-border w-full rounded-md border px-2 py-1.5 text-sm";
  return (
    <label className="block space-y-1 text-sm">
      {label ? <span className="text-muted-foreground">{label}</span> : null}
      {kind === "textarea" ? (
        <textarea
          className={cls}
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => commit(value)}
        />
      ) : kind === "select" ? (
        <select
          className={cls}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            commit(e.target.value);
          }}
        >
          {(options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          className={cls}
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => commit(value)}
        />
      )}
    </label>
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
  Form: ({ children }) => <FormEl>{children}</FormEl>,
  Field: ({ elementId, props }) => (
    <FieldEl
      name={String(props.name ?? elementId)}
      label={props.label ? String(props.label) : undefined}
      placeholder={props.placeholder ? String(props.placeholder) : undefined}
      inputType={props.inputType ? String(props.inputType) : undefined}
    />
  ),
  Button: ({ props }) => (
    <ButtonEl
      actionKey={typeof props.action === "string" ? props.action : undefined}
      label={String(props.label ?? "Submit")}
    />
  ),
  Input: actionField("input"),
  Textarea: actionField("textarea"),
  Select: actionField("select"),
};
